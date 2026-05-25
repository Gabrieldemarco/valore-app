// @ts-check
/**
 * Global setup para E2E: prepara base de test y datos semilla.
 * Se ejecuta UNA VEZ antes de todas las specs.
 */
const { ensureTestDatabase, dropAllTables, createTables, seedTestData, TEST_DB_URL } = require('../integration/setup');

async function globalSetup() {
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.NODE_ENV = 'e2e';
  process.env.JWT_SECRET = 'test-secret-for-e2e';
  process.env.SMTP_USER = 'test@velore.com';
  process.env.FRONTEND_URL = 'http://localhost:3000';

  console.log('\n=== E2E Global Setup ===');

  await ensureTestDatabase();
  await dropAllTables();
  await createTables();

  // Import pool con TEST_DB_URL y seedear
  const { Pool } = require('pg');
  const bcrypt = require('bcryptjs');
  const pool = new Pool({ connectionString: TEST_DB_URL });

  try {
    const hash = await bcrypt.hash('test123', 10);

    // Super admin
    await pool.query(
      `INSERT INTO super_admins (name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
      ['Admin Test', 'admin@test.com', hash]
    );

    // Tenant
    const tenant = await pool.query(
      `INSERT INTO tenants (slug, business_name, notification_email, status, plan)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status RETURNING id`,
      ['test-pelu', 'Peluquería Test', 'test@pelu.com', 'active', 'pro']
    );
    const tenantId = tenant.rows[0].id;

    // Admin staff (dueño)
    await pool.query(
      `INSERT INTO staff (tenant_id, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      [tenantId, 'Dueño Test', 'admin@test-pelu.com', hash, 'admin']
    );

    // Regular staff
    await pool.query(
      `INSERT INTO staff (tenant_id, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      [tenantId, 'Peluquero Uno', 'staff@test-pelu.com', hash, 'staff']
    );

    // Services
    await pool.query(
      `INSERT INTO services (tenant_id, name, duration, price, active)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, 'Corte de pelo', 30, 500, true]
    );
    await pool.query(
      `INSERT INTO services (tenant_id, name, duration, price, active)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, 'Corte + Barba', 60, 800, true]
    );

    // User (client for login)
    await pool.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING`,
      ['cliente-e2e', hash, 'client']
    );

    // Plan prices
    await pool.query(
      `INSERT INTO plan_prices (plan_name, price, currency) VALUES
       ('pro', 990, 'UYU'), ('enterprise', 2490, 'UYU')
       ON CONFLICT (plan_name) DO NOTHING`
    );

    console.log('✅ Datos de prueba insertados');
  } finally {
    await pool.end();
  }

  console.log('=== E2E Global Setup Complete ===\n');
}

module.exports = globalSetup;
