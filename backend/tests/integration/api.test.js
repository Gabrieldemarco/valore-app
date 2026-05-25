// @ts-check
/**
 * Tests de integración con PostgreSQL real.
 * Ejecutar: npm run test:integration
 * Requiere: PostgreSQL corriendo (local o via docker-compose)
 */

const request = require('supertest');
const path = require('path');

// uuid v14+ es ESM-only — mock obligatorio para Jest
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));
jest.mock('../../cron-billing', () => ({
  generateMonthlyInvoices: jest.fn(),
  sendPaymentReminders: jest.fn(),
  suspendOverdueTenants: jest.fn(),
  suspendExpiredFreeTrials: jest.fn(),
  backupDatabase: jest.fn()
}));
jest.mock('../../services/notifications', () => ({
  sendClientConfirmation: jest.fn().mockResolvedValue({ success: true }),
  notifyStaff: jest.fn().mockResolvedValue({ success: true })
}));

const { ensureTestDatabase, dropAllTables, createTables, seedTestData, TEST_DB_URL } = require('./setup');

beforeAll(async () => {
  await ensureTestDatabase();
  await dropAllTables();
  await createTables();

  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.JWT_SECRET = 'test-secret-key-for-integration';
  process.env.NODE_ENV = 'test';

  jest.resetModules();
  delete require.cache[path.resolve(__dirname, '../../database')];

  app = require('../../server');
  db = require('../../database');

  testData = await seedTestData();
});

afterAll(async () => {
  await dropAllTables();
  if (db && db.pool) await db.pool.end();
});

/** @type {import('supertest').SuperTest<import('supertest').Test>} */
let app;
/** @type {{ pool: import('pg').Pool, query: Function, queryOne: Function }} */
let db;
/** @type {{ tenantId: number, staffId: number, serviceId: number, adminStaffId: number, superAdminId: number }} */
let testData;

describe('Integración con PostgreSQL', () => {

  // ─── TENANTS ─────────────────────────────────────
  describe('GET /api/tenants', () => {
    it('devuelve lista de tenants activos', async () => {
      const res = await request(app).get('/api/tenants');
      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeInstanceOf(Array);
      expect(res.body.tenants.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── HEALTH ──────────────────────────────────────
  describe('GET /api/health', () => {
    it('devuelve estado ok con conteos', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'PostgreSQL' });
      expect(typeof res.body.tenants).toBe('number');
    });
  });

  // ─── AUTH ─────────────────────────────────────────
  describe('POST /api/register', () => {
    it('registra nuevo usuario cliente', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ username: 'integ-test-user', password: '123456' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'integ-test-user');
    });

    it('rechaza usuario duplicado', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ username: 'integ-test-user', password: '123456' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/staff/login', () => {
    it('loguea staff con credenciales válidas', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ email: 'admin@test-pelu.com', password: 'test123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('name', 'Admin Test');
    });

    it('rechaza credenciales inválidas', async () => {
      const res = await request(app)
        .post('/api/staff/login')
        .send({ email: 'admin@test-pelu.com', password: 'wrong' });
      expect(res.status).toBe(400);
    });
  });

  // ─── PUBLIC LANDING ──────────────────────────────
  describe('GET /p/:slug/config', () => {
    it('devuelve configuración del tenant', async () => {
      const res = await request(app).get('/p/test-pelu/config');
      expect(res.status).toBe(200);
      expect(res.body.tenant).toHaveProperty('business_name', 'Pelu Test');
    });

    it('devuelve 404 para slug inexistente', async () => {
      const res = await request(app).get('/p/no-existe/config');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /p/:slug/services', () => {
    it('devuelve servicios activos', async () => {
      const res = await request(app).get('/p/test-pelu/services');
      expect(res.status).toBe(200);
      expect(res.body.services).toBeInstanceOf(Array);
      expect(res.body.services.length).toBeGreaterThanOrEqual(1);
      expect(res.body.services[0]).toHaveProperty('name', 'Corte de pelo');
    });
  });

  // ─── APPOINTMENTS ─────────────────────────────────
  describe('POST /p/:slug/appointments', () => {
    it('crea turno como cliente público', async () => {
      const res = await request(app)
        .post('/p/test-pelu/appointments')
        .send({
          clientName: 'Cliente Test',
          clientPhone: '099123456',
          serviceId: testData.serviceId,
          appointmentDate: '2026-06-01T10:00:00.000Z',
          notes: 'Test note'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('appointment');
      expect(res.body.appointment).toHaveProperty('id');
    });

    it('rechaza turno sin datos obligatorios', async () => {
      const res = await request(app)
        .post('/p/test-pelu/appointments')
        .send({ clientName: 'Incompleto' });
      expect(res.status).toBe(400);
    });

    it('lista turnos como staff autenticado', async () => {
      const login = await request(app)
        .post('/api/staff/login')
        .send({ email: 'staff@test-pelu.com', password: 'test123' });
      const staffToken = login.body.token;

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('appointments');
      expect(res.body.appointments).toBeInstanceOf(Array);
    });

    it('lista turnos de hoy', async () => {
      const login = await request(app)
        .post('/api/staff/login')
        .send({ email: 'staff@test-pelu.com', password: 'test123' });
      const staffToken = login.body.token;

      const res = await request(app)
        .get('/api/appointments/today')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  // ─── DISPONIBILIDAD ──────────────────────────────
  describe('GET /p/:slug/availability', () => {
    it('devuelve slots para fecha y servicio', async () => {
      const res = await request(app)
        .get('/p/test-pelu/availability?date=2026-06-01&serviceId=' + testData.serviceId);
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('rechaza sin date', async () => {
      const res = await request(app)
        .get('/p/test-pelu/availability?serviceId=' + testData.serviceId);
      expect(res.status).toBe(400);
    });
  });

  // ─── TENANT STAFF ────────────────────────────────
  describe('GET /p/:slug/staff', () => {
    it('devuelve equipo del tenant', async () => {
      const res = await request(app).get('/p/test-pelu/staff');
      expect(res.status).toBe(200);
      expect(res.body.staff).toBeInstanceOf(Array);
      expect(res.body.staff.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /p/:slug/landing', () => {
    it('devuelve landing data completa', async () => {
      const res = await request(app).get('/p/test-pelu/landing');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tenant');
      expect(res.body).toHaveProperty('services');
      expect(res.body.tenant).toHaveProperty('business_name', 'Pelu Test');
      expect(res.body.services).toBeInstanceOf(Array);
    });
  });

  // ─── TENANT SETTINGS ─────────────────────────────
  describe('API tenant autenticado', () => {
    /** @type {string} */
    let token;

    beforeAll(async () => {
      const login = await request(app)
        .post('/api/staff/login')
        .send({ email: 'admin@test-pelu.com', password: 'test123' });
      token = login.body.token;
    });

    it('GET /api/tenant/me devuelve datos del tenant', async () => {
      const res = await request(app)
        .get('/api/tenant/me')
        .set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tenant');
      expect(res.body.tenant).toHaveProperty('business_name', 'Pelu Test');
    });

    it('PUT /api/tenant/settings actualiza configuración', async () => {
      const res = await request(app)
        .put('/api/tenant/settings')
        .set('Authorization', token)
        .send({ business_name: 'Pelu Test Actualizado' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('tenant');
      expect(res.body.tenant).toHaveProperty('business_name', 'Pelu Test Actualizado');
    });

    it('GET /api/tenant/staff devuelve miembros del staff', async () => {
      const res = await request(app)
        .get('/api/tenant/staff')
        .set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('staff');
      expect(res.body.staff).toBeInstanceOf(Array);
      expect(res.body.staff.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── SUPER ADMIN ─────────────────────────────────
  describe('API super admin', () => {
    /** @type {string} */
    let superToken;

    beforeAll(async () => {
      const jwt = require('jsonwebtoken');
      superToken = jwt.sign(
        { id: testData.superAdminId, role: 'super_admin', email: 'sadmin@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('GET /api/super-admin/tenants lista todos los tenants', async () => {
      const res = await request(app)
        .get('/api/super-admin/tenants')
        .set('Authorization', superToken);
      expect(res.status).toBe(200);
      expect(res.body.tenants).toBeInstanceOf(Array);
    });
  });
});
