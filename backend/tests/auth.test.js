const request = require('supertest');

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));
jest.mock('../database', () => ({
  initDB: jest.fn().mockResolvedValue(),
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn().mockResolvedValue() }
}));
jest.mock('../cron-billing', () => ({
  generateMonthlyInvoices: jest.fn(),
  sendPaymentReminders: jest.fn(),
  suspendOverdueTenants: jest.fn(),
  suspendExpiredFreeTrials: jest.fn(),
  backupDatabase: jest.fn()
}));
jest.mock('../services/notifications', () => ({
  sendClientConfirmation: jest.fn().mockResolvedValue({ success: true }),
  notifyStaff: jest.fn().mockResolvedValue({ success: true })
}));

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

const app = require('../server');
const { query, queryOne } = require('../database');
const bcrypt = require('bcryptjs');

describe('Autenticación', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/register', () => {
    it('crea usuario exitosamente', async () => {
      queryOne.mockResolvedValueOnce(null);
      query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'newuser', role: 'client' }] });
      const res = await request(app)
        .post('/api/register')
        .send({ username: 'newuser', password: '123456' });
      expect(res.status).toBe(201);
    });

    it('rechaza si el usuario ya existe', async () => {
      queryOne.mockResolvedValueOnce({ id: 1 });
      const res = await request(app)
        .post('/api/register')
        .send({ username: 'existing', password: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('ya existe');
    });
  });

  describe('POST /api/login', () => {
    it('loguea con credenciales válidas', async () => {
      const hash = await bcrypt.hash('123456', 10);
      queryOne.mockResolvedValueOnce({ id: 1, username: 'test', password: hash, role: 'client' });
      const res = await request(app)
        .post('/api/login')
        .send({ username: 'test', password: '123456' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('rechaza contraseña incorrecta', async () => {
      const hash = await bcrypt.hash('realpass', 10);
      queryOne.mockResolvedValueOnce({ id: 1, username: 'test', password: hash, role: 'client' });
      const res = await request(app)
        .post('/api/login')
        .send({ username: 'test', password: 'wrongpass' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/staff/login', () => {
    it('loguea staff con credenciales válidas', async () => {
      const hash = await bcrypt.hash('staffpass', 10);
      queryOne.mockResolvedValueOnce({
        id: 1, email: 'staff@test.com', password: hash,
        name: 'Staff', role: 'staff', tenant_id: 1
      });
      const res = await request(app)
        .post('/api/staff/login')
        .send({ email: 'staff@test.com', password: 'staffpass' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('rechaza email inválido', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ email: 'invalido', password: '123456' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/staff/register', () => {
    it('registra nuevo negocio exitosamente', async () => {
      queryOne.mockResolvedValueOnce(null);
      queryOne.mockResolvedValueOnce(null);
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .post('/api/staff/register')
        .send({
          businessName: 'Nueva Pelu',
          email: 'nueva@pelu.com',
          password: '123456'
        });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBeDefined();
    });
  });

  describe('Rutas protegidas sin token', () => {
    it('GET /api/appointments → 401', async () => {
      const res = await request(app).get('/api/appointments');
      expect(res.status).toBe(401);
    });

    it('GET /api/tenant/me → 401', async () => {
      const res = await request(app).get('/api/tenant/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/tenant/staff → 401', async () => {
      const res = await request(app).get('/api/tenant/staff');
      expect(res.status).toBe(401);
    });

    it('PUT /api/tenant/settings → 401', async () => {
      const res = await request(app).put('/api/tenant/settings').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/health', () => {
    it('responde ok', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/tenants', () => {
    it('lista tenants activos', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, slug: 'demo', business_name: 'Demo', services: ['Corte'] },
          { id: 2, slug: 'test', business_name: 'Test', services: ['Lavado'] }
        ]
      });
      const res = await request(app).get('/api/tenants');
      expect(res.status).toBe(200);
      expect(res.body.tenants.length).toBe(2);
    });
  });

});
