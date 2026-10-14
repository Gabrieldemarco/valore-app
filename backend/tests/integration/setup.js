// @ts-check
/**
 * Setup para tests de integración con PostgreSQL real.
 * Uso: TEST_DATABASE_URL=postgresql://... npm run test:integration
 *       (o por defecto apunta a localhost:5432/agenda_app_test)
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { applyMigrations } = require('../../migrations/run-migrations');

const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:orion1@localhost:5432/agenda_app_test';

/** @type {Pool|null} */
let adminPool = null;

/**
 * Crea la base de datos de test si no existe (conecta a postgres default DB)
 */
async function ensureTestDatabase() {
  const url = new URL(TEST_DB_URL);
  const dbName = url.pathname.slice(1);
  url.pathname = '/postgres';

  const tempPool = new Pool({ connectionString: url.toString(), max: 1 });
  try {
    const exists = await tempPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (exists.rows.length === 0) {
      await tempPool.query(`CREATE DATABASE "${dbName}"`);
      console.log('✅ Base de test creada: ' + dbName);
    }
  } finally {
    await tempPool.end();
  }
}

/**
 * Conecta al pool de admin (sin base de datos específica) para operaciones DDL
 * @returns {Promise<Pool>}
 */
async function getAdminPool() {
  if (!adminPool) {
    const url = new URL(TEST_DB_URL);
    url.pathname = '/postgres';
    adminPool = new Pool({ connectionString: url.toString(), max: 1 });
  }
  return adminPool;
}

/**
 * Elimina todas las tablas de la base de test
 */
async function dropAllTables() {
  const pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
  try {
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('🗑️ Tablas eliminadas');
  } finally {
    await pool.end();
  }
}

/**
 * Crea todas las tablas aplicando migrations (schema completo y consistente)
 */
async function createTables() {
  const pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
  try {
    const client = await pool.connect();
    const clientQuery = (text, params) => client.query({ text, values: params });
    try {
      await applyMigrations(clientQuery);
      console.log('✅ Tablas creadas');
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Inserta datos de prueba mínimos
 * @returns {Promise<{tenantId: number, staffId: number, serviceId: number, adminStaffId: number, superAdminId: number}>}
 */
async function seedTestData() {
  const { query, queryOne } = require('../../database');
  const hash = await bcrypt.hash('test123', 10);

  // Super admin
  const superAdmin = await queryOne(
    `INSERT INTO super_admins (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
    ['Admin Test', 'admin@test.com', hash]
  );

  // Tenant
  const tenant = await queryOne(
    `INSERT INTO tenants (slug, business_name, notification_email, status, plan)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['test-pelu', 'Pelu Test', 'test@pelu.com', 'active', 'free']
  );

  // Admin staff (usa email único para evitar conflicto con seed demo de initDB)
  const adminStaff = await queryOne(
    `INSERT INTO staff (tenant_id, name, email, password, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant.id, 'Admin Test', 'admin@test-pelu.com', hash, 'admin']
  );

  // Regular staff
  const staff = await queryOne(
    `INSERT INTO staff (tenant_id, name, email, password, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant.id, 'Peluquero Uno', 'staff@test-pelu.com', hash, 'staff']
  );

  // Service
  const service = await queryOne(
    `INSERT INTO services (tenant_id, name, duration, price, active)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant.id, 'Corte de pelo', 30, 500, true]
  );

  // User (client)
  await queryOne(
    `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id`,
    ['cliente1', hash, 'client']
  );

  // Plan prices
  await query(
    `INSERT INTO plan_prices (plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months) VALUES
     ('basico', 400, 10, 'UYU', 280, 7, 3),
     ('estandar', 760, 19, 'UYU', 560, 14, 3),
     ('premium', 1160, 29, 'UYU', 840, 21, 3)
     ON CONFLICT (plan_name) DO NOTHING`
  );

  console.log('✅ Datos de prueba insertados');

  return {
    tenantId: tenant.id,
    staffId: staff.id,
    serviceId: service.id,
    adminStaffId: adminStaff.id,
    superAdminId: superAdmin.id
  };
}

module.exports = {
  ensureTestDatabase,
  dropAllTables,
  createTables,
  seedTestData,
  TEST_DB_URL
};
