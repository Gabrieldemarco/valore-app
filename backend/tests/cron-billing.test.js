// @ts-check
jest.mock('../database', () => ({
  query: jest.fn(),
  queryOne: jest.fn()
}));
jest.mock('../services/email', () => jest.fn(() => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
})));
jest.mock('child_process', () => ({ exec: jest.fn() }));
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, existsSync: jest.fn(), readdirSync: jest.fn(), mkdirSync: jest.fn(), unlinkSync: jest.fn() };
});

process.env.SMTP_USER = 'test@velore.com';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { query, queryOne } = require('../database');
const {
  suspendExpiredFreeTrials,
  generateMonthlyInvoices,
  sendPaymentReminders,
  suspendOverdueTenants
} = require('../cron-billing');

describe('cron-billing', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('suspendExpiredFreeTrials', () => {
    it('suspende tenants con trial vencido', async () => {
      query.mockResolvedValueOnce({ rows: [
        { id: 1, slug: 'pelu-a', business_name: 'Pelu A', notification_email: 'a@test.com', trial_end_date: new Date(Date.now() - 86400000).toISOString() }
      ] });
      const result = await suspendExpiredFreeTrials();
      expect(result.success).toBe(true);
      expect(result.suspended).toBe(1);
    });

    it('retorna 0 si no hay trials vencidos', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const result = await suspendExpiredFreeTrials();
      expect(result.success).toBe(true);
      expect(result.suspended).toBe(0);
    });

    it('maneja error de DB', async () => {
      query.mockRejectedValueOnce(new Error('DB caída'));
      const result = await suspendExpiredFreeTrials();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateMonthlyInvoices', () => {
    it('genera facturas para tenants activos con plan pago', async () => {
      query.mockResolvedValueOnce({ rows: [
        { id: 1, slug: 'pelu-pro', business_name: 'Pelu Pro', notification_email: 'pro@test.com', plan: 'pro', trial_end_date: null, billing_email: 'billing@test.com' }
      ] });
      queryOne.mockResolvedValueOnce(null);
      queryOne.mockResolvedValueOnce({ total: '0' });
      query.mockResolvedValueOnce({ rows: [{ id: 100 }] });
      const result = await generateMonthlyInvoices();
      expect(result.success).toBe(true);
      expect(result.invoiced).toBe(1);
    });

    it('salta si no hay tenants elegibles', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const result = await generateMonthlyInvoices();
      expect(result.success).toBe(true);
      expect(result.invoiced).toBe(0);
    });

    it('salta si ya tiene factura del mes', async () => {
      query.mockResolvedValueOnce({ rows: [
        { id: 1, slug: 'pelu-pro', business_name: 'Pelu Pro', notification_email: 'pro@test.com', plan: 'pro', trial_end_date: null, billing_email: 'b@test.com' }
      ] });
      queryOne.mockResolvedValueOnce({ id: 50 });
      const result = await generateMonthlyInvoices();
      expect(result.success).toBe(true);
      expect(result.results[0].status).toBe('skipped');
    });

    it('maneja error crítico de DB', async () => {
      query.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await generateMonthlyInvoices();
      expect(result.success).toBe(false);
    });
  });

  describe('sendPaymentReminders', () => {
    it('envía recordatorios para facturas próximas a vencer', async () => {
      query.mockResolvedValueOnce({ rows: [
        { id: 1, invoice_number: 'INV-001', amount: '990', due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
          business_name: 'Pelu A', slug: 'pelu-a', billing_email: 'dueño@test.com', notification_email: null }
      ] });
      const result = await sendPaymentReminders();
      expect(result.success).toBe(true);
      expect(result.reminded).toBe(1);
    });

    it('retorna 0 si no hay facturas próximas a vencer', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const result = await sendPaymentReminders();
      expect(result.success).toBe(true);
      expect(result.reminded).toBe(0);
    });

    it('maneja error de DB', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));
      const result = await sendPaymentReminders();
      expect(result.success).toBe(false);
    });
  });

  describe('suspendOverdueTenants', () => {
    it('suspende tenants con facturas vencidas', async () => {
      query.mockResolvedValueOnce({ rows: [
        { id: 1, slug: 'pelu-mora', business_name: 'Pelu Mora', notification_email: 'mora@test.com',
          oldest_due_date: new Date(Date.now() - 86400000 * 10).toISOString() }
      ] });
      const result = await suspendOverdueTenants();
      expect(result.success).toBe(true);
      expect(result.suspended).toBe(1);
    });

    it('retorna 0 si no hay vencidos', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const result = await suspendOverdueTenants();
      expect(result.success).toBe(true);
      expect(result.suspended).toBe(0);
    });

    it('maneja error de DB', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));
      const result = await suspendOverdueTenants();
      expect(result.success).toBe(false);
    });
  });
});
