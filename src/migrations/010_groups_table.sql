CREATE TABLE IF NOT EXISTS groups (
  name            TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  label           TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, organization_id)
);

-- Seed well-known groups
INSERT OR IGNORE INTO groups (name, organization_id, label, sort_order) VALUES
  ('board',      'emhoa', 'Board',         1),
  ('acc',        'emhoa', 'ACC Committee', 2),
  ('management', 'emhoa', 'Management',    3),
  ('utility',    'emhoa', 'Utility',       4),
  ('vendor',     'emhoa', 'Vendor',        5);

-- Backfill any other groups already present in memberships
INSERT OR IGNORE INTO groups (name, organization_id, label)
SELECT DISTINCT gm.group_name, p.organization_id, gm.group_name
FROM group_memberships gm
JOIN parties p ON p.id = gm.party_id
WHERE gm.group_name NOT IN ('board', 'acc', 'management', 'utility', 'vendor');
