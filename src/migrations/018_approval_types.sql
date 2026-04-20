CREATE TABLE IF NOT EXISTS approval_types (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id        TEXT NOT NULL REFERENCES organizations(id),
  name                   TEXT NOT NULL,
  label                  TEXT NOT NULL,
  description            TEXT,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  is_required_by_default INTEGER NOT NULL DEFAULT 0 CHECK(is_required_by_default IN (0,1)),
  is_warning_indicator   INTEGER NOT NULL DEFAULT 0 CHECK(is_warning_indicator IN (0,1)),
  is_active              INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_approval_types_org
  ON approval_types(organization_id, is_active);

CREATE TABLE IF NOT EXISTS project_approvals (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id       TEXT NOT NULL REFERENCES projects(id),
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  approval_type_id INTEGER NOT NULL REFERENCES approval_types(id),
  status           TEXT CHECK(status IN ('pending','approved','not_required','issued','rejected')),
  notes            TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, approval_type_id)
);

CREATE INDEX IF NOT EXISTS idx_project_approvals_project
  ON project_approvals(project_id);

INSERT OR IGNORE INTO approval_types
  (organization_id, name, label, description, sort_order, is_required_by_default, is_warning_indicator)
VALUES
  ('emhoa', 'tctac',         'TC-TAC Approval',            'Tahoe Central TC-TAC review',           1, 0, 1),
  ('emhoa', 'usfs_color',    'USFS Color Approval',        'US Forest Service color sign-off',      2, 0, 1),
  ('emhoa', 'alpine_permit', 'Alpine County Building Permit', 'Alpine County building permit issued', 3, 0, 0);
