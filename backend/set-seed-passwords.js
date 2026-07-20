const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = './data/plantdiagnose.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const password = 'Password123!';
data.users.forEach((u) => {
  u.passwordHash = bcrypt.hashSync(password, 10);
});
fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('updated', data.users.length, 'users');
