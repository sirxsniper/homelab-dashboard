const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BACKEND_ROOT = path.join(__dirname, '../..');
const rawDbPath = process.env.DB_PATH || './data/homelab.db';
const DB_PATH = path.isAbsolute(rawDbPath) ? rawDbPath : path.resolve(BACKEND_ROOT, rawDbPath);

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initialize() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'viewer',
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      created_at  INTEGER DEFAULT (unixepoch()),
      last_login  INTEGER
    );

    CREATE TABLE IF NOT EXISTS apps (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      icon          TEXT DEFAULT '🖥️',
      url           TEXT NOT NULL,
      category      TEXT NOT NULL,
      type          TEXT NOT NULL,
      auth_type     TEXT NOT NULL DEFAULT 'none',
      credential    TEXT,
      poll_interval INTEGER DEFAULT 30,
      enabled       INTEGER DEFAULT 1,
      sort_order    INTEGER DEFAULT 0,
      created_at    INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS stats_latest (
      app_id      TEXT PRIMARY KEY,
      data        TEXT NOT NULL,
      updated_at  INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stats_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id      TEXT NOT NULL,
      data        TEXT NOT NULL,
      recorded_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_history_app_time ON stats_history(app_id, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      token_hash  TEXT NOT NULL,
      expires_at  INTEGER NOT NULL,
      created_at  INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT,
      action      TEXT NOT NULL,
      detail      TEXT,
      ip          TEXT,
      created_at  INTEGER DEFAULT (unixepoch())
    );
  `);

  // Pending TOTP secrets table (for 2FA setup across cluster workers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_totp (
      user_id     TEXT PRIMARY KEY,
      secret      TEXT NOT NULL,
      expires_at  INTEGER NOT NULL
    );
  `);

  // Ensure open_url column exists on apps table (migration)
  try {
    db.prepare("SELECT open_url FROM apps LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE apps ADD COLUMN open_url TEXT");
  }

  // Create initial admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const username = process.env.INITIAL_ADMIN_USER || 'admin';
    const password = process.env.INITIAL_ADMIN_PASS || 'changeme';
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), username, hash, 'admin');
    console.log(`[DB] Initial admin user "${username}" created`);
  }

  console.log('[DB] Database initialized');
}

module.exports = { getDb, initialize };
