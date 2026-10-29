import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDbPath = path.resolve(__dirname, '../../support_desk.db');
const dbPath = process.env.DB_PATH || defaultDbPath;

export const db = new DatabaseSync(dbPath);

// Enable Foreign Keys
db.exec('PRAGMA foreign_keys = ON;');

// WAL mode only for file-based DBs
if (dbPath !== ':memory:') {
  db.exec('PRAGMA journal_mode = WAL;');
}

// Transaction helper for atomic operations
db.transaction = function (fn) {
  return function (...args) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

export default db;
