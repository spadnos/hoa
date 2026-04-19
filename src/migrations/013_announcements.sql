CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  posted_by_party_id INTEGER REFERENCES parties(id),
  visible_from TEXT NOT NULL DEFAULT (date('now')),
  visible_until TEXT,
  audience TEXT NOT NULL DEFAULT 'members'
    CHECK(audience IN ('public', 'members', 'board')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_org
  ON announcements(organization_id);
