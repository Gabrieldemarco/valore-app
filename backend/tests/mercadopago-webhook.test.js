const crypto = require('crypto');
const {
  buildManifest,
  computeSignature,
  verifyMercadoPagoWebhook,
  parseXSignature,
} = require('../services/mercadopago-webhook');

describe('MercadoPago webhook signature', () => {
  const secret = 'test-webhook-secret';
  const requestId = 'req-abc-123';
  const dataId = '999888777';
  const ts = String(Math.floor(Date.now() / 1000));

  function signedHeaders(overrides = {}) {
    const manifest = buildManifest(dataId, requestId, ts);
    const v1 = computeSignature(manifest, secret);
    return {
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': requestId,
      ...overrides,
    };
  }

  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = secret;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.MP_WEBHOOK_SECRET;
  });

  it('parsea x-signature correctamente', () => {
    const parsed = parseXSignature('ts=1704908010,v1=abc123');
    expect(parsed).toEqual({ ts: '1704908010', v1: 'abc123' });
  });

  it('acepta firma válida', () => {
    const req = {
      headers: signedHeaders(),
      query: { 'data.id': dataId },
      body: { type: 'payment', data: { id: dataId } },
    };
    expect(verifyMercadoPagoWebhook(req)).toEqual({ ok: true });
  });

  it('rechaza firma incorrecta', () => {
    const req = {
      headers: {
        'x-signature': `ts=${ts},v1=deadbeef`,
        'x-request-id': requestId,
      },
      query: { 'data.id': dataId },
      body: {},
    };
    const result = verifyMercadoPagoWebhook(req);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it('omite validación en test sin secret (no producción)', () => {
    delete process.env.MP_WEBHOOK_SECRET;
    const req = { headers: {}, query: {}, body: {} };
    expect(verifyMercadoPagoWebhook(req)).toEqual({ ok: true, skipped: true });
  });

  it('exige secret en producción', () => {
    delete process.env.MP_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    const req = { headers: {}, query: {}, body: {} };
    const result = verifyMercadoPagoWebhook(req);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    process.env.NODE_ENV = 'test';
  });
});
