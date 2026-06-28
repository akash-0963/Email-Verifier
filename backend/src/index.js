import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { errorHandler } from './middleware/errorHandler.js';
import verifyRoutes from './routes/verify.js';
import { initializeGmail } from './services/gmailVerifier.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gmail if configured
initializeGmail({
  email: process.env.GMAIL_USER,
  appPassword: process.env.GMAIL_APP_PASSWORD
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve downloaded files
app.use('/downloads', express.static(join(__dirname, '../downloads')));

// Routes
app.use('/api', verifyRoutes);

// Serve frontend (production)
const frontendPath = join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(join(frontendPath, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Email Verifier API running on http://localhost:${PORT}`);
  console.log(`✓ Public tool - No API key required`);
});
