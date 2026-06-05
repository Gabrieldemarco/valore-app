// backend/migrations/run-migrations.js
// Simple migration runner: applies .sql files in order and tracks applied versions.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = console;

const MIGRATIONS_DIR = path.join(__dirname);

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

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getApplied(client) {
  const res = await client.query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map(r => r.filename));
}

async function applyMigration(client, file) {
  const sql = fs.readFileSync(file, 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [path.basename(file)]);
    await client.query('COMMIT');
    logger.log('Applied', path.basename(file));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const f of files) {
      if (applied.has(f)) {
        logger.log('Skipping', f);
        continue;
      }
      logger.log('Applying', f);
      await applyMigration(client, path.join(MIGRATIONS_DIR, f));
    }

    logger.log('All migrations processed');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
