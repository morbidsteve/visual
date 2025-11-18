const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/whitelist.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize whitelist table
db.exec(`
  CREATE TABLE IF NOT EXISTS whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_type TEXT NOT NULL, -- 'ip', 'subnet', 'connection', 'protocol'
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    UNIQUE(entry_type, value)
  )
`);

// Create indexes for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_whitelist_type ON whitelist(entry_type);
  CREATE INDEX IF NOT EXISTS idx_whitelist_value ON whitelist(value);
`);

console.log('Database initialized at:', dbPath);

module.exports = db;
