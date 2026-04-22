import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDb } from '../src/db';
import type { Db } from '../src/db';
import { Project, ProjectType, ProjectStatus, Fee, ContactInfo } from '../src/types';

type FeeInput = Pick<Fee, 'description' | 'amount' | 'due_at' | 'paid'>;

export function makeTestDb(): Db {
  return createDb(':memory:');
}

type ProjectOverrides = Omit<Partial<Project>, 'fees'> & { fees?: FeeInput[] };

export function seedTestProject(db: Db, overrides: ProjectOverrides = {}): void {
  const project = {
    id: '2026-001',
    lot: 42,
    owner: { name: 'Test Owner' } as ContactInfo,
    address: '42 Test Lane',
    type: 'new_residence' as ProjectType,
    status: 'preliminary_review' as ProjectStatus,
    submitted: '2026-01-01',
    fees: [] as FeeInput[],
    ...overrides,
  };

  const owner = project.owner as ContactInfo;

  const existingLot = db
    .prepare(`SELECT id FROM lots WHERE organization_id = 'emhoa' AND lot_number = ?`)
    .get(project.lot) as { id: number } | undefined;

  let lotId: number;
  if (existingLot) {
    lotId = existingLot.id;
  } else {
    const r = db
      .prepare(`INSERT INTO lots (organization_id, lot_number) VALUES ('emhoa', ?)`)
      .run(project.lot);
    lotId = r.lastInsertRowid as number;
  }

  const addrResult = db
    .prepare(`INSERT INTO lot_addresses (lot_id, address) VALUES (?, ?)`)
    .run(lotId, project.address);
  const lotAddressId = addrResult.lastInsertRowid as number;

  const partyResult = db
    .prepare(
      `INSERT INTO parties (organization_id, type, name, email, phone) VALUES ('emhoa', 'person', ?, ?, ?)`
    )
    .run(owner.name, owner.email ?? null, owner.phone ?? null);
  const ownerPartyId = partyResult.lastInsertRowid as number;

  db.prepare(
    `INSERT INTO projects (
      id, organization_id, lot_id, lot_address_id, type, status, submitted,
      notes, owner_party_id,
      preliminary_approved_at, final_approved_at,
      construction_started_at, owner_notified_complete_at
    ) VALUES (?, 'emhoa', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    project.id,
    lotId,
    lotAddressId,
    project.type,
    project.status,
    project.submitted,
    project.notes ?? null,
    ownerPartyId,
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
  const partyResult = db
    .prepare(
      `INSERT INTO parties (organization_id, type, name, email, phone)
       VALUES ('emhoa', 'person', ?, ?, ?)`
    )
    .run(opts.name, opts.email ?? null, opts.phone ?? null);

  const partyId = partyResult.lastInsertRowid as number;
  const groupName = opts.group_name === 'acc_member' ? 'acc' : 'board';

  db.prepare(
    `INSERT INTO group_memberships (party_id, group_name, title) VALUES (?, ?, ?)`
  ).run(partyId, groupName, opts.role);
}

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'emhoa-test-'));
}

export function makeTestDocument(documentsDir: string, filename: string, content: string): void {
  fs.mkdirSync(documentsDir, { recursive: true });
  fs.writeFileSync(path.join(documentsDir, filename), content);
}
