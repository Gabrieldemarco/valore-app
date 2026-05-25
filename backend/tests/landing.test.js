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

function mockTenant(overrides = {}) {
  return {
    id: 1, slug: 'test-pelu', status: 'active', plan: 'pro',
    business_name: 'Test Peluquería', business_address: 'Av. Principal 123',
    business_phone: '099111222',
    brand_primary_color: '#cfa86b', brand_secondary_color: '#dfc293',
    brand_logo_url: null,
    landing_enabled: true, landing_description: 'La mejor peluquería',
    landing_hero_image: null, landing_gallery: null, landing_team: null,
    landing_services_info: null, landing_social_links: null,
    landing_custom_css: null, landing_layout: null,
    notification_email: 'test@test.com', notification_whatsapp: null,
    smtp_email: null, smtp_password: null,
    opening_hours: { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] },
    trial_end_date: null,
    ...overrides
  };
}

/**
 * Mock identifyTenant middleware:
 *   queryOne(tenant lookup) + query(set_config)
 */
function mockIdentifyTenant(overrides = {}) {
  queryOne.mockResolvedValueOnce(mockTenant(overrides));
  query.mockResolvedValueOnce({ rows: [] });
}

describe('Landing Page (público)', () => {

  beforeEach(() => {
    jest.resetAllMocks();
    const notif = require('../services/notifications');
    notif.sendClientConfirmation.mockResolvedValue({ success: true });
    notif.notifyStaff.mockResolvedValue({ success: true });
  });

  describe('GET /p/:slug/config', () => {
    it('devuelve configuración del tenant', async () => {
      mockIdentifyTenant();
      const res = await request(app).get('/p/test-pelu/config');
      expect(res.status).toBe(200);
      expect(res.body.tenant.business_name).toBe('Test Peluquería');
    });

    it('404 si el tenant no existe', async () => {
      queryOne.mockResolvedValueOnce(null);
      const res = await request(app).get('/p/no-existe/config');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /p/:slug/services', () => {
    it('lista servicios activos', async () => {
      mockIdentifyTenant();
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Corte', duration: 30, price: 500, image: null },
          { id: 2, name: 'Lavado', duration: 20, price: 300, image: null }
        ]
      });
      const res = await request(app).get('/p/test-pelu/services');
      expect(res.status).toBe(200);
      expect(res.body.services.length).toBe(2);
    });
  });

  describe('GET /p/:slug/landing', () => {
    it('devuelve datos completos de la landing', async () => {
      mockIdentifyTenant({ landing_gallery: ['img1.jpg', 'img2.jpg'] });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Corte', duration: 30, price: 500, image: null }]
      });

      const res = await request(app).get('/p/test-pelu/landing');
      expect(res.status).toBe(200);
      expect(res.body.tenant.business_name).toBe('Test Peluquería');
      expect(res.body.services.length).toBe(1);
      expect(res.body.tenant.landing_layout).toBeNull();
    });

    it('activa landing si está deshabilitada', async () => {
      mockIdentifyTenant({ landing_enabled: false });
      // activate (UPDATE) + services query
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Corte', duration: 30, price: 500, image: null }]
      });

      const res = await request(app).get('/p/test-pelu/landing');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /p/:slug/staff', () => {
    it('lista el staff del tenant', async () => {
      mockIdentifyTenant();
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Ana', photo_url: null, bio: 'Estilista', specialties: ['Corte'], individual_hours: null }
        ]
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Corte', duration: 30, price: 500 }]
      });

      const res = await request(app).get('/p/test-pelu/staff');
      expect(res.status).toBe(200);
      expect(res.body.staff.length).toBe(1);
    });
  });

  describe('GET /p/:slug/staff/:id/availability', () => {
    it('devuelve disponibilidad del peluquero', async () => {
      mockIdentifyTenant();
      queryOne.mockResolvedValueOnce({ id: 1, individual_hours: null });
      queryOne.mockResolvedValueOnce({ duration: 30 });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/p/test-pelu/staff/1/availability?date=2026-06-01&serviceId=1');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/tenant/me (staff)', () => {
    const staffToken = jwt.sign(
      { id: 1, name: 'Staff', email: 'staff@test.com', role: 'staff', tenant_id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    it('devuelve datos del tenant autenticado', async () => {
      queryOne.mockResolvedValueOnce({ status: 'active' });  // checkTenantActive
      queryOne.mockResolvedValueOnce({ status: 'active', plan: 'pro' });  // checkTrialExpiration
      queryOne.mockResolvedValueOnce(mockTenant());  // handler: tenant query
      query.mockResolvedValueOnce({ rows: [] });  // handler: services query

      const res = await request(app)
        .get('/api/tenant/me')
        .set('Authorization', staffToken);
      expect(res.status).toBe(200);
      expect(res.body.tenant.business_name).toBe('Test Peluquería');
    });
  });

  describe('404 personalizada', () => {
    it('devuelve HTML 404 para rutas inexistentes', async () => {
      const res = await request(app).get('/ruta-que-no-existe');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('html');
    });
  });

});
