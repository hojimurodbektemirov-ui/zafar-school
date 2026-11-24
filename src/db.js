import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS admins (
     id INTEGER PRIMARY KEY,
     username TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     token_version INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE TABLE IF NOT EXISTS applications (
     id INTEGER PRIMARY KEY,
     parent_name TEXT NOT NULL,
     phone TEXT NOT NULL,
     child_name TEXT NOT NULL,
     grade TEXT NOT NULL,
     message TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'new'
       CHECK (status IN ('new','contacted','exam','accepted','rejected')),
     admin_note TEXT NOT NULL DEFAULT '',
     notified INTEGER NOT NULL DEFAULT 0,
     ip_hash TEXT NOT NULL DEFAULT '',
     user_agent TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status, created_at);
   CREATE TABLE IF NOT EXISTS news (
     id INTEGER PRIMARY KEY,
     title TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     image TEXT NOT NULL DEFAULT '',
     link TEXT NOT NULL DEFAULT '',
     source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','telegram','seed')),
     tg_post_id INTEGER UNIQUE,
     published INTEGER NOT NULL DEFAULT 1,
     pinned INTEGER NOT NULL DEFAULT 0,
     published_at TEXT NOT NULL DEFAULT (date('now')),
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX IF NOT EXISTS idx_news_pub ON news(published, pinned, published_at);
   CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
];

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (v INTEGER NOT NULL)');
  const row = db.prepare('SELECT v FROM schema_version').get();
  let v = row ? row.v : 0;
  if (!row) db.prepare('INSERT INTO schema_version (v) VALUES (0)').run();
  for (; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.prepare('UPDATE schema_version SET v = ?').run(v + 1);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

export function getMeta(db, key) {
  return db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null;
}

export function setMeta(db, key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}
