const bcrypt = require('bcryptjs');

bcrypt.hash('orion1', 10).then(hash => {
  console.log('HASH:', hash);
});