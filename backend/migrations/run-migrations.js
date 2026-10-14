// backend/migrations/run-migrations.js
// Simple migration runner: applies .sql files in order and tracks applied versions.
// Can be used standalone (CLI) or imported as a module with an external query function.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = console;

const MIGRATIONS_DIR = path.join(__dirname);

/**
 * Asegura que la tabla de control de migraciones exista.
 * @param {(text: string, params?: any[]) => Promise<any>} query
 */
async function ensureMigrationsTable(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Obtiene el set de migraciones ya aplicadas.
 * @param {(text: string, params?: any[]) => Promise<any>} query
 */
async function getApplied(query) {
  const res = await query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map(r => r.filename));
}

/**
 * Aplica una migración dentro de una transacción.
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {string} file
 */
async function applyMigration(query, file) {
  const sql = fs.readFileSync(file, 'utf8');
  try {
    await query('BEGIN');
    await query(sql);
    await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [path.basename(file)]);
    await query('COMMIT');
    logger.log('Applied', path.basename(file));
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}

/**
 * Aplica todas las migraciones pendientes en orden.
 * La función `query` debe estar vinculada a un cliente de conexión único
 * (para que BEGIN/COMMIT funcionen en la misma conexión).
 *
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @returns {Promise<string[]>} Lista de migraciones aplicadas
 */
async function applyMigrations(query) {
  await ensureMigrationsTable(query);
  const applied = await getApplied(query);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const appliedNow = [];
  for (const f of files) {
    if (applied.has(f)) {
      logger.log('Skipping', f);
      continue;
    }
    logger.log('Applying', f);
    await applyMigration(query, path.join(MIGRATIONS_DIR, f));
    appliedNow.push(f);
  }

  logger.log(`Migrations processed: ${files.length} total, ${appliedNow.length} newly applied`);
  return appliedNow;
}

// CLI entry point (standalone execution)
if (require.main === module) {
  const { Pool } = require('pg');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('DATABASE_URL not set. Aborting migrations.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  (async () => {
    const client = await pool.connect();
    try {
      await applyMigrations((text, params) => client.query({ text, values: params }));
      logger.log('All migrations processed');
    } catch (err) {
      console.error('Migration failed:', err.message || err);
      process.exit(1);
    } finally {
      client.release();
      await pool.end();
    }
  })();
}

module.exports = { applyMigrations, ensureMigrationsTable, getApplied, applyMigration };
