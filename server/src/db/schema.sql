-- SQLite Schema for Support Desk System
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'agent'
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  customer TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
  status TEXT NOT NULL CHECK(status IN ('Open', 'In Progress', 'Waiting on Customer', 'Resolved')) DEFAULT 'Open',
  assignee_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('reply', 'note')),
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  actor_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_events_ticket_id ON ticket_events(ticket_id);
