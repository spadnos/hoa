CREATE TABLE IF NOT EXISTS project_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
