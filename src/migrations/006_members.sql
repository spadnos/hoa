CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  lot INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('legal_owner', 'resident')),
  is_primary_contact INTEGER NOT NULL DEFAULT 0,
  email TEXT,
  phone TEXT,
  mailing_address TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_lot ON members(lot);
CREATE INDEX IF NOT EXISTS idx_members_org ON members(organization_id);
