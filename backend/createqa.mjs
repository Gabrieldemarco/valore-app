
import('dotenv').then(() => {
  const bcrypt = require('bcryptjs');
  const pg = require('pg');
  const hash = bcrypt.hashSync('AdminTest123!', 10);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return pool.query('INSERT INTO super_admins (email, password, name) VALUES (\, \, \) ON CONFLICT (email) DO UPDATE SET password = \, name = \ RETURNING id, email', ['qa@velsoie.com', hash, 'QA Admin']);
}).then(r => { console.log(JSON.stringify(r.rows[0], null, 2)); })
.catch(e => { console.error('ERR:', e.message); })
.finally(() => process.exit(0));

