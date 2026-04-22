import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project, Fee } from '../types';
import type { Db } from '../db';

type FeeUpdate = Omit<Fee, 'id' | 'refunded'> & { refunded?: string | null };

export const updateProjectTool: Tool = {
  name: 'update_project',
  description:
    'Update fields on an existing project. Use this to change status, mark fees as paid, update notes, or update contact information. ' +
    'Pass the full fees array when updating fee records. ' +
    'Contact fields are nested objects: owner (name, email, phone, mailing_address), ' +
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
  fields: Partial<Omit<Project, 'id' | 'fees'>> & { fees?: FeeUpdate[] };
}

export async function updateProject(
  input: UpdateProjectInput,
  db: Db,
  orgId: string
): Promise<{ id: string } | string> {
  const existing = db
    .prepare(`SELECT id, owner_party_id, designer_party_id, contractor_party_id FROM projects WHERE id = ? AND organization_id = ?`)
    .get(input.id, orgId) as { id: string; owner_party_id: number | null; designer_party_id: number | null; contractor_party_id: number | null } | undefined;
  if (!existing) return `Project ${input.id} not found`;

  const { fees, owner, designer, contractor, ...rest } = input.fields;

  const projectCols: Record<string, unknown> = {};
  const SCALAR_FIELDS = [
    'status',
    'notes',
    'submitted',
    'type',
    'preliminary_approved_at',
    'final_approved_at',
    'construction_started_at',
    'owner_notified_complete_at',
  ] as const;

  for (const key of SCALAR_FIELDS) {
    if (key in rest && rest[key] !== undefined) {
      projectCols[key] = rest[key];
    }
  }

  if (Object.keys(projectCols).length > 0) {
    const setClauses = Object.keys(projectCols).map((k) => `${k} = ?`).join(', ');
    const values = [...Object.values(projectCols), new Date().toISOString(), input.id];
    db.prepare(`UPDATE projects SET ${setClauses}, updated_at = ? WHERE id = ?`).run(...values);
  }

  if (owner && existing.owner_party_id) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (owner.name !== undefined) { sets.push('name = ?'); vals.push(owner.name); }
    if (owner.email !== undefined) { sets.push('email = ?'); vals.push(owner.email); }
    if (owner.phone !== undefined) { sets.push('phone = ?'); vals.push(owner.phone); }
    if (sets.length > 0) {
      vals.push(existing.owner_party_id);
      db.prepare(`UPDATE parties SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    if (owner.mailing_address !== undefined) {
      db.prepare(
        `UPDATE lot_associations SET mailing_address = ?
         WHERE party_id = ? AND end_date IS NULL`
      ).run(owner.mailing_address, existing.owner_party_id);
    }
  }

  if (designer !== undefined) {
    if (designer === null) {
      db.prepare(`UPDATE projects SET designer_party_id = NULL, updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), input.id);
    } else if (existing.designer_party_id) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (designer.name !== undefined) { sets.push('name = ?'); vals.push(designer.name); }
      if (designer.email !== undefined) { sets.push('email = ?'); vals.push(designer.email); }
      if (designer.phone !== undefined) { sets.push('phone = ?'); vals.push(designer.phone); }
      if (designer.company !== undefined) { sets.push('notes = ?'); vals.push(`Company: ${designer.company}`); }
      if (sets.length > 0) {
        vals.push(existing.designer_party_id);
        db.prepare(`UPDATE parties SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      }
    }
  }

  if (contractor !== undefined) {
    if (contractor === null) {
      db.prepare(`UPDATE projects SET contractor_party_id = NULL, updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), input.id);
    } else if (existing.contractor_party_id) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (contractor.name !== undefined) { sets.push('name = ?'); vals.push(contractor.name); }
      if (contractor.email !== undefined) { sets.push('email = ?'); vals.push(contractor.email); }
      if (contractor.phone !== undefined) { sets.push('phone = ?'); vals.push(contractor.phone); }
      if (contractor.company !== undefined) { sets.push('notes = ?'); vals.push(`Company: ${contractor.company}`); }
      if (sets.length > 0) {
        vals.push(existing.contractor_party_id);
        db.prepare(`UPDATE parties SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      }
    }
  }

  if (fees) {
    db.prepare(`DELETE FROM fees WHERE project_id = ?`).run(input.id);
    const ins = db.prepare(
      `INSERT INTO fees (project_id, organization_id, description, amount, due_at, paid_at, refunded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const f of fees) {
      ins.run(input.id, orgId, f.description, f.amount, f.due_at, f.paid ?? null, f.refunded ?? null);
    }
  }

  return { id: input.id };
}
