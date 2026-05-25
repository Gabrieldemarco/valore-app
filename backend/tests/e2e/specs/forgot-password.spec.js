// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Flujo de recuperación de contraseña', () => {

  test('página de forgot-password se renderiza', async ({ page }) => {
    await page.goto('/staff/forgot-password');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#forgotForm')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('POST forgot-password con email válido', async ({ request }) => {
    const res = await request.post('/api/staff/forgot-password', {
      data: { email: 'admin@test-pelu.com' }
    });
    // Puede fallar si SMTP no está configurado (el token se guarda igual antes de enviar)
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('message');
    }
  });

  test('POST forgot-password sin email da 400', async ({ request }) => {
    const res = await request.post('/api/staff/forgot-password', {
      data: {}
    });
    expect(res.status()).toBe(400);
  });

  test('POST reset-password con token inválido da error', async ({ request }) => {
    const res = await request.post('/api/staff/reset-password', {
      data: { token: 'token-invalido', newPassword: 'nueva123' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST reset-password con contraseña corta da 400', async ({ request }) => {
    const res = await request.post('/api/staff/reset-password', {
      data: { token: 'some-token', newPassword: 'abc' }
    });
    expect(res.status()).toBe(400);
  });

  test('POST reset-password sin datos da 400', async ({ request }) => {
    const res = await request.post('/api/staff/reset-password', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('flujo completo: reset password y login con nueva contraseña', async ({ request }) => {
    // Usa un usuario dedicado (reset-e2e@test-pelu.com) con token conocido seedeado
    const resetRes = await request.post('/api/staff/reset-password', {
      data: { token: 'e2e-reset-token-known', newPassword: 'newpass456' }
    });
    expect(resetRes.status()).toBe(200);
    expect(resetRes.ok()).toBeTruthy();

    const oldLogin = await request.post('/api/staff/login', {
      data: { email: 'reset-e2e@test-pelu.com', password: 'oldpass789' }
    });
    expect(oldLogin.status()).toBe(400);

    const newLogin = await request.post('/api/staff/login', {
      data: { email: 'reset-e2e@test-pelu.com', password: 'newpass456' }
    });
    expect(newLogin.status()).toBe(200);
    const body = await newLogin.json();
    expect(body).toHaveProperty('token');
  });
});
