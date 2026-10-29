import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initDb() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schemaSql);

  // Seed 3 demo agents if they don't already exist
  const insertAgent = db.prepare(`
    INSERT OR IGNORE INTO agents (name, email, role)
    VALUES (?, ?, ?)
  `);

  insertAgent.run('Alice Johnson', 'alice@supportdesk.internal', 'agent');
  insertAgent.run('Bob Martinez', 'bob@supportdesk.internal', 'agent');
  insertAgent.run('Charlie Kim', 'charlie@supportdesk.internal', 'lead');
}

export function resetDb() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS ticket_events;');
  db.exec('DROP TABLE IF EXISTS ticket_messages;');
  db.exec('DROP TABLE IF EXISTS tickets;');
  db.exec('DROP TABLE IF EXISTS agents;');
  db.exec('PRAGMA foreign_keys = ON;');
  initDb();
}

// Run directly if invoked from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDb();
  console.log('Database initialized and demo agents verified.');
}
