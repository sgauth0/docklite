
const { createUser } = require('./lib/db.ts');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log('Usage: node createUser.js <username> <password>');
  process.exit(1);
}

try {
  const user = createUser(username, password);
  console.log(`User ${user.username} created successfully with id ${user.id}`);
} catch (error) {
  console.error('Error creating user:', error);
}
