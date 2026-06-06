const request = require('supertest');

jest.mock('../database', () => ({
  initDB: jest.fn().mockResolvedValue(),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  queryOne: jest.fn().mockResolvedValue(null),
  pool: { end: jest.fn().mockResolvedValue() }
}));
jest.mock('../cron-billing', () => ({
  generateMonthlyInvoices: jest.fn(),
  sendPaymentReminders: jest.fn(),
  suspendOverdueTenants: jest.fn(),
  suspendExpiredFreeTrials: jest.fn()
}));
jest.mock('../services/notifications', () => ({
  sendClientConfirmation: jest.fn().mockResolvedValue({ success: true }),
  notifyStaff: jest.fn().mockResolvedValue({ success: true })
}));

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.FRONTEND_URL = 'http://localhost:3000';

const app = require('../server');

describe('Seguridad - Headers', () => {

  test('X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options: DENY', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  test('Content-Security-Policy presente', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('Strict-Transport-Security presente', async () => {
    const res = await request(app).get('/');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});

describe('Seguridad - Validación de entrada (XSS)', () => {

  test('registro con XSS en username se escapa (no 500)', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: '<script>alert(1)</script>', password: '123456' });
    expect(res.status).not.toBe(500);
  });

  test('login con SQL injection es rechazado (validación express-validator)', async () => {
    const res = await request(app)
      .post('/api/staff/login')
      .send({ email: "' OR 1=1; --", password: "' OR '1'='1" });
    expect(res.status).toBe(400);
    // express-validator devuelve errors[], no error
    expect(res.body.errors || res.body.error).toBeTruthy();
  });

  test('booking con XSS en nombre no crashea (tenant mocked → 404)', async () => {
    const res = await request(app)
      .post('/p/test/appointments')
      .send({
        clientName: '<img src=x onerror=alert(1)>',
        clientPhone: '099111222',
        serviceId: 1,
        appointmentDate: '2026-06-01T10:00:00.000Z',
      });
    expect(res.status).not.toBe(500);
  });
});
