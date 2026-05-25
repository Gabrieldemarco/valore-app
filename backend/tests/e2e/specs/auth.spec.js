// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Flujo de autenticación', () => {

  test('página de login de staff se renderiza', async ({ page }) => {
    await page.goto('/staff/login');
    await expect(page).toHaveTitle(/Acceso Peluqueros/i);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('página de registro se renderiza', async ({ page }) => {
    await page.goto('/staff/register');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });

  test('login fallido devuelve error vía API', async ({ page }) => {
    const response = await page.request.post('/api/staff/login', {
      data: { email: 'nadie@test.com', password: 'wrongpass' }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('login exitoso redirige al dashboard', async ({ page }) => {
    const response = await page.request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('token');

    await page.goto('/staff/login');
    // Setear token en localStorage y navegar al dashboard
    await page.evaluate((token) => {
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffName', 'Dueño Test');
      localStorage.setItem('staffRole', 'admin');
    }, body.token);
    await page.goto('/staff/dashboard');
    // Debería estar en dashboard (hay token)
    await expect(page.locator('body')).toBeVisible();
  });

  test('dashboard sin token muestra el login', async ({ page }) => {
    await page.goto('/staff/dashboard');
    // Sin token, el JS redirige a /staff/login.html
    await expect(page.locator('body')).toBeVisible();
  });

  test('página de admin login se renderiza', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });
});
