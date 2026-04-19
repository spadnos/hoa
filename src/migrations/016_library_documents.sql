CREATE TABLE IF NOT EXISTS library_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  access_tier TEXT NOT NULL DEFAULT 'members'
    CHECK(access_tier IN ('public', 'members', 'board')),
  category TEXT,
  uploaded_by_party_id INTEGER REFERENCES parties(id),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_library_documents_org
  ON library_documents(organization_id);
