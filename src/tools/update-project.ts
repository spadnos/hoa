import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project } from '../types';
import type { Db } from '../db';

export const updateProjectTool: Tool = {
  name: 'update_project',
  description:
    'Update fields on an existing project. Use this to change status, mark fees as paid, update notes, or update contact information. ' +
    'Pass the full fees array when updating fee records. ' +
    'Contact fields are nested objects: owner (name, email, phone, lot_address, mailing_address), ' +
    'designer (name, company, email, phone), contractor (name, company, email, phone). ' +
    'To add or update a designer or contractor, pass the full contact object in the fields. ' +
    'Deadline date fields (preliminary_approved_at, final_approved_at, construction_started_at, owner_notified_complete_at) are ISO date strings.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      fields: {
        type: 'object',
        description:
          'Object containing fields to update. Any top-level Project field may be included. To mark a fee paid, pass the full updated fees array.',
      },
    },
    required: ['id', 'fields'],
  },
};

export interface UpdateProjectInput {
  id: string;
  fields: Partial<Omit<Project, 'id'>>;
}

export async function updateProject(
  input: UpdateProjectInput,
  db: Db
): Promise<{ id: string } | string> {
  const existing = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND organization_id = 'emhoa'`)
    .get(input.id);
  if (!existing) return `Project ${input.id} not found`;

  const { fees, owner, designer, contractor, ...rest } = input.fields;

  const cols: Record<string, unknown> = {};

  const SCALAR_FIELDS = [
    'status',
    'notes',
    'address',
    'submitted',
    'type',
    'preliminary_approved_at',
    'final_approved_at',
    'construction_started_at',
    'owner_notified_complete_at',
  ] as const;

  for (const key of SCALAR_FIELDS) {
    if (key in rest && rest[key] !== undefined) {
      cols[key] = rest[key];
    }
  }

  if (owner) {
    if (owner.name !== undefined) cols['owner_name'] = owner.name;
    if (owner.email !== undefined) cols['owner_email'] = owner.email;
    if (owner.phone !== undefined) cols['owner_phone'] = owner.phone;
    if (owner.lot_address !== undefined) cols['owner_lot_address'] = owner.lot_address;
    if (owner.mailing_address !== undefined) cols['owner_mailing_address'] = owner.mailing_address;
  }

  if (designer !== undefined) {
    if (designer === null) {
      cols['designer_name'] = null;
      cols['designer_email'] = null;
      cols['designer_phone'] = null;
      cols['designer_company'] = null;
    } else {
      if (designer.name !== undefined) cols['designer_name'] = designer.name;
      if (designer.email !== undefined) cols['designer_email'] = designer.email;
      if (designer.phone !== undefined) cols['designer_phone'] = designer.phone;
      if (designer.company !== undefined) cols['designer_company'] = designer.company;
    }
  }

  if (contractor !== undefined) {
    if (contractor === null) {
      cols['contractor_name'] = null;
      cols['contractor_email'] = null;
      cols['contractor_phone'] = null;
      cols['contractor_company'] = null;
    } else {
      if (contractor.name !== undefined) cols['contractor_name'] = contractor.name;
      if (contractor.email !== undefined) cols['contractor_email'] = contractor.email;
      if (contractor.phone !== undefined) cols['contractor_phone'] = contractor.phone;
      if (contractor.company !== undefined) cols['contractor_company'] = contractor.company;
    }
  }

  if (Object.keys(cols).length > 0) {
    const setClauses = Object.keys(cols)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(cols), new Date().toISOString(), input.id];
    db.prepare(`UPDATE projects SET ${setClauses}, updated_at = ? WHERE id = ?`).run(...values);
  }

  if (fees) {
    db.prepare(`DELETE FROM fees WHERE project_id = ?`).run(input.id);
    const ins = db.prepare(
      `INSERT INTO fees (project_id, organization_id, description, amount, due_at, paid_at)
       VALUES (?, 'emhoa', ?, ?, ?, ?)`
    );
    for (const f of fees) {
      ins.run(input.id, f.description, f.amount, f.due_at, f.paid ?? null);
    }
  }

  return { id: input.id };
}
