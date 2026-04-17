import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type Db = Database.Database;

const MIGRATIONS = [
  { version: 1, file: '001_initial.sql' },
  { version: 2, file: '002_deadline_dates.sql' },
  { version: 3, file: '003_conditions.sql' },
  { version: 4, file: '004_inspections.sql' },
  { version: 5, file: '005_project_documents.sql' },
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

  const migrationsDir = path.join(__dirname, 'migrations');

  for (const { version, file } of MIGRATIONS) {
    if (!applied.has(version)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO _schema_version (version) VALUES (?)').run(version);
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
  lot: number;
  address: string;
  type: string;
  status: string;
  submitted: string;
  notes: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  owner_lot_address: string | null;
  owner_mailing_address: string | null;
  designer_name: string | null;
  designer_email: string | null;
  designer_phone: string | null;
  designer_company: string | null;
  contractor_name: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  contractor_company: string | null;
  preliminary_approved_at: string | null;
  final_approved_at: string | null;
  construction_started_at: string | null;
  owner_notified_complete_at: string | null;
}

export interface FeeRow {
  description: string;
  amount: number;
  due_at: string;
  paid_at: string | null;
}
