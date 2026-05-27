// @ts-check
const request = require('supertest');
const jwt = require('jsonwebtoken');

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
const { query } = require('../database');

const clientToken = jwt.sign(
  { id: 10, username: 'cliente1', role: 'client' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const staffToken = jwt.sign(
  { id: 5, name: 'Staff', email: 'staff@pelu.com', role: 'staff', tenant_id: 1 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

function clientAuth() { return { Authorization: `Bearer ${clientToken}` }; }
function staffAuth() { return { Authorization: `Bearer ${staffToken}` }; }

describe('Misc Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agenda personal (clientes)', () => {

    describe('GET /api/agenda', () => {
      it('lista eventos del cliente', async () => {
        query.mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Corte', fecha: '2026-06-15T14:00:00.000Z' }] });
        const res = await request(app).get('/api/agenda').set(clientAuth());
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
      });

      it('rechaza sin token', async () => {
        const res = await request(app).get('/api/agenda');
        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/agenda', () => {
      it('crea evento', async () => {
        query.mockResolvedValueOnce({ rows: [{ id: 2, titulo: 'Revisión', fecha: '2026-06-20T10:00:00.000Z' }] });
        const res = await request(app)
          .post('/api/agenda')
          .set(clientAuth())
          .send({ titulo: 'Revisión', fecha: '2026-06-20T10:00:00.000Z' });
        expect(res.status).toBe(201);
      });

      it('rechaza datos faltantes', async () => {
        const res = await request(app)
          .post('/api/agenda')
          .set(clientAuth())
          .send({ titulo: 'Solo título' });
        expect(res.status).toBe(400);
      });
    });

    describe('PUT /api/agenda/:id', () => {
      it('actualiza evento existente', async () => {
        query.mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Actualizado' }] });
        const res = await request(app)
          .put('/api/agenda/1')
          .set(clientAuth())
          .send({ titulo: 'Actualizado', fecha: '2026-06-20T10:00:00.000Z' });
        expect(res.status).toBe(200);
      });

      it('devuelve 404 si no existe o no es del usuario', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
          .put('/api/agenda/999')
          .set(clientAuth())
          .send({ titulo: 'X', fecha: '2026-06-20T10:00:00.000Z' });
        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/agenda/:id', () => {
      it('elimina evento existente', async () => {
        query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        const res = await request(app).delete('/api/agenda/1').set(clientAuth());
        expect(res.status).toBe(200);
      });

      it('devuelve 404 si no existe', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app).delete('/api/agenda/999').set(clientAuth());
        expect(res.status).toBe(404);
      });
    });
  });

  describe('POST /api/upload-image', () => {
    it('rechaza sin datos de imagen', async () => {
      const { queryOne } = require('../database');
      // checkTenantActive
      queryOne.mockResolvedValueOnce({ status: 'active', plan: 'pro' });
      // checkTrialExpiration
      queryOne.mockResolvedValueOnce({ plan: 'pro', trial_end_date: null, status: 'active' });
      const res = await request(app)
        .post('/api/upload-image')
        .set(staffAuth())
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.errors || res.body.error).toBeTruthy();
    });

    it('rechaza formato inválido', async () => {
      const { queryOne } = require('../database');
      queryOne.mockResolvedValueOnce({ status: 'active', plan: 'pro' });
      queryOne.mockResolvedValueOnce({ plan: 'pro', trial_end_date: null, status: 'active' });
      const res = await request(app)
        .post('/api/upload-image')
        .set(staffAuth())
        .send({ image: 'no-es-base64', filename: 'img.png' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('inválido');
    });
  });
});
