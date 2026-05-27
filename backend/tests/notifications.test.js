jest.mock('../database', () => ({
  queryOne: jest.fn().mockResolvedValue(null),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  initDB: jest.fn().mockResolvedValue(),
  pool: { end: jest.fn().mockResolvedValue() },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id-123' }),
  })),
}));

process.env.SMTP_USER = 'test@velore.com';
process.env.SMTP_PASS = 'secret';

const { sendClientConfirmation, notifyStaff } = require('../services/notifications');

const mockTenant = {
  id: 1,
  slug: 'test-pelu',
  business_name: 'Peluquería Test',
  brand_primary_color: '#2563eb',
  business_address: 'Calle Falsa 123',
  business_phone: '+59899123456',
  notification_email: 'owner@test.com',
  notification_whatsapp: '+59899123456',
};

const mockAppointment = {
  client_name: 'María López',
  client_email: 'maria@test.com',
  client_phone: '+59899123456',
  appointment_date: new Date('2026-06-01T14:00:00').toISOString(),
  service: 'Corte de pelo',
  service_duration: 30,
  staff_name: 'Peluquero Uno',
  notes: 'Sin sal',
};

describe('sendClientConfirmation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SMTP_USER = 'test@velore.com';
    process.env.SMTP_PASS = 'secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('envía email cuando hay client_email', async () => {
    const result = await sendClientConfirmation(mockAppointment, mockTenant);
    expect(result.success).toBe(true);
    expect(result.simulated).toBeUndefined();
  });

  test('salta cuando no hay client_email', async () => {
    const result = await sendClientConfirmation({ ...mockAppointment, client_email: null }, mockTenant);
    expect(result.success).toBe(true);
    expect(result.skipped).toBe('No email provided');
  });

  test('simula cuando no hay SMTP_USER', async () => {
    delete process.env.SMTP_USER;
    const result = await sendClientConfirmation(mockAppointment, mockTenant);
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });

  test('simula cuando no hay SMTP_PASS', async () => {
    delete process.env.SMTP_PASS;
    const result = await sendClientConfirmation(mockAppointment, mockTenant);
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });
});

describe('notifyStaff', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SMTP_USER = 'test@velore.com';
    process.env.SMTP_PASS = 'secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('notifica al staff cuando hay notification_email', async () => {
    const result = await notifyStaff(mockAppointment, mockTenant);
    expect(result.success).toBe(true);
    expect(result.simulated).toBeUndefined();
  });

  test('salta cuando no hay notification_email', async () => {
    const result = await notifyStaff(mockAppointment, { ...mockTenant, notification_email: null });
    expect(result.success).toBe(true);
    expect(result.skipped).toBe('No recipients configured');
  });

  test('simula cuando no hay SMTP_USER', async () => {
    delete process.env.SMTP_USER;
    const result = await notifyStaff(mockAppointment, mockTenant);
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });
});
