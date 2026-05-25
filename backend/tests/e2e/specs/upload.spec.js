// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Upload de imágenes', () => {

  let token;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const body = await res.json();
    token = body.token;
  });

  test('sin token devuelve 401', async ({ request }) => {
    const res = await request.post('/api/upload-image', {
      data: { image: 'data:image/png;base64,abc', filename: 'test.png' }
    });
    expect(res.status()).toBe(401);
  });

  test('sin datos devuelve 400', async ({ request }) => {
    const res = await request.post('/api/upload-image', {
      headers: { Authorization: `Bearer ${token}` },
      data: {}
    });
    expect(res.status()).toBe(400);
  });

  test('formato inválido devuelve 400', async ({ request }) => {
    const res = await request.post('/api/upload-image', {
      headers: { Authorization: `Bearer ${token}` },
      data: { image: 'no-es-base64', filename: 'test.png' }
    });
    expect(res.status()).toBe(400);
  });

  test('sube imagen exitosamente', async ({ request }) => {
    // PNG 1x1 pixel blanco en base64
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await request.post('/api/upload-image', {
      headers: { Authorization: `Bearer ${token}` },
      data: { image: `data:image/png;base64,${tinyPngBase64}`, filename: 'test.png' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toMatch(/^\/uploads\//);
  });
});
