CREATE TABLE IF NOT EXISTS conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  description TEXT NOT NULL,
  satisfied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
