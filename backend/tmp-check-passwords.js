const bcrypt = require('bcryptjs');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/plantdiagnose.json', 'utf8'));
const passwords = ['password123','Password123!','PlantDiagnose123!','password','Password1!','123456','admin123','plantdiagnose','P@ssw0rd','Password123','password1','plantdiagnose123'];
for (const u of data.users) {
  const matches = passwords.filter((p) => bcrypt.compareSync(p, u.passwordHash));
  if (matches.length) {
    console.log(u.email, matches);
  }
}
