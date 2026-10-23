const { query } = require('./src/db');
query(
  'INSERT INTO super_admins (email, password, name) VALUES (, , ) ON CONFLICT (email) DO UPDATE SET password = , name =  RETURNING id, email',
  ['qa@velsoie.com', '', 'QA Admin']
)
  .then(r => {
    console.log(JSON.stringify(r.rows[0]));
    process.exit(0);
  })
  .catch(e => {
    console.error('ERR', e.message);
    process.exit(1);
  });
