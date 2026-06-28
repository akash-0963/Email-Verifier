import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

export async function ensureUploadDirs() {
  const uploadsDir = join(__dirname, '../../uploads');
  const downloadsDir = join(__dirname, '../../downloads');
  await ensureDir(uploadsDir);
  await ensureDir(downloadsDir);
  return { uploadsDir, downloadsDir };
}

export function generateFilename(prefix, extension = 'csv') {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.${extension}`;
}

export async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error.message);
  }
}
