import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { ContactInfo, Fee, ProjectType } from '../types';
import type { Db } from '../db';

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
    {
      description: 'Compliance Deposit (Construction)',
      amount: 3500,
      due_at: 'final_plan_approval',
      paid: null,
    },
    {
      description: 'Compliance Deposit (Re-vegetation)',
      amount: 2500,
      due_at: 'final_plan_approval',
      paid: null,
    },
    {
      description: 'Contractor Deposit',
      amount: 5000,
      due_at: 'construction_start',
      paid: null,
    },
  ],
  major_remodel: [
    { description: 'EMACC Review Fee', amount: 1000, due_at: 'preliminary_review', paid: null },
    {
      description: 'Compliance Deposit',
      amount: 2000,
      due_at: 'final_plan_approval',
      paid: null,
    },
    {
      description: 'Contractor Deposit',
      amount: 2000,
      due_at: 'construction_start',
      paid: null,
    },
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

export async function createProject(
  input: CreateProjectInput,
  db: Db
): Promise<{ id: string } | string> {
  try {
    const id = generateId(db);

    db.prepare(
      `INSERT INTO projects (
        id, organization_id, lot, address, type, status, submitted,
        owner_name, owner_email, owner_phone, owner_lot_address, owner_mailing_address,
        designer_name, designer_email, designer_phone, designer_company,
        contractor_name, contractor_email, contractor_phone, contractor_company
      ) VALUES (?, 'emhoa', ?, ?, ?, 'inquiry', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.lot,
      input.address,
      input.type,
      new Date().toISOString().split('T')[0],
      input.owner.name,
      input.owner.email ?? null,
      input.owner.phone ?? null,
      input.owner.lot_address ?? null,
      input.owner.mailing_address ?? null,
      input.designer?.name ?? null,
      input.designer?.email ?? null,
      input.designer?.phone ?? null,
      input.designer?.company ?? null,
      input.contractor?.name ?? null,
      input.contractor?.email ?? null,
      input.contractor?.phone ?? null,
      input.contractor?.company ?? null
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
