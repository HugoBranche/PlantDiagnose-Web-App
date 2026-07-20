require('dotenv').config();
const db = require('./src/db');

(async () => {
  try {
    const admin = await db.users.findById(9999);
    console.log('admin lookup:', admin && admin.email, admin && admin.role);

    const users = await db.users.all();
    console.log('user count:', users.length);

    const botanists = await db.botanists.all();
    console.log('botanist count:', botanists.length);

    const created = await db.users.create({
      name: 'Supabase Verify User',
      email: 'supabase-verify@example.com',
      passwordHash: 'placeholder-hash',
      role: 'user',
    });

    console.log('created user id:', created.id, 'email:', created.email);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
