// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dashboard staff', () => {

  test('login y dashboard se renderiza', async ({ page, request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    expect(loginRes.status()).toBe(200);
    const { token, name } = await loginRes.json();

    await page.goto('/staff/login');
    await page.evaluate((t) => {
      localStorage.setItem('staffToken', t.token);
      localStorage.setItem('staffName', t.name);
      localStorage.setItem('staffRole', 'admin');
    }, { token, name });

    await page.goto('/staff/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.header')).toBeVisible();
  });

  test('lista turnos vía API', async ({ request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/appointments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('appointments');
    expect(Array.isArray(body.appointments)).toBe(true);
  });

  test('actualiza estado de turno', async ({ request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    // Crear un turno primero
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + ((8 - tomorrow.getDay()) % 7 || 7));
    const dateStr = tomorrow.toISOString().split('T')[0];
    const svcRes = await request.get('/p/test-pelu/services');
    const svcBody = await svcRes.json();
    const serviceId = svcBody.services?.[0]?.id;

    const createRes = await request.post('/p/test-pelu/appointments', {
      data: {
        clientName: 'Dashboard Test',
        clientPhone: '099111222',
        serviceId,
        appointmentDate: `${dateStr}T10:00:00.000Z`,
      }
    });
    expect(createRes.status()).toBe(201);
    const { appointment } = await createRes.json();

    const updateRes = await request.put(`/api/appointments/${appointment.id}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'completed' }
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.appointment.status).toBe('completed');
  });

  test('elimina turno', async ({ request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + ((8 - tomorrow.getDay()) % 7 || 7));
    const dateStr = tomorrow.toISOString().split('T')[0];
    const svcRes = await request.get('/p/test-pelu/services');
    const svcBody = await svcRes.json();
    const serviceId = svcBody.services?.[0]?.id;

    const createRes = await request.post('/p/test-pelu/appointments', {
      data: {
        clientName: 'Delete Test',
        clientPhone: '099333444',
        serviceId,
        appointmentDate: `${dateStr}T11:00:00.000Z`,
      }
    });
    expect(createRes.status()).toBe(201);
    const { appointment } = await createRes.json();

    const deleteRes = await request.delete(`/api/appointments/${appointment.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteRes.status()).toBe(200);
  });

  test('obtiene datos del tenant', async ({ request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/tenant/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('tenant');
    expect(body.tenant.slug).toBe('test-pelu');
  });

  test('actualiza configuración del tenant', async ({ request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.put('/api/tenant/settings', {
      headers: { Authorization: `Bearer ${token}` },
      data: { business_name: 'Peluquería Test Updated' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.tenant.business_name).toBe('Peluquería Test Updated');
  });

  test('lista staff del tenant', async ({ request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/tenant/staff', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.staff.length).toBe(3); // Dueño + Peluquero + Reset E2E
  });

  test('sin token devuelve 401', async ({ request }) => {
    const res = await request.get('/api/appointments');
    expect(res.status()).toBe(401);
  });

  test('dashboard tiene elementos del calendario en el DOM', async ({ page, request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token, name } = await loginRes.json();

    await page.goto('/staff/login');
    await page.evaluate((t) => {
      localStorage.setItem('staffToken', t.token);
      localStorage.setItem('staffName', t.name);
      localStorage.setItem('staffRole', 'admin');
    }, { token, name });

    await page.goto('/staff/dashboard');
    // El calendario empieza oculto (display:none) hasta que se activa la vista
    await expect(page.locator('#calendarContainer')).toBeAttached();
    await expect(page.locator('#calendar')).toBeAttached();
  });

  test('dashboard incluye FullCalendar en la página', async ({ page, request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token, name } = await loginRes.json();

    await page.goto('/staff/login');
    await page.evaluate((t) => {
      localStorage.setItem('staffToken', t.token);
      localStorage.setItem('staffName', t.name);
      localStorage.setItem('staffRole', 'admin');
    }, { token, name });

    await page.goto('/staff/dashboard');
    // Verificar que FullCalendar está cargado como parte de la página
    await expect(page.locator('script[src*="fullcalendar"]')).toBeAttached();
    // Verificar que el contenedor del calendario existe en el DOM
    await expect(page.locator('#calendarContainer')).toBeAttached();
    await expect(page.locator('#calendar')).toBeAttached();
  });

  test('dashboard muestra filtro de staff', async ({ page, request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token, name } = await loginRes.json();

    await page.goto('/staff/login');
    await page.evaluate((t) => {
      localStorage.setItem('staffToken', t.token);
      localStorage.setItem('staffName', t.name);
      localStorage.setItem('staffRole', 'admin');
    }, { token, name });

    await page.goto('/staff/dashboard');
    await expect(page.locator('#staffFilterContainer')).toBeVisible();
  });

  test('dashboard muestra contenedor de turnos', async ({ page, request }) => {
    const loginRes = await request.post('/api/staff/login', {
      data: { email: 'admin@test-pelu.com', password: 'test123' }
    });
    const { token, name } = await loginRes.json();

    await page.goto('/staff/login');
    await page.evaluate((t) => {
      localStorage.setItem('staffToken', t.token);
      localStorage.setItem('staffName', t.name);
      localStorage.setItem('staffRole', 'admin');
    }, { token, name });

    await page.goto('/staff/dashboard');
    await expect(page.locator('#appointmentsContainer')).toBeVisible();
  });

});
