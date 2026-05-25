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
const { query, queryOne } = require('../database');

const staffToken = jwt.sign(
  { id: 1, name: 'Staff', email: 'staff@test.com', role: 'staff', tenant_id: 1 },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

/** Mock identifyTenant: queryOne(tenant) + query(set_config) */
function mockIdentifyTenant() {
  queryOne.mockResolvedValueOnce({
    id: 1, slug: 'test', status: 'active', plan: 'pro',
    business_name: 'Test Pelu',
    brand_primary_color: '#2563eb', brand_secondary_color: '#7c3aed',
    opening_hours: { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] }
  });
  query.mockResolvedValueOnce({ rows: [] });
}

/** Mock full public booking route: identifyTenant + checkPlanLimits */
function mockPublicBooking() {
  mockIdentifyTenant();
  queryOne.mockResolvedValueOnce({ plan: 'pro' });
}

/** Mock checkTenantActive + checkTrialExpiration (used in staff routes) */
function mockActiveTenant() {
  queryOne.mockResolvedValueOnce({ status: 'active', plan: 'pro' });
  queryOne.mockResolvedValueOnce({ status: 'active', plan: 'pro' });
}

describe('Appointments', () => {

  beforeEach(() => {
    jest.resetAllMocks();
    // Re-setup module mocks that resetAllMocks clobbers
    const notif = require('../services/notifications');
    notif.sendClientConfirmation.mockResolvedValue({ success: true });
    notif.notifyStaff.mockResolvedValue({ success: true });
  });

  describe('POST /p/:slug/appointments (público)', () => {
    it('crea un turno exitosamente', async () => {
      mockPublicBooking();
      queryOne.mockResolvedValueOnce({ id: 1, name: 'Corte', duration: 30, price: 500, active: true });
      query.mockResolvedValueOnce({ rows: [{ id: 1, client_name: 'Juan', appointment_date: '2026-06-01T14:00:00', service: 'Corte' }] });

      const res = await request(app)
        .post('/p/test/appointments')
        .send({
          clientName: 'Juan Pérez',
          clientPhone: '099123456',
          serviceId: 1,
          appointmentDate: '2026-06-01T14:00:00.000Z'
        });
      expect(res.status).toBe(201);
      expect(res.body.appointment).toBeDefined();
    });

    it('rechaza si falta el nombre (min 2 chars)', async () => {
      mockIdentifyTenant();
      const res = await request(app)
        .post('/p/test/appointments')
        .send({ clientName: 'J', clientPhone: '099123456', serviceId: 1, appointmentDate: '2026-06-01T14:00:00.000Z' });
      expect(res.status).toBe(400);
    });

    it('rechaza si el tenant no existe', async () => {
      queryOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .post('/p/no-existe/appointments')
        .send({ clientName: 'Juan', clientPhone: '099123456', serviceId: 1, appointmentDate: '2026-06-01T14:00:00.000Z' });
      expect(res.status).toBe(404);
    });

    it('rechaza si el tenant está suspendido', async () => {
      queryOne.mockResolvedValueOnce({ id: 1, slug: 'test', status: 'suspended', plan: 'free' });
      const res = await request(app)
        .post('/p/test/appointments')
        .send({ clientName: 'Juan', clientPhone: '099123456', serviceId: 1, appointmentDate: '2026-06-01T14:00:00.000Z' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/appointments (staff)', () => {
    it('lista turnos del tenant', async () => {
      mockActiveTenant();
      query.mockResolvedValueOnce({ rows: [{ total: '2' }] });
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, client_name: 'Juan', appointment_date: '2026-06-01T14:00:00', status: 'confirmed' },
          { id: 2, client_name: 'María', appointment_date: '2026-06-02T10:00:00', status: 'confirmed' }
        ]
      });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
    });

    it('filtra por fecha', async () => {
      mockActiveTenant();
      query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, client_name: 'Juan', appointment_date: '2026-06-01T14:00:00', status: 'confirmed' }]
      });

      const res = await request(app)
        .get('/api/appointments?date=2026-06-01')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/appointments/today', () => {
    it('lista turnos del día', async () => {
      mockActiveTenant();
      query.mockResolvedValueOnce({ rows: [{ id: 1, client_name: 'Juan', appointment_date: new Date().toISOString(), status: 'confirmed' }] });

      const res = await request(app)
        .get('/api/appointments/today')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/appointments/:id/status', () => {
    it('actualiza estado del turno', async () => {
      mockActiveTenant();
      query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] });

      const res = await request(app)
        .put('/api/appointments/1/status')
        .set('Authorization', staffToken)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
    });

    it('rechaza estado inválido', async () => {
      mockActiveTenant();
      const res = await request(app)
        .put('/api/appointments/1/status')
        .set('Authorization', staffToken)
        .send({ status: 'inexistente' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    it('elimina turno existente', async () => {
      mockActiveTenant();
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await request(app)
        .delete('/api/appointments/1')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/appointments/search', () => {
    it('busca por teléfono', async () => {
      mockActiveTenant();
      query.mockResolvedValueOnce({
        rows: [{ id: 1, client_name: 'Juan', client_phone: '099123456' }]
      });

      const res = await request(app)
        .get('/api/appointments/search?phone=099123456')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('GET /p/:slug/availability', () => {
    it('devuelve slots disponibles', async () => {
      mockIdentifyTenant();
      queryOne.mockResolvedValueOnce({ id: 1, name: 'Corte', duration: 30, price: 500, active: true });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/p/test/availability?date=2026-06-01&serviceId=1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('slots');
      expect(Array.isArray(res.body.slots)).toBe(true);
    });

    it('rechaza sin fecha', async () => {
      mockIdentifyTenant();
      const res = await request(app)
        .get('/p/test/availability?serviceId=1');
      expect(res.status).toBe(400);
    });
  });

});
