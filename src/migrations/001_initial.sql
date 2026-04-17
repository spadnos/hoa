CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO organizations (id, name) VALUES ('emhoa', 'East Meadows HOA');

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  lot INTEGER NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inquiry',
  submitted TEXT NOT NULL,
  notes TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  owner_lot_address TEXT,
  owner_mailing_address TEXT,
  designer_name TEXT,
  designer_email TEXT,
  designer_phone TEXT,
  designer_company TEXT,
  contractor_name TEXT,
  contractor_email TEXT,
  contractor_phone TEXT,
  contractor_company TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  due_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  group_name TEXT NOT NULL CHECK(group_name IN ('acc_member', 'board_member')),
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
