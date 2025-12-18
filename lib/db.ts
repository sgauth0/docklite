import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import {
  User,
  Site,
  CreateSiteParams,
  Database as DatabaseType,
  CreateDatabaseParams,
  DatabasePermission
} from '@/types';

// Initialize database connection
const dbPath = path.join(process.cwd(), 'data', 'docklite.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sites table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      container_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      template_type TEXT NOT NULL,
      code_path TEXT NOT NULL,
      status TEXT DEFAULT 'stopped',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Databases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS databases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      container_id TEXT UNIQUE NOT NULL,
      postgres_port INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Database permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS database_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      database_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (database_id) REFERENCES databases(id),
      UNIQUE(user_id, database_id)
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Seed admin user if not exists
  seedAdminUser();
}

// Seed initial admin user
function seedAdminUser() {
  try {
    const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    if (!existingAdmin) {
      const passwordHash = bcrypt.hashSync('admin', 10);
      db.prepare(`
        INSERT INTO users (username, password_hash, is_admin)
        VALUES (?, ?, 1)
      `).run('admin', passwordHash);
      console.log('✓ Admin user created (username: admin, password: admin)');
    }
  } catch (error: any) {
    // Ignore UNIQUE constraint errors (admin already exists)
    if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
      throw error;
    }
  }
}

// ============================================
// USER FUNCTIONS
// ============================================

export function getUser(username: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(username: string, password: string, isAdmin: boolean = false): User {
  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, is_admin)
    VALUES (?, ?, ?)
  `).run(username, passwordHash, isAdmin ? 1 : 0);

  return getUserById(result.lastInsertRowid as number)!;
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

// ============================================
// SITE FUNCTIONS
// ============================================

export function getSitesByUser(userId: number, isAdmin: boolean): Site[] {
  if (isAdmin) {
    return db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all() as Site[];
  }
  return db.prepare('SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Site[];
}

export function getSiteById(id: number, userId: number, isAdmin: boolean): Site | undefined {
  if (isAdmin) {
    return db.prepare('SELECT * FROM sites WHERE id = ?').get(id) as Site | undefined;
  }
  return db.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(id, userId) as Site | undefined;
}

export function getSiteByContainerId(containerId: string): Site | undefined {
  return db.prepare('SELECT * FROM sites WHERE container_id = ?').get(containerId) as Site | undefined;
}

export function createSite(params: CreateSiteParams): Site {
  const result = db.prepare(`
    INSERT INTO sites (domain, container_id, user_id, template_type, code_path, status)
    VALUES (?, ?, ?, ?, ?, 'running')
  `).run(params.domain, params.container_id, params.user_id, params.template_type, params.code_path);

  return getSiteById(result.lastInsertRowid as number, params.user_id, true)!;
}

export function updateSiteStatus(id: number, status: string): void {
  db.prepare('UPDATE sites SET status = ? WHERE id = ?').run(status, id);
}

export function deleteSite(id: number): void {
  db.prepare('DELETE FROM sites WHERE id = ?').run(id);
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

export function getDatabasesByUser(userId: number, isAdmin: boolean): DatabaseType[] {
  if (isAdmin) {
    return db.prepare('SELECT * FROM databases ORDER BY created_at DESC').all() as DatabaseType[];
  }

  // Get databases user has permission to access
  return db.prepare(`
    SELECT d.* FROM databases d
    JOIN database_permissions dp ON d.id = dp.database_id
    WHERE dp.user_id = ?
    ORDER BY d.created_at DESC
  `).all(userId) as DatabaseType[];
}

export function getDatabaseById(id: number): DatabaseType | undefined {
  return db.prepare('SELECT * FROM databases WHERE id = ?').get(id) as DatabaseType | undefined;
}

export function createDatabase(params: CreateDatabaseParams): DatabaseType {
  const result = db.prepare(`
    INSERT INTO databases (name, container_id, postgres_port)
    VALUES (?, ?, ?)
  `).run(params.name, params.container_id, params.postgres_port);

  return getDatabaseById(result.lastInsertRowid as number)!;
}

export function getNextAvailablePort(): number {
  const lastDb = db.prepare('SELECT MAX(postgres_port) as max_port FROM databases').get() as { max_port: number | null };
  return lastDb.max_port ? lastDb.max_port + 1 : 5432;
}

export function deleteDatabase(id: number): void {
  // Delete permissions first
  db.prepare('DELETE FROM database_permissions WHERE database_id = ?').run(id);
  // Delete database
  db.prepare('DELETE FROM databases WHERE id = ?').run(id);
}

// ============================================
// PERMISSION FUNCTIONS
// ============================================

export function grantDatabaseAccess(userId: number, databaseId: number): void {
  try {
    db.prepare(`
      INSERT INTO database_permissions (user_id, database_id)
      VALUES (?, ?)
    `).run(userId, databaseId);
  } catch (error) {
    // Permission already exists - ignore
  }
}

export function revokeDatabaseAccess(userId: number, databaseId: number): void {
  db.prepare(`
    DELETE FROM database_permissions
    WHERE user_id = ? AND database_id = ?
  `).run(userId, databaseId);
}

export function hasAccess(userId: number, databaseId: number, isAdmin: boolean): boolean {
  if (isAdmin) return true;

  const permission = db.prepare(`
    SELECT id FROM database_permissions
    WHERE user_id = ? AND database_id = ?
  `).get(userId, databaseId);

  return !!permission;
}

export function getDatabasePermissions(databaseId: number): DatabasePermission[] {
  return db.prepare(`
    SELECT * FROM database_permissions WHERE database_id = ?
  `).all(databaseId) as DatabasePermission[];
}

// Initialize database on module load
initializeDatabase();

export default db;
