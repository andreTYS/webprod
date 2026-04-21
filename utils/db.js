const { Database } = require('node-sqlite3-wasm');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS government_plan (
      id          INTEGER PRIMARY KEY,
      filename    TEXT NOT NULL,
      content     TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS news (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      excerpt    TEXT DEFAULT '',
      content    TEXT NOT NULL,
      image_url  TEXT DEFAULT '',
      published  INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS videos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      youtube_id  TEXT NOT NULL,
      published   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT DEFAULT '',
      phone      TEXT DEFAULT '',
      message    TEXT NOT NULL,
      read       INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
  console.log('✅  Base de datos lista');
}

module.exports = { db, initDb };
