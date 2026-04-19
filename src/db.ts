import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const ORG_ID = process.env.EMHOA_ORG_ID ?? 'emhoa';

export type Db = Database.Database;

const MIGRATIONS = [
  { version: 1, file: '001_initial.sql' },
  { version: 2, file: '002_deadline_dates.sql' },
  { version: 3, file: '003_conditions.sql' },
  { version: 4, file: '004_inspections.sql' },
  { version: 5, file: '005_project_documents.sql' },
  { version: 6, file: '006_members.sql' },
  { version: 7, file: '007_directory_schema.sql' },
  { version: 9, file: '009_project_contacts.sql' },
  { version: 10, file: '010_groups_table.sql' },
  { version: 13, file: '013_announcements.sql' },
  { version: 14, file: '014_chat_sessions.sql' },
  { version: 15, file: '015_group_membership_sort_order.sql' },
  { version: 16, file: '016_library_documents.sql' },
];

export function createDb(dbPath: string): Db {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function runMigrations(db: Db): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER PRIMARY KEY)`);

  const applied = new Set(
    (db.prepare('SELECT version FROM _schema_version').all() as { version: number }[]).map(
      (r) => r.version
    )
  );

  const migrationsDir = path.join(process.cwd(), 'src', 'migrations');

  for (const { version, file } of MIGRATIONS) {
    if (!applied.has(version)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const needsFkOff = sql.trimStart().startsWith('-- requires-fk-off');
      if (needsFkOff) db.pragma('foreign_keys = OFF');
      try {
        db.exec(sql);
        db.prepare('INSERT INTO _schema_version (version) VALUES (?)').run(version);
      } finally {
        if (needsFkOff) db.pragma('foreign_keys = ON');
      }
    }
  }
}

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) {
    _db = createDb(process.env.DB_PATH ?? path.join(process.cwd(), 'emhoa.db'));
  }
  return _db;
}

export interface ProjectRow {
  id: string;
  organization_id: string;
  lot_id: number;
  lot_address_id: number | null;
  type: string;
  status: string;
  submitted: string;
  notes: string | null;
  owner_party_id: number | null;
  designer_party_id: number | null;
  contractor_party_id: number | null;
  // Joined from lots, lot_addresses, parties:
  lot_number: number;
  lot_address: string | null;
  lot_address_unit: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_mailing_address: string | null;
  designer_name: string | null;
  designer_email: string | null;
  designer_phone: string | null;
  designer_notes: string | null;
  contractor_name: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  contractor_notes: string | null;
  preliminary_approved_at: string | null;
  final_approved_at: string | null;
  construction_started_at: string | null;
  owner_notified_complete_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeRow {
  description: string;
  amount: number;
  due_at: string;
  paid_at: string | null;
}
