-- requires-fk-off

BEGIN;

-- Step 1: Create new directory tables

CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL CHECK(type IN ('person', 'organization')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS party_orgs (
  party_id INTEGER PRIMARY KEY REFERENCES parties(id) ON DELETE CASCADE,
  org_type TEXT NOT NULL CHECK(org_type IN ('management', 'utility', 'vendor', 'government', 'other')),
  website TEXT
);

CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  lot_number INTEGER NOT NULL,
  notes TEXT,
  UNIQUE(organization_id, lot_number)
);

CREATE TABLE IF NOT EXISTS lot_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  unit TEXT
);

CREATE TABLE IF NOT EXISTS lot_associations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id INTEGER NOT NULL REFERENCES lots(id),
  lot_address_id INTEGER REFERENCES lot_addresses(id),
  party_id INTEGER NOT NULL REFERENCES parties(id),
  role TEXT NOT NULL CHECK(role IN ('owner', 'resident', 'trustee', 'corporate_owner')),
  is_primary_contact INTEGER NOT NULL DEFAULT 0,
  mailing_address TEXT,
  start_date TEXT,
  end_date TEXT
);

CREATE TABLE IF NOT EXISTS group_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER NOT NULL REFERENCES parties(id),
  group_name TEXT NOT NULL,
  title TEXT,
  start_date TEXT,
  end_date TEXT
);

CREATE TABLE IF NOT EXISTS party_affiliations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_party_id INTEGER NOT NULL REFERENCES parties(id),
  org_party_id INTEGER NOT NULL REFERENCES parties(id),
  title TEXT
);

-- Step 2: Migrate members → lots + parties + lot_associations

INSERT OR IGNORE INTO lots (organization_id, lot_number)
SELECT DISTINCT organization_id, lot FROM members;

INSERT INTO parties (organization_id, type, name, email, phone, notes, created_at)
SELECT organization_id, 'person', name, email, phone, notes, created_at
FROM members;

INSERT INTO lot_associations (lot_id, party_id, role, is_primary_contact, mailing_address)
SELECT
  l.id,
  p.id,
  CASE WHEN m.role = 'legal_owner' THEN 'owner' ELSE 'resident' END,
  m.is_primary_contact,
  m.mailing_address
FROM members m
JOIN lots l ON l.organization_id = m.organization_id AND l.lot_number = m.lot
JOIN parties p ON p.organization_id = m.organization_id
  AND p.name = m.name
  AND (p.email = m.email OR (p.email IS NULL AND m.email IS NULL))
  AND p.type = 'person';

-- Step 3: Migrate contacts → parties + group_memberships (deduplicate by email)

INSERT INTO parties (organization_id, type, name, email, phone, notes, created_at)
SELECT c.organization_id, 'person', c.name, c.email, c.phone, NULL, c.created_at
FROM contacts c
WHERE c.email IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM parties p
     WHERE p.organization_id = c.organization_id
       AND p.email = c.email
       AND p.type = 'person'
   );

INSERT INTO group_memberships (party_id, group_name, title)
SELECT
  p.id,
  CASE WHEN c.group_name = 'acc_member' THEN 'acc' ELSE 'board' END,
  c.role
FROM contacts c
JOIN parties p ON p.organization_id = c.organization_id
  AND p.name = c.name
  AND (p.email = c.email OR (p.email IS NULL AND c.email IS NULL))
  AND p.type = 'person';

-- Step 4: Create lots for project lots not yet in the lots table

INSERT OR IGNORE INTO lots (organization_id, lot_number)
SELECT DISTINCT organization_id, lot FROM projects;

-- Step 5: Create lot_addresses from project addresses

INSERT INTO lot_addresses (lot_id, address)
SELECT DISTINCT l.id, pr.address
FROM projects pr
JOIN lots l ON l.organization_id = pr.organization_id AND l.lot_number = pr.lot;

-- Step 6: Create parties for project designers (if not already a party by name+email)

INSERT INTO parties (organization_id, type, name, email, phone, notes)
SELECT DISTINCT pr.organization_id, 'person', pr.designer_name, pr.designer_email, pr.designer_phone,
  CASE WHEN pr.designer_company IS NOT NULL THEN 'Company: ' || pr.designer_company ELSE NULL END
FROM projects pr
WHERE pr.designer_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM parties pp
    WHERE pp.organization_id = pr.organization_id
      AND pp.name = pr.designer_name
      AND pp.type = 'person'
      AND (pp.email = pr.designer_email OR (pp.email IS NULL AND pr.designer_email IS NULL))
  );

-- Step 7: Create parties for project contractors

INSERT INTO parties (organization_id, type, name, email, phone, notes)
SELECT DISTINCT pr.organization_id, 'person', pr.contractor_name, pr.contractor_email, pr.contractor_phone,
  CASE WHEN pr.contractor_company IS NOT NULL THEN 'Company: ' || pr.contractor_company ELSE NULL END
FROM projects pr
WHERE pr.contractor_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM parties pp
    WHERE pp.organization_id = pr.organization_id
      AND pp.name = pr.contractor_name
      AND pp.type = 'person'
      AND (pp.email = pr.contractor_email OR (pp.email IS NULL AND pr.contractor_email IS NULL))
  );

-- Step 8: Recreate projects table with normalized schema

DROP TABLE IF EXISTS projects_new;
CREATE TABLE projects_new (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  lot_id INTEGER NOT NULL REFERENCES lots(id),
  lot_address_id INTEGER REFERENCES lot_addresses(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inquiry',
  submitted TEXT NOT NULL,
  notes TEXT,
  owner_party_id INTEGER REFERENCES parties(id),
  designer_party_id INTEGER REFERENCES parties(id),
  contractor_party_id INTEGER REFERENCES parties(id),
  preliminary_approved_at TEXT,
  final_approved_at TEXT,
  construction_started_at TEXT,
  owner_notified_complete_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO projects_new (
  id, organization_id, lot_id, lot_address_id, type, status, submitted, notes,
  owner_party_id, designer_party_id, contractor_party_id,
  preliminary_approved_at, final_approved_at, construction_started_at, owner_notified_complete_at,
  created_at, updated_at
)
SELECT
  pr.id,
  pr.organization_id,
  l.id AS lot_id,
  la_addr.id AS lot_address_id,
  pr.type,
  pr.status,
  pr.submitted,
  pr.notes,
  COALESCE(
    (SELECT p2.id FROM parties p2
     JOIN lot_associations la2 ON la2.party_id = p2.id
     JOIN lots l2 ON l2.id = la2.lot_id
     WHERE p2.organization_id = pr.organization_id
       AND p2.email = pr.owner_email
       AND l2.lot_number = pr.lot
       AND p2.type = 'person'
     LIMIT 1),
    (SELECT p2.id FROM parties p2
     JOIN lot_associations la2 ON la2.party_id = p2.id
     JOIN lots l2 ON l2.id = la2.lot_id
     WHERE p2.organization_id = pr.organization_id
       AND p2.name = pr.owner_name
       AND l2.lot_number = pr.lot
       AND p2.type = 'person'
     LIMIT 1)
  ) AS owner_party_id,
  (SELECT p2.id FROM parties p2
   WHERE p2.organization_id = pr.organization_id
     AND p2.name = pr.designer_name
     AND (p2.email = pr.designer_email OR (p2.email IS NULL AND pr.designer_email IS NULL))
     AND p2.type = 'person'
   LIMIT 1) AS designer_party_id,
  (SELECT p2.id FROM parties p2
   WHERE p2.organization_id = pr.organization_id
     AND p2.name = pr.contractor_name
     AND (p2.email = pr.contractor_email OR (p2.email IS NULL AND pr.contractor_email IS NULL))
     AND p2.type = 'person'
   LIMIT 1) AS contractor_party_id,
  pr.preliminary_approved_at,
  pr.final_approved_at,
  pr.construction_started_at,
  pr.owner_notified_complete_at,
  pr.created_at,
  pr.updated_at
FROM projects pr
JOIN lots l ON l.organization_id = pr.organization_id AND l.lot_number = pr.lot
LEFT JOIN lot_addresses la_addr ON la_addr.lot_id = l.id AND la_addr.address = pr.address;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

-- Step 9: Drop old tables
DROP TABLE members;
DROP TABLE contacts;

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS idx_parties_org ON parties(organization_id);
CREATE INDEX IF NOT EXISTS idx_lots_org ON lots(organization_id);
CREATE INDEX IF NOT EXISTS idx_lot_addresses_lot ON lot_addresses(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_associations_lot ON lot_associations(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_associations_party ON lot_associations(party_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_party ON group_memberships(party_id);
CREATE INDEX IF NOT EXISTS idx_party_affiliations_person ON party_affiliations(person_party_id);
CREATE INDEX IF NOT EXISTS idx_party_affiliations_org ON party_affiliations(org_party_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_lot ON projects(lot_id);

COMMIT;
