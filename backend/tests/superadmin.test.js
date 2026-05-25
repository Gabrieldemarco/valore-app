// @ts-check
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
jest.mock('../services/billing', () => ({
  activateTenantFromPaidInvoice: jest.fn().mockResolvedValue()
}));

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

const app = require('../server');
const { query, queryOne } = require('../database');
const billing = require('../services/billing');

const superAdminToken = jwt.sign(
  { id: 1, email: 'admin@velore.com', name: 'Super Admin', role: 'super_admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

function auth() { return { Authorization: `Bearer ${superAdminToken}` }; }

describe('SuperAdmin Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/super-admin/login', () => {
    it('loguea con credenciales válidas', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      queryOne.mockResolvedValueOnce({ id: 1, email: 'admin@velore.com', password: hash, name: 'Admin' });
      const res = await request(app)
        .post('/api/super-admin/login')
        .send({ email: 'admin@velore.com', password: 'secret123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe('super_admin');
    });

    it('rechaza credenciales inválidas', async () => {
      queryOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/super-admin/login')
        .send({ email: 'nadie@test.com', password: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('inválidas');
    });

    it('rechaza datos faltantes', async () => {
      const res = await request(app)
        .post('/api/super-admin/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/super-admin/tenants', () => {
    it('lista tenants paginados', async () => {
      const rows = [{ id: 1, business_name: 'Pelu A', slug: 'pelu-a', status: 'active', plan: 'pro' }];
      query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      query.mockResolvedValueOnce({ rows });
      const res = await request(app)
        .get('/api/super-admin/tenants')
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.tenants).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('rechaza sin token', async () => {
      const res = await request(app).get('/api/super-admin/tenants');
      expect(res.status).toBe(401);
    });

    it('filtra por status', async () => {
      query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/api/super-admin/tenants?status=suspended')
        .set(auth());
      expect(res.status).toBe(200);
      expect(query.mock.calls[0][0]).toContain('status');
    });
  });

  describe('POST /api/super-admin/tenants', () => {
    it('crea tenant exitosamente', async () => {
      queryOne.mockResolvedValueOnce(null);
      query.mockResolvedValueOnce({ rows: [{ id: 1, slug: 'nueva-pelu', business_name: 'Nueva Pelu' }] });
      const res = await request(app)
        .post('/api/super-admin/tenants')
        .set(auth())
        .send({ business_name: 'Nueva Pelu', slug: 'nueva-pelu', email: 'dueño@test.com' });
      expect(res.status).toBe(201);
      expect(res.body.tenant.slug).toBe('nueva-pelu');
    });

    it('rechaza slug duplicado', async () => {
      queryOne.mockResolvedValueOnce({ id: 99 });
      const res = await request(app)
        .post('/api/super-admin/tenants')
        .set(auth())
        .send({ business_name: 'X', slug: 'existe', email: 'x@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('slug ya existe');
    });

    it('rechaza datos faltantes', async () => {
      const res = await request(app)
        .post('/api/super-admin/tenants')
        .set(auth())
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/super-admin/tenants/:id', () => {
    it('actualiza tenant', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, business_name: 'Actualizado', status: 'suspended' }] });
      const res = await request(app)
        .put('/api/super-admin/tenants/1')
        .set(auth())
        .send({ status: 'suspended' });
      expect(res.status).toBe(200);
      expect(res.body.tenant.status).toBe('suspended');
    });

    it('devuelve 404 si no existe', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .put('/api/super-admin/tenants/999')
        .set(auth())
        .send({ status: 'suspended' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/super-admin/tenants/:id', () => {
    it('elimina tenant con sus datos', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] });
      const res = await request(app)
        .delete('/api/super-admin/tenants/1')
        .set(auth());
      expect(res.status).toBe(200);
    });

    it('devuelve 404 si no existe', async () => {
      query.mockResolvedValue({ rows: [] });
      const res = await request(app)
        .delete('/api/super-admin/tenants/999')
        .set(auth())
        .send({ status: 'suspended' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/super-admin/tenants/:id', () => {
    it('retorna detalle del tenant', async () => {
      queryOne.mockResolvedValueOnce({
        id: 1, business_name: 'Pelu A', plan: 'free',
        trial_end_date: new Date(Date.now() + 86400000).toISOString()
      });
      const res = await request(app)
        .get('/api/super-admin/tenants/1')
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.tenant.business_name).toBe('Pelu A');
    });

    it('devuelve 404 si no existe', async () => {
      queryOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/super-admin/tenants/999')
        .set(auth());
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/super-admin/tenants/:id/reactivate', () => {
    it('reactiva con upgrade a pro', async () => {
      queryOne.mockResolvedValueOnce({ id: 1, business_name: 'Pelu A', status: 'suspended' });
      query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active', plan: 'pro' }] });
      const res = await request(app)
        .post('/api/super-admin/tenants/1/reactivate')
        .set(auth())
        .send({ mode: 'upgrade_pro' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('actualizada a Pro');
    });

    it('reactiva extendiendo trial', async () => {
      queryOne.mockResolvedValueOnce({ id: 1, business_name: 'Pelu A', status: 'suspended' });
      query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] });
      const res = await request(app)
        .post('/api/super-admin/tenants/1/reactivate')
        .set(auth())
        .send({ days: 30 });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('días adicionales');
    });

    it('devuelve 404 si tenant no existe', async () => {
      queryOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/api/super-admin/tenants/999/reactivate')
        .set(auth())
        .send({ mode: 'upgrade_pro' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/super-admin/tenants/:tenantId/invoices', () => {
    it('lista facturas del tenant', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: 'INV-001', amount: 990 }] });
      const res = await request(app)
        .get('/api/super-admin/tenants/1/invoices')
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.invoices).toHaveLength(1);
    });

    it('filtra por status', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .get('/api/super-admin/tenants/1/invoices?status=paid')
        .set(auth());
      expect(res.status).toBe(200);
      expect(query.mock.calls[0][0]).toContain('status');
    });
  });

  describe('POST /api/super-admin/invoices', () => {
    it('crea factura manual', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      query.mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: 'INV-2026-006', amount: 1500 }] });
      const res = await request(app)
        .post('/api/super-admin/invoices')
        .set(auth())
        .send({ tenant_id: 1, amount: 1500, description: 'Servicio extra', due_date: '2026-07-01' });
      expect(res.status).toBe(201);
      expect(res.body.invoice.amount).toBe(1500);
    });

    it('rechaza datos inválidos', async () => {
      const res = await request(app)
        .post('/api/super-admin/invoices')
        .set(auth())
        .send({ tenant_id: 1 });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/super-admin/invoices/:id/pay', () => {
    it('marca factura como pagada', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, tenant_id: 1, amount: 990, invoice_number: 'INV-001' }] });
      const res = await request(app)
        .put('/api/super-admin/invoices/1/pay')
        .set(auth())
        .send({ payment_method: 'transfer' });
      expect(res.status).toBe(200);
      expect(billing.activateTenantFromPaidInvoice).toHaveBeenCalled();
    });

    it('devuelve 404 si factura no existe', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .put('/api/super-admin/invoices/999/pay')
        .set(auth())
        .send({ payment_method: 'cash' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/super-admin/stats/billing', () => {
    it('retorna estadísticas', async () => {
      queryOne.mockResolvedValueOnce({ total: '50000' });
      queryOne.mockResolvedValueOnce({ count: '3' });
      queryOne.mockResolvedValueOnce({ count: '15' });
      const res = await request(app)
        .get('/api/super-admin/stats/billing')
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.totalInvoiced).toBe(50000);
      expect(res.body.pendingInvoices).toBe(3);
      expect(res.body.activeTenants).toBe(15);
    });
  });

  describe('GET /api/super-admin/plan-prices', () => {
    it('lista precios de planes', async () => {
      query.mockResolvedValueOnce({ rows: [{ plan_name: 'pro', price: '990', currency: 'UYU' }] });
      const res = await request(app)
        .get('/api/super-admin/plan-prices')
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.prices).toHaveLength(1);
    });
  });

  describe('PUT /api/super-admin/plan-prices/:planName', () => {
    it('actualiza precio de plan', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .put('/api/super-admin/plan-prices/pro')
        .set(auth())
        .send({ price: 1200, currency: 'UYU' });
      expect(res.status).toBe(200);
    });

    it('rechaza precio inválido', async () => {
      const res = await request(app)
        .put('/api/super-admin/plan-prices/pro')
        .set(auth())
        .send({ price: 'no-es-numero' });
      expect(res.status).toBe(400);
    });

    it('rechaza plan inválido', async () => {
      const res = await request(app)
        .put('/api/super-admin/plan-prices/inexistente')
        .set(auth())
        .send({ price: 100 });
      expect(res.status).toBe(400);
    });
  });
});
