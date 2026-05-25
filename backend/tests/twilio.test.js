const { sendWhatsApp, ensureWhatsAppPrefix } = require('../services/twilio');

jest.mock('../database', () => ({
  queryOne: jest.fn().mockResolvedValue(null),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  initDB: jest.fn().mockResolvedValue(),
  pool: { end: jest.fn().mockResolvedValue() },
}));

const mockCreate = jest.fn();
jest.mock('twilio', () => jest.fn(() => ({
  messages: { create: mockCreate }
})));

describe('ensureWhatsAppPrefix', () => {
  test('agrega prefix si no tiene', () => {
    expect(ensureWhatsAppPrefix('59899123456')).toBe('whatsapp:59899123456');
  });

  test('no duplica prefix', () => {
    expect(ensureWhatsAppPrefix('whatsapp:59899123456')).toBe('whatsapp:59899123456');
  });

  test('limpia espacios y guiones', () => {
    expect(ensureWhatsAppPrefix('+598 99-123-456')).toBe('whatsapp:+59899123456');
  });

  test('devuelve string vacío si falsy', () => {
    expect(ensureWhatsAppPrefix(null)).toBe('');
    expect(ensureWhatsAppPrefix(undefined)).toBe('');
    expect(ensureWhatsAppPrefix('')).toBe('');
  });
});

describe('sendWhatsApp', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_WHATSAPP_FROM = '+14155551234';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('salta si no hay teléfono', async () => {
    const result = await sendWhatsApp(null, 'Hola');
    expect(result.success).toBe(true);
    expect(result.skipped).toBe('No phone provided');
  });

  test('simula si falta TWILIO_WHATSAPP_FROM', async () => {
    delete process.env.TWILIO_WHATSAPP_FROM;
    const result = await sendWhatsApp('+59899123456', 'Hola');
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });

  test('simula si faltan credenciales', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const result = await sendWhatsApp('+59899123456', 'Hola');
    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });

  test('envía mensaje exitosamente', async () => {
    mockCreate.mockResolvedValueOnce({ sid: 'SM123' });
    const result = await sendWhatsApp('+59899123456', 'Hola');
    expect(result.success).toBe(true);
    expect(result.sid).toBe('SM123');
  });

  test('maneja error de Twilio', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Account not found'));
    const result = await sendWhatsApp('+59899123456', 'Hola');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Account not found');
  });
});
