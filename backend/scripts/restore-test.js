// backend/scripts/restore-test.js
// Usage: TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/agenda_restore_test node scripts/restore-test.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { backupDatabase } = require('../cron-billing');

function parseDatabaseUrl(dbUrl) {
  const url = new URL(dbUrl);
  return {
    protocol: url.protocol,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1),
  };
}

function buildConnectionString({ user, password, host, port, database }) {
  const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : '';
  return `postgresql://${auth}${host}:${port}/${database}`;
}

function runCommand(cmd, env = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { env: { ...process.env, ...env }, shell: true }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`${err.message}\n${stderr || stdout}`.trim()));
      }
      resolve(stdout.trim());
    });
  });
}

(async () => {
  try {
    const backupResult = await backupDatabase();
    if (!backupResult.success || !backupResult.filename) {
      console.error('[restore-test] Backup failed:', backupResult.error);
      process.exit(1);
    }

    const backupFile = path.join(__dirname, '..', 'backups', backupResult.filename);
    if (!fs.existsSync(backupFile)) {
      console.error('[restore-test] Backup file not found:', backupFile);
      process.exit(1);
    }

    const targetUrl = process.env.RESTORE_DATABASE_URL || process.env.TEST_DATABASE_URL;
    if (!targetUrl) {
      console.error('[restore-test] Missing RESTORE_DATABASE_URL or TEST_DATABASE_URL');
      process.exit(2);
    }

    const target = parseDatabaseUrl(targetUrl);
    const restoreDb = target.database;
    if (!restoreDb) {
      console.error('[restore-test] Invalid restore database name');
      process.exit(2);
    }

    const adminDb = { ...target, database: 'postgres' };
    const adminConn = buildConnectionString(adminDb);
    const restoreConn = buildConnectionString(target);

    console.log('[restore-test] Restoring into', restoreDb);

    await runCommand(`psql "${adminConn}" -v ON_ERROR_STOP=1 -c \"DROP DATABASE IF EXISTS ${restoreDb}; CREATE DATABASE ${restoreDb};\"`);
    await runCommand(`psql "${restoreConn}" -v ON_ERROR_STOP=1 < "${backupFile}"`);

    const tables = ['services', 'appointments', 'tenants'];
    const sourceCounts = {};
    const restoreCounts = {};

    for (const table of tables) {
      const sourceResult = await runCommand(`psql "${buildConnectionString(parseDatabaseUrl(process.env.DATABASE_URL))}" -t -A -c \"SELECT COUNT(*) FROM ${table};\"`);
      const restoreResult = await runCommand(`psql "${restoreConn}" -t -A -c \"SELECT COUNT(*) FROM ${table};\"`);
      sourceCounts[table] = parseInt(sourceResult, 10);
      restoreCounts[table] = parseInt(restoreResult, 10);
      if (sourceCounts[table] !== restoreCounts[table]) {
        throw new Error(`Restore mismatch for ${table}: source=${sourceCounts[table]} restored=${restoreCounts[table]}`);
      }
    }

    console.log('[restore-test] Restore successful');
    console.log('[restore-test] Source counts:', sourceCounts);
    console.log('[restore-test] Restored counts:', restoreCounts);
    process.exit(0);
  } catch (err) {
    console.error('[restore-test] Error:', err.message || err);
    process.exit(1);
  }
})();