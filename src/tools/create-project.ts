import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { ContactInfo, Fee, ProjectType } from '../types';
import type { Db } from '../db';
import { getOrCreateParty } from './manage-parties';

export const createProjectTool: Tool = {
  name: 'create_project',
  description:
    'Create a new HOA project. Records the project in the database and pre-populates standard fees for the project type.',
  input_schema: {
    type: 'object' as const,
    properties: {
      lot: { type: 'number', description: 'Lot number' },
      owner: {
        type: 'object',
        description: 'Owner contact information',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          lot_address: { type: 'string', description: 'Physical address of the lot' },
          mailing_address: {
            type: 'string',
            description: 'Owner mailing/billing address if different from lot',
          },
        },
        required: ['name'],
      },
      address: {
        type: 'string',
        description: 'Property address (lot location, used for display)',
      },
      type: {
        type: 'string',
        enum: ['new_residence', 'minor_remodel', 'major_remodel', 'landscaping'],
        description: 'Project type',
      },
      description: {
        type: 'string',
        description:
          'Short description used to label the project (e.g. "new-house", "deck-addition")',
      },
      designer: {
        type: 'object',
        description: 'Designer contact information (optional)',
        properties: {
          name: { type: 'string' },
          company: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name'],
      },
      contractor: {
        type: 'object',
        description: 'Contractor contact information (optional)',
        properties: {
          name: { type: 'string' },
          company: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name'],
      },
    },
    required: ['lot', 'owner', 'address', 'type', 'description'],
  },
};

export interface CreateProjectInput {
  lot: number;
  owner: ContactInfo;
  address: string;
  type: ProjectType;
  description: string;
  designer?: ContactInfo;
  contractor?: ContactInfo;
}

const DEFAULT_FEES: Record<ProjectType, Fee[]> = {
  new_residence: [
    { description: 'EMACC Review Fee', amount: 2000, due_at: 'preliminary_review', paid: null },
    { description: 'Compliance Deposit (Construction)', amount: 3500, due_at: 'final_plan_approval', paid: null },
    { description: 'Compliance Deposit (Re-vegetation)', amount: 2500, due_at: 'final_plan_approval', paid: null },
    { description: 'Contractor Deposit', amount: 5000, due_at: 'construction_start', paid: null },
  ],
  major_remodel: [
    { description: 'EMACC Review Fee', amount: 1000, due_at: 'preliminary_review', paid: null },
    { description: 'Compliance Deposit', amount: 2000, due_at: 'final_plan_approval', paid: null },
    { description: 'Contractor Deposit', amount: 2000, due_at: 'construction_start', paid: null },
  ],
  minor_remodel: [
    { description: 'EMACC Review Fee', amount: 250, due_at: 'preliminary_review', paid: null },
    { description: 'Compliance Deposit', amount: 500, due_at: 'final_plan_approval', paid: null },
    { description: 'Contractor Deposit', amount: 500, due_at: 'construction_start', paid: null },
  ],
  landscaping: [
    { description: 'EMACC Review Fee', amount: 200, due_at: 'preliminary_review', paid: null },
  ],
};

function generateId(db: Db): string {
  const year = new Date().getFullYear();
  const row = db
    .prepare(`SELECT id FROM projects WHERE id LIKE ? ORDER BY id DESC LIMIT 1`)
    .get(`${year}-%`) as { id: string } | undefined;

  if (!row) return `${year}-001`;
  const match = row.id.match(/^\d{4}-(\d{3})$/);
  if (!match) return `${year}-001`;
  const next = parseInt(match[1], 10) + 1;
  return `${year}-${String(next).padStart(3, '0')}`;
}

function getOrCreateLot(lotNumber: number, db: Db): number {
  const existing = db
    .prepare(`SELECT id FROM lots WHERE organization_id = 'emhoa' AND lot_number = ?`)
    .get(lotNumber) as { id: number } | undefined;
  if (existing) return existing.id;
  const r = db
    .prepare(`INSERT INTO lots (organization_id, lot_number) VALUES ('emhoa', ?)`)
    .run(lotNumber);
  return r.lastInsertRowid as number;
}

function getOrCreateLotAddress(lotId: number, address: string, db: Db): number {
  const existing = db
    .prepare(`SELECT id FROM lot_addresses WHERE lot_id = ? AND address = ? AND unit IS NULL`)
    .get(lotId, address) as { id: number } | undefined;
  if (existing) return existing.id;
  const r = db
    .prepare(`INSERT INTO lot_addresses (lot_id, address) VALUES (?, ?)`)
    .run(lotId, address);
  return r.lastInsertRowid as number;
}

export async function createProject(
  input: CreateProjectInput,
  db: Db
): Promise<{ id: string } | string> {
  try {
    const id = generateId(db);
    const lotId = getOrCreateLot(input.lot, db);
    const lotAddressId = getOrCreateLotAddress(lotId, input.address, db);

    const ownerNotes = input.owner.mailing_address
      ? undefined
      : undefined;
    const ownerPartyId = getOrCreateParty(
      { name: input.owner.name, email: input.owner.email, phone: input.owner.phone },
      db
    );

    let designerPartyId: number | null = null;
    if (input.designer) {
      const notes = input.designer.company ? `Company: ${input.designer.company}` : undefined;
      designerPartyId = getOrCreateParty(
        { name: input.designer.name, email: input.designer.email, phone: input.designer.phone, notes },
        db
      );
    }

    let contractorPartyId: number | null = null;
    if (input.contractor) {
      const notes = input.contractor.company ? `Company: ${input.contractor.company}` : undefined;
      contractorPartyId = getOrCreateParty(
        { name: input.contractor.name, email: input.contractor.email, phone: input.contractor.phone, notes },
        db
      );
    }

    db.prepare(
      `INSERT INTO projects (id, organization_id, lot_id, lot_address_id, type, status, submitted,
        owner_party_id, designer_party_id, contractor_party_id)
       VALUES (?, 'emhoa', ?, ?, ?, 'inquiry', ?, ?, ?, ?)`
    ).run(
      id,
      lotId,
      lotAddressId,
      input.type,
      new Date().toISOString().split('T')[0],
      ownerPartyId,
      designerPartyId,
      contractorPartyId
    );

    const insertFee = db.prepare(
      `INSERT INTO fees (project_id, organization_id, description, amount, due_at, paid_at)
       VALUES (?, 'emhoa', ?, ?, ?, NULL)`
    );
    for (const fee of DEFAULT_FEES[input.type]) {
      insertFee.run(id, fee.description, fee.amount, fee.due_at);
    }

    return { id };
  } catch (err) {
    return `Failed to create project: ${String(err)}`;
  }
}
