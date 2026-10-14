
// backend/database.js
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
require('dotenv').config();
const config = require('./config');
const { applyMigrations } = require('./migrations/run-migrations');
import logger from './services/logger';

const isLocal = (process.env.DATABASE_URL || '').includes('localhost') || (process.env.DATABASE_URL || '').includes('127.0.0.1');
const dbSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

let sslConfig;
if (isLocal) {
  sslConfig = false;
} else {
  sslConfig = {
    rejectUnauthorized: dbSslRejectUnauthorized
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: sslConfig,
  max: parseInt(process.env.DB_POOL_MAX || '30'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  logger.error('❌ Error inesperado en el pool:', err.message);
});

/**
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const res = await client.query({
      text,
      values: params,
      statement_timeout: 5000
    });
    return res;
  } catch (err: any) {
    logger.error(`❌ Query error: message="${err?.message}" code=${err?.code} detail="${err?.detail}"`);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<any>}
 */
const queryOne = async (text: string, params?: any[]) => {
  const res = await query(text, params);
  return res.rows[0] || null;
};

/**
 * Obtiene un cliente del pool para transacciones.
 * El caller debe liberarlo con client.release() cuando termine.
 */
const getClient = async () => {
  return pool.connect();
};

// INIT DB (igual lógica, pero más robusta)
async function initDB() {
  const client = await pool.connect();
  try {
    logger.info('🔌 Conectando a DB...');

    await client.query('SELECT 1');

    const clientQuery = (text, params) => client.query({ text, values: params });
    await applyMigrations(clientQuery);

    if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO === 'true') {
      await seedDefaults(client);
    } else {
      logger.info('ℹ️ Seed demo omitido en producción (SEED_DEMO=true para habilitarlo)');
    }

    logger.info('✅ DB lista y estable');
  } catch (err: any) {
    logger.error('❌ Error initDB:', err.message);
  } finally {
    client.release();
  }
}

// Seed (lo dejamos igual)
async function seedDefaults(client) {
  try {
    const admin = await client.query('SELECT id FROM staff WHERE email = $1', ['admin@pelu.com']);

    if (admin.rows.length === 0) {
      const tenantResult = await client.query(
        `INSERT INTO tenants (slug, business_name, notification_email) 
         VALUES ($1, $2, $3) RETURNING id`,
        ['demo', 'Pelu Demo', 'admin@pelu.com']
      );

      const tenantId = tenantResult.rows[0].id;

      const hash = await bcrypt.hash('admin123', config.BCRYPT_ROUNDS);

      await client.query(
        `INSERT INTO staff (tenant_id, name, email, password, role) 
         VALUES ($1, $2, $3, $4, 'admin')`,
        [tenantId, 'Admin', 'admin@pelu.com', hash]
      );

      logger.info('✅ Admin demo creado');
    }

    // Seed precios de planes por defecto
    const planPrices = await client.query('SELECT plan_name FROM plan_prices');
    const existingPlans = new Set(planPrices.rows.map(r => r.plan_name));
    const planDefaults = [
      ['free', 0, 0, 'UYU', 0, 0, 0],
      ['basico', 400, 10, 'UYU', 280, 7, 3],
      ['estandar', 760, 19, 'UYU', 560, 14, 3],
      ['premium', 1160, 29, 'UYU', 840, 21, 3],
    ];
    for (const [name, price, priceUsd, currency, promo, promoUsd, months] of planDefaults) {
      if (existingPlans.has(name)) continue;
      await client.query(
        `INSERT INTO plan_prices (plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, price, priceUsd, currency, promo, promoUsd, months]
      );
    }
    logger.info('✅ Precios de planes creados');
  } catch (e: any) {
    logger.error('Seed error:', e.message);
  }
}

export {
  pool,
  initDB,
  query,
  queryOne,
  getClient,
};