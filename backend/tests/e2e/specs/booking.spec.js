// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('API pública y booking', () => {

  test('health endpoint funciona (DB conectada)', async ({ page }) => {
    const response = await page.goto('/api/health');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.status).toBe('ok');
  });

  test('la API de configuración del tenant responde', async ({ page }) => {
    const response = await page.goto('/p/test-pelu/config');
    if (response?.status() !== 200) {
      const text = await response?.text();
      console.log('Config response:', response?.status(), text?.slice(0, 200));
    }
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.tenant).toHaveProperty('slug', 'test-pelu');
  });

  test('la API de servicios del tenant responde', async ({ page }) => {
    const response = await page.goto('/p/test-pelu/services');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body).toHaveProperty('services');
    expect(body.services.length).toBe(2);
  });

  test('la API de disponibilidad responde con slots', async ({ page }) => {
    // Primero obtener un serviceId real
    const svcRes = await page.goto('/p/test-pelu/services');
    const svcBody = await svcRes?.json();
    const serviceId = svcBody.services?.[0]?.id;
    expect(serviceId).toBeDefined();

    // Usar lunes próximo (día hábil)
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];
    const response = await page.goto(`/p/test-pelu/availability?date=${dateStr}&serviceId=${serviceId}`);
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('booking completo vía API', async ({ page }) => {
    // Primero obtener un serviceId real
    const svcRes = await page.goto('/p/test-pelu/services');
    const svcBody = await svcRes?.json();
    const serviceId = svcBody.services?.[0]?.id;
    expect(serviceId).toBeDefined();
    const duration = svcBody.services?.[0]?.duration || 30;

    // Usar lunes próximo
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
    const dateStr = nextMonday.toISOString().split('T')[0];

    const response = await page.request.post('/p/test-pelu/appointments', {
      data: {
        clientName: 'María Test',
        clientPhone: '099123456',
        serviceId: serviceId,
        appointmentDate: `${dateStr}T14:00:00.000Z`,
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('appointment');
    expect(body.appointment.client_name).toBe('María Test');
  });

  test('booking rechaza datos inválidos', async ({ page }) => {
    const response = await page.request.post('/p/test-pelu/appointments', {
      data: { clientName: 'J' }
    });
    expect(response.status()).toBe(400);
  });
});
