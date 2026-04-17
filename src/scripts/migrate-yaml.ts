import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createDb } from '../db';
import type { Db } from '../db';
import type { Project, HoaMembers, HoaContact } from '../types';

const PROJECT_DIR = path.join(process.cwd(), 'projects');
const CONTACTS_FILE = path.join(process.cwd(), 'contacts', 'hoa-members.md');
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'emhoa.db');

function migrateProjects(db: Db): number {
  if (!fs.existsSync(PROJECT_DIR)) {
    console.log('No projects directory found, skipping project migration.');
    return 0;
  }

  const entries = fs.readdirSync(PROJECT_DIR, { withFileTypes: true });
  let count = 0;
  let errors = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const statusPath = path.join(PROJECT_DIR, entry.name, 'status.md');
    if (!fs.existsSync(statusPath)) continue;

    try {
      const { data } = matter(fs.readFileSync(statusPath, 'utf-8'));
      const p = data as Project & { owner: { name?: string } | string };

      const ownerName =
        typeof p.owner === 'string' ? p.owner : p.owner?.name ?? 'Unknown';
      const ownerObj = typeof p.owner === 'object' && p.owner !== null ? p.owner : {};

      db.prepare(
        `INSERT OR IGNORE INTO projects (
          id, organization_id, lot, address, type, status, submitted,
          owner_name, owner_email, owner_phone, owner_lot_address, owner_mailing_address,
          designer_name, designer_email, designer_phone, designer_company,
          contractor_name, contractor_email, contractor_phone, contractor_company,
          notes
        ) VALUES (?, 'emhoa', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        String(p.id),
        Number(p.lot),
        String(p.address ?? ''),
        String(p.type ?? 'new_residence'),
        String(p.status ?? 'inquiry'),
        String(p.submitted ?? new Date().toISOString().split('T')[0]),
        ownerName,
        (ownerObj as { email?: string }).email ?? null,
        (ownerObj as { phone?: string }).phone ?? null,
        (ownerObj as { lot_address?: string }).lot_address ?? null,
        (ownerObj as { mailing_address?: string }).mailing_address ?? null,
        p.designer?.name ?? null,
        p.designer?.email ?? null,
        p.designer?.phone ?? null,
        p.designer?.company ?? null,
        p.contractor?.name ?? null,
        p.contractor?.email ?? null,
        p.contractor?.phone ?? null,
        p.contractor?.company ?? null,
        p.notes ?? null
      );

      const fees: Array<{ description: string; amount: number; due_at: string; paid: string | null }> =
        Array.isArray(p.fees) ? p.fees : [];

      const insFee = db.prepare(
        `INSERT OR IGNORE INTO fees (project_id, organization_id, description, amount, due_at, paid_at)
         VALUES (?, 'emhoa', ?, ?, ?, ?)`
      );

      for (const fee of fees) {
        insFee.run(String(p.id), fee.description, fee.amount, fee.due_at, fee.paid ?? null);
      }

      count++;
    } catch (err) {
      console.error(`  ERROR processing ${entry.name}: ${String(err)}`);
      errors++;
    }
  }

  console.log(`Projects migrated: ${count} (${errors} errors)`);
  return count;
}

function migrateContacts(db: Db): number {
  if (!fs.existsSync(CONTACTS_FILE)) {
    console.log('No contacts file found, skipping contact migration.');
    return 0;
  }

  const { data } = matter(fs.readFileSync(CONTACTS_FILE, 'utf-8'));
  const members = data as HoaMembers;

  const ins = db.prepare(
    `INSERT OR IGNORE INTO contacts (organization_id, name, role, group_name, email, phone)
     VALUES ('emhoa', ?, ?, ?, ?, ?)`
  );

  let count = 0;

  for (const c of members.acc_members ?? []) {
    const contact = c as HoaContact;
    ins.run(contact.name, contact.role, 'acc_member', contact.email ?? null, contact.phone ?? null);
    count++;
  }

  for (const c of members.board_members ?? []) {
    const contact = c as HoaContact;
    ins.run(contact.name, contact.role, 'board_member', contact.email ?? null, contact.phone ?? null);
    count++;
  }

  console.log(`Contacts migrated: ${count}`);
  return count;
}

function main(): void {
  console.log(`Migrating YAML data to SQLite: ${DB_PATH}`);

  const db = createDb(DB_PATH);

  const projectCount = migrateProjects(db);
  const contactCount = migrateContacts(db);

  const dbProjects = (
    db.prepare(`SELECT COUNT(*) as n FROM projects WHERE organization_id = 'emhoa'`).get() as {
      n: number;
    }
  ).n;
  const dbContacts = (
    db.prepare(`SELECT COUNT(*) as n FROM contacts WHERE organization_id = 'emhoa'`).get() as {
      n: number;
    }
  ).n;

  console.log(`\nVerification:`);
  console.log(`  Projects in DB: ${dbProjects} (migrated this run: ${projectCount})`);
  console.log(`  Contacts in DB: ${dbContacts} (migrated this run: ${contactCount})`);
  console.log('Done.');
}

main();
