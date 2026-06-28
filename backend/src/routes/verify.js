import express from 'express';
import multer from 'multer';
import { createReadStream, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { format } from 'fast-csv';
import { verifyEmail, verifyBatch } from '../services/emailVerifier.js';
import { ensureUploadDirs, generateFilename, cleanupFile } from '../utils/fileUtils.js';
import { getBounceStats, getBounceRecord, getAllBounceRecords, clearBounceRecords } from '../services/bounceHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Setup multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const { uploadsDir } = await ensureUploadDirs();
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      cb(null, generateFilename('upload'));
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Single email verification
router.post('/verify-single', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await verifyEmail(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Bulk CSV verification
router.post('/verify-csv', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  let uploadedFilePath = req.file.path;
  const downloadedFilePath = join(
    dirname(__dirname),
    'downloads',
    generateFilename('verified')
  );

  try {
    const emails = [];
    const stats = { total: 0, valid: 0, invalid: 0, catchAll: 0 };

    // Parse CSV and extract emails
    await new Promise((resolve, reject) => {
      createReadStream(uploadedFilePath)
        .pipe(csv())
        .on('data', (row) => {
          const email = row.email || Object.values(row)[0];
          if (email && typeof email === 'string') {
            emails.push(email.trim());
            stats.total++;
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (emails.length === 0) {
      return res.status(400).json({ error: 'No valid emails found in CSV' });
    }

    // Verify all emails with concurrency limit
    const verificationResults = await verifyBatch(emails, 5);

    // Count results
    verificationResults.forEach((result) => {
      if (result.status === 'valid') stats.valid++;
      else if (result.status === 'catch-all') stats.catchAll++;
      else stats.invalid++;
    });

    // Write results to output CSV
    const outputStream = createWriteStream(downloadedFilePath);
    const csvStream = format({ headers: true });

    csvStream.pipe(outputStream);

    verificationResults.forEach((result) => {
      csvStream.write({
        email: result.email,
        status: result.status,
        reason: result.reason || '',
        syntax_valid: result.checks?.syntax ? 'Yes' : 'No',
        mx_records: result.checks?.mxRecords !== null ? (result.checks?.mxRecords ? 'Yes' : 'No') : 'N/A',
        smtp_ok: result.checks?.smtp ? 'Yes' : 'No',
        disposable: result.checks?.disposable ? 'Yes' : 'No',
        is_catchall: result.checks?.isCatchAll ? 'Yes' : 'No'
      });
    });

    csvStream.end();

    await new Promise((resolve, reject) => {
      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
    });

    // Cleanup uploaded file
    await cleanupFile(uploadedFilePath);

    // Return results
    res.json({
      downloadUrl: `/downloads/${downloadedFilePath.split('/').pop()}`,
      totalRows: stats.total,
      validCount: stats.valid,
      invalidCount: stats.invalid,
      catchAllCount: stats.catchAll
    });
  } catch (error) {
    await cleanupFile(uploadedFilePath);
    next(error);
  }
});

// Get bounce statistics
router.get('/bounce-stats', (req, res) => {
  const stats = getBounceStats();
  res.json(stats);
});

// Get specific bounce record by email
router.get('/bounce-record/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const data = getBounceData(email);
  if (!data) {
    return res.status(404).json({
      email,
      status: 'pending',
      message: 'No bounce/delivery record yet. Check back later.'
    });
  }
  res.json(data);
});

// Get specific tracking data
router.get('/bounce-data/:trackingId', (req, res) => {
  const data = getBounceData(req.params.trackingId);
  if (!data) {
    return res.status(404).json({ error: 'Tracking ID not found' });
  }
  res.json(data);
});

// Clear bounce data
router.post('/bounce-clear', (req, res) => {
  clearBounceRecords();
  res.json({ message: 'Bounce tracking data cleared' });
});

export default router;
