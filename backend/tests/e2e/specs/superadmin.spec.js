// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Panel Superadmin', () => {

  test('login devuelve token', async ({ request }) => {
    const res = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body.role).toBe('super_admin');
  });

  test('credenciales inválidas rechazadas', async ({ request }) => {
    const res = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'wrong' }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('lista tenants', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/super-admin/tenants', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.tenants.length).toBeGreaterThanOrEqual(1);
    expect(body.tenants.map(t => t.slug)).toContain('test-pelu');
  });

  test('crea tenant', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.post('/api/super-admin/tenants', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        business_name: 'Nueva Pelu',
        slug: 'nueva-pelu',
        email: 'nueva@pelu.com',
        plan: 'free'
      }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.tenant.slug).toBe('nueva-pelu');
  });

  test('rechaza tenant duplicado', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.post('/api/super-admin/tenants', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        business_name: 'Test Pelu Dupe',
        slug: 'test-pelu',
        email: 'dupe@pelu.com'
      }
    });
    expect(res.status()).toBe(400);
  });

  test('obtiene tenant por ID', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/super-admin/tenants/1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.tenant).toHaveProperty('slug');
  });

  test('actualiza tenant', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.put('/api/super-admin/tenants/1', {
      headers: { Authorization: `Bearer ${token}` },
      data: { business_name: 'Pelu Updated' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.tenant.business_name).toBe('Pelu Updated');
  });

  test('reactiva tenant', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.post('/api/super-admin/tenants/1/reactivate', {
      headers: { Authorization: `Bearer ${token}` },
      data: { mode: 'extend_trial', days: 30 }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  test('crea y lista facturas de tenant', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const createRes = await request.post('/api/super-admin/invoices', {
      headers: { Authorization: `Bearer ${token}` },
      data: { tenant_id: 1, amount: 990, description: 'Mensualidad Pro' }
    });
    expect(createRes.status()).toBe(201);

    const listRes = await request.get('/api/super-admin/tenants/1/invoices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    expect(body.invoices.length).toBeGreaterThanOrEqual(1);
  });

  test('marca factura como pagada', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    // Crear factura
    const createRes = await request.post('/api/super-admin/invoices', {
      headers: { Authorization: `Bearer ${token}` },
      data: { tenant_id: 1, amount: 500, description: 'Prueba pago' }
    });
    const { invoice } = await createRes.json();

    const payRes = await request.put(`/api/super-admin/invoices/${invoice.id}/pay`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { payment_method: 'transfer' }
    });
    expect(payRes.status()).toBe(200);
    const paid = await payRes.json();
    expect(paid.invoice.status).toBe('paid');
  });

  test('estadísticas de facturación', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/super-admin/stats/billing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('activeTenants');
    expect(body.activeTenants).toBeGreaterThanOrEqual(1);
  });

  test('precios de planes', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/super-admin/plan-prices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.prices.length).toBeGreaterThanOrEqual(1);
  });

  test('actualiza precio de plan', async ({ request }) => {
    const loginRes = await request.post('/api/super-admin/login', {
      data: { email: 'admin@test.com', password: 'test123' }
    });
    const { token } = await loginRes.json();

    const res = await request.put('/api/super-admin/plan-prices/pro', {
      headers: { Authorization: `Bearer ${token}` },
      data: { price: 1200, currency: 'UYU' }
    });
    expect(res.status()).toBe(200);
  });

  test('sin token devuelve 401', async ({ request }) => {
    const res = await request.get('/api/super-admin/tenants');
    expect(res.status()).toBe(401);
  });

  test('login página se renderiza', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('form')).toBeVisible();
  });

});
