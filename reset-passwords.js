const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'data/docklite.db');
const db = new Database(dbPath);

async function resetPasswords() {
  console.log('Resetting passwords...\n');

  // Reset admin password to 'admin'
  const adminHash = await bcrypt.hash('admin', 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(adminHash, 'admin');
  console.log('✓ Reset admin password to: admin');

  // Reset stella password to 'password'
  const stellaHash = await bcrypt.hash('password', 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(stellaHash, 'stella');
  console.log('✓ Reset stella password to: password');

  console.log('\nPassword reset complete!');
  db.close();
}

resetPasswords().catch(console.error);
