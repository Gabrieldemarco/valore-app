// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Páginas estáticas', () => {

  test('index.html se sirve en /', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('landing.html se sirve en /landing', async ({ page }) => {
    await page.goto('/landing?tenant=test-pelu');
    await expect(page).toHaveTitle(/Veloré/);
  });

  test('404 personalizada para ruta inexistente', async ({ page }) => {
    const response = await page.goto('/ruta-que-no-existe');
    expect(response?.status()).toBe(404);
    await expect(page.locator('body')).toBeVisible();
    // Debe mostrar nuestra 404.html, no la default de Express
    const text = await page.textContent('body');
    expect(text).toMatch(/404|No encontrado|Página no encontrada/i);
  });

  test('/staff/register se sirve', async ({ page }) => {
    await page.goto('/staff/register');
    await expect(page.locator('form')).toBeVisible();
  });

  test('/staff/forgot-password se sirve', async ({ page }) => {
    await page.goto('/staff/forgot-password');
    await expect(page.locator('body')).toBeVisible();
  });

  test('/admin/dashboard sin token redirige', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForFunction(() => window.location.href.includes('login'), { timeout: 10000 });
  });
});
