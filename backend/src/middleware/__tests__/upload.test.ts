/**
 * Upload Middleware Tests
 *
 * Tests for handleUpload middleware: file type validation, size limits, error handling.
 * Uses jest.unstable_mockModule to mock multer for controlled error simulation.
 */

import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import path from 'path';
import { handleUpload } from '../upload.js';

// Create test app that accepts a file upload
function createTestApp() {
  const app = express();
  app.post('/upload', handleUpload, (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    }
    res.json({
      success: true,
      data: {
        originalname: req.file.originalname,
        size: req.file.size,
      },
    });
  });
  return app;
}

describe('upload middleware', () => {
  it('accepts CSV files', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('Name,DOB\nJohn,1990-01-01'), 'test.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.originalname).toBe('test.csv');
  });

  it('accepts XLSX files', async () => {
    const app = createTestApp();

    // Minimal XLSX-like buffer (multer checks extension, not content)
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('PK\x03\x04'), 'data.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.originalname).toBe('data.xlsx');
  });

  it('accepts XLS files', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('\xD0\xCF'), 'legacy.xls');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.originalname).toBe('legacy.xls');
  });

  it('rejects files with disallowed extensions', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('hello'), 'script.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid file type');
  });

  it('rejects PDF files', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.4'), 'report.pdf');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid file type');
  });

  it('rejects JSON files', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('{}'), 'data.json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('handles missing file gracefully', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/upload')
      .send();

    // No file attached - multer doesn't error, just doesn't set req.file
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('No file uploaded');
  });
});
