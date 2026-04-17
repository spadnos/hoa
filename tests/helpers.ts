import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDb } from '../src/db';
import type { Db } from '../src/db';
import { Project, ProjectType, ProjectStatus, Fee, ContactInfo } from '../src/types';

export function makeTestDb(): Db {
  return createDb(':memory:');
}

export function seedTestProject(db: Db, overrides: Partial<Project> = {}): void {
  const project: Project = {
    id: '2026-001',
    lot: 42,
    owner: { name: 'Test Owner' } as ContactInfo,
    address: '42 Test Lane',
    type: 'new_residence' as ProjectType,
    status: 'preliminary_review' as ProjectStatus,
    submitted: '2026-01-01',
    fees: [] as Fee[],
    ...overrides,
  };

  const owner = project.owner as ContactInfo;

  db.prepare(
    `INSERT INTO projects (
      id, organization_id, lot, address, type, status, submitted,
      owner_name, owner_email, owner_phone, owner_lot_address, owner_mailing_address,
      designer_name, designer_email, designer_phone, designer_company,
      contractor_name, contractor_email, contractor_phone, contractor_company,
      notes,
      preliminary_approved_at, final_approved_at,
      construction_started_at, owner_notified_complete_at
    ) VALUES (?, 'emhoa', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    project.id,
    project.lot,
    project.address,
    project.type,
    project.status,
    project.submitted,
    owner.name,
    owner.email ?? null,
    owner.phone ?? null,
    owner.lot_address ?? null,
    owner.mailing_address ?? null,
    project.designer?.name ?? null,
    project.designer?.email ?? null,
    project.designer?.phone ?? null,
    project.designer?.company ?? null,
    project.contractor?.name ?? null,
    project.contractor?.email ?? null,
    project.contractor?.phone ?? null,
    project.contractor?.company ?? null,
    project.notes ?? null,
    project.preliminary_approved_at ?? null,
    project.final_approved_at ?? null,
    project.construction_started_at ?? null,
    project.owner_notified_complete_at ?? null
  );

  const ins = db.prepare(
    `INSERT INTO fees (project_id, organization_id, description, amount, due_at, paid_at)
     VALUES (?, 'emhoa', ?, ?, ?, ?)`
  );
  for (const fee of project.fees) {
    ins.run(project.id, fee.description, fee.amount, fee.due_at, fee.paid ?? null);
  }
}

export function seedTestContact(
  db: Db,
  opts: {
    name: string;
    role: string;
    group_name: 'acc_member' | 'board_member';
    email?: string;
    phone?: string;
  }
): void {
  db.prepare(
    `INSERT INTO contacts (organization_id, name, role, group_name, email, phone)
     VALUES ('emhoa', ?, ?, ?, ?, ?)`
  ).run(opts.name, opts.role, opts.group_name, opts.email ?? null, opts.phone ?? null);
}

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'emhoa-test-'));
}

export function makeTestDocument(documentsDir: string, filename: string, content: string): void {
  fs.mkdirSync(documentsDir, { recursive: true });
  fs.writeFileSync(path.join(documentsDir, filename), content);
}
