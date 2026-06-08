// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Landing page pública', () => {

  test('carga y muestra contenido del negocio', async ({ page }) => {
    await page.goto('/landing?tenant=test-pelu');
    // El título se actualiza dinámicamente con el nombre del negocio
    await expect(page).toHaveTitle(/Velsoie/);

    // Esperar a que se cargue el nombre del negocio (vía API)
    await page.waitForFunction(() => {
      const el = document.getElementById('businessName');
      return el && el.textContent && el.textContent.length > 0;
    }, { timeout: 15000 });

    await expect(page.locator('#businessName')).not.toBeEmpty();
    // Esperar a que los servicios se carguen desde la API
    await page.waitForFunction(() => {
      const grid = document.getElementById('servicesGrid');
      return grid && !grid.querySelector('.loading');
    }, { timeout: 15000 });
    await expect(page.locator('#servicesGrid')).toBeVisible();
  });

  test('el formulario de booking se renderiza después de cargar', async ({ page }) => {
    await page.goto('/landing?tenant=test-pelu');
    await page.waitForFunction(() => {
      const el = document.getElementById('businessName');
      return el && el.textContent && el.textContent.length > 0;
    }, { timeout: 15000 });

    // El form existe (esperar a que se inicialice)
    await page.waitForFunction(() => {
      const form = document.getElementById('bookingForm');
      return form && form.style.display !== 'none';
    }, { timeout: 15000 });
    await expect(page.locator('#bookingForm')).toBeVisible();
    await expect(page.locator('#service')).toBeVisible();
    // Los campos de paso 4 (ej: #clientName) están ocultos hasta navegar el stepper
  });

  test('la información de servicios se carga desde la API', async ({ page }) => {
    // Llamar directamente a la API de servicios
    const response = await page.goto('/p/test-pelu/services');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.services.length).toBeGreaterThanOrEqual(1);
  });

  test('flujo completo de booking desde la landing (stepper)', async ({ page, context }) => {
    await page.goto('/landing?tenant=test-pelu');

    // Esperar a que carguen datos desde la API
    await page.waitForFunction(() => {
      const el = document.getElementById('businessName');
      return el && el.textContent && el.textContent.length > 0;
    }, { timeout: 15000 });
    await page.waitForFunction(() => {
      const select = document.getElementById('service');
      return select && select.options.length > 1;
    }, { timeout: 15000 });

    // Step 1: seleccionar servicio
    await page.selectOption('#service', { index: 1 });
    await page.click('#nextStepBtn');

    // Step 2: el calendario está visible, elegir primer día hábil futuro
    await page.waitForSelector('#step2.active', { timeout: 5000 });
    // Esperar a que se renderice el calendario
    await page.waitForFunction(() => {
      const days = document.querySelectorAll('#calDays > .cal-day[data-date]');
      return days.length > 0;
    }, { timeout: 5000 });
    // Clickear el primer día que no sea weekend (Lun-Vie)
    await page.evaluate(() => {
      const day = document.querySelector('#calDays > .cal-day[data-date]:not(.weekend)');
      if (day) day.click();
    });
    await page.click('#nextStepBtn');

    // Step 3: esperar slots y seleccionar uno
    await page.waitForSelector('#step3.active', { timeout: 5000 });
    await page.waitForFunction(() => {
      const btns = document.querySelectorAll('.slot-btn');
      return btns.length > 0;
    }, { timeout: 15000 });
    await page.click('.slot-btn:first-child');
    await page.click('#nextStepBtn');

    // Step 4: completar datos del cliente
    await page.waitForSelector('#step4.active', { timeout: 5000 });
    await page.fill('#clientName', 'E2E Test');
    await page.fill('#clientPhone', '099123456');
    await page.fill('#clientEmail', 'e2e@test.com');
    await page.click('#submitBtn');

    // Verificar mensaje de éxito
    await page.waitForFunction(() => {
      const el = document.getElementById('result');
      return el && el.style.display !== 'none' && el.textContent.toLowerCase().includes('reservado');
    }, { timeout: 15000 });
    await expect(page.locator('#result')).toContainText(/reservado/i);
  });
});
