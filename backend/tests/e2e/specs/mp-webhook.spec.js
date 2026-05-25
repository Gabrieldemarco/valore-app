// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Webhook MercadoPago', () => {

  test('GET /api/test-webhook responde', async ({ page }) => {
    const response = await page.goto('/api/test-webhook');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.status).toBe('ok');
  });

  test('POST webhook con live_mode:false devuelve OK test mode', async ({ request }) => {
    const response = await request.post('/api/payments/mercadopago/webhook', {
      data: {
        type: 'payment',
        live_mode: false,
        data: { id: 'test-123' },
      }
    });
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('OK');
  });

  test('POST webhook sin data.id hace skip (no es pago)', async ({ request }) => {
    const response = await request.post('/api/payments/mercadopago/webhook', {
      data: { type: 'test' }
    });
    expect(response.status()).toBe(200);
  });

});
