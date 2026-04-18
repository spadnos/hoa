CREATE TABLE IF NOT EXISTS project_contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  party_id    INTEGER NOT NULL REFERENCES parties(id),
  role_label  TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, party_id, role_label)
);

CREATE INDEX IF NOT EXISTS idx_project_contacts_project
  ON project_contacts(project_id);
