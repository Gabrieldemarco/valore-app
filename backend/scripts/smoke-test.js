// backend/scripts/smoke-test.js
// Minimal smoke tests against a running server.
// Usage: BASE_URL=http://localhost:3000 node scripts/smoke-test.js
require('dotenv').config();
const url = process.env.BASE_URL || 'http://localhost:3000';

async function check(path, expectedStatus = 200) {
  const full = `${url}${path}`;
  process.stdout.write(`Checking ${full} ... `);
  try {
    const res = await fetch(full, { method: 'GET' });
    if (res.status !== expectedStatus) {
      console.error(`FAIL (status ${res.status})`);
      return false;
    }
    console.log('OK');
    return true;
  } catch (err) {
    console.error('ERROR', err.message || err);
    return false;
  }
}

(async () => {
  const checks = [
    { path: '/api/health', status: 200 },
    { path: '/api/tenants', status: 200 }
  ];

  let allOk = true;
  for (const c of checks) {
    const ok = await check(c.path, c.status);
    allOk = allOk && ok;
  }

  if (!allOk) {
    console.error('\nSmoke tests failed. Do not proceed with deploy.');
    process.exit(2);
  }
  console.log('\nSmoke tests passed.');
  process.exit(0);
})();
