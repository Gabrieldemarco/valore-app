// backend/scripts/backup-db.js
// Usage: node scripts/backup-db.js
require('dotenv').config();
const { backupDatabase } = require('../cron-billing');

(async () => {
  const result = await backupDatabase();
  if (!result.success) {
    console.error('[backup-db] Backup failed:', result.error);
    process.exit(1);
  }
  console.log('[backup-db] Backup created:', result.filename);
  process.exit(0);
})();