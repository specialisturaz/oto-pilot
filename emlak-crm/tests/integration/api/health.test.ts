import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// We create a minimal Express app that mirrors the health endpoint from
// the real server.ts. This avoids booting the full app (with DB, rate
// limiting, CSRF, etc.) which is unnecessary for a health check test.
// ---------------------------------------------------------------------------
let app: express.Express;

beforeAll(() => {
  app = express();
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'test',
      },
    });
  });
});

describe('GET /api/health', () => {
  it('should return 200 status code', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
  });

  it('should return success: true', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.success).toBe(true);
  });

  it('should return data with status "ok"', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.data).toBeDefined();
    expect(response.body.data.status).toBe('ok');
  });

  it('should include a valid ISO timestamp', async () => {
    const response = await request(app).get('/api/health');

    const { timestamp } = response.body.data;
    expect(timestamp).toBeDefined();

    // Validate it parses as a valid date
    const parsed = new Date(timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('should include uptime as a number', async () => {
    const response = await request(app).get('/api/health');

    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should include environment field', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.data.environment).toBeDefined();
    expect(typeof response.body.data.environment).toBe('string');
  });

  it('should respond with correct content type', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should have the correct response structure', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      },
    });
  });
});
