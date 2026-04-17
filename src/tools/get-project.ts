import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project, ProjectType, ProjectStatus, ContactInfo, Fee } from '../types';
import type { Db, ProjectRow, FeeRow } from '../db';

export const getProjectTool: Tool = {
  name: 'get_project',
  description: 'Get full details for a specific project by its ID (e.g. "2026-001").',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
    },
    required: ['id'],
  },
};

export interface GetProjectInput {
  id: string;
}

export function rowToProject(row: ProjectRow, fees: FeeRow[]): Project {
  const owner: ContactInfo = { name: row.owner_name };
  if (row.owner_email) owner.email = row.owner_email;
  if (row.owner_phone) owner.phone = row.owner_phone;
  if (row.owner_lot_address) owner.lot_address = row.owner_lot_address;
  if (row.owner_mailing_address) owner.mailing_address = row.owner_mailing_address;

  const project: Project = {
    id: row.id,
    lot: row.lot,
    address: row.address,
    type: row.type as ProjectType,
    status: row.status as ProjectStatus,
    submitted: row.submitted,
    owner,
    fees: fees.map(
      (f): Fee => ({
        description: f.description,
        amount: f.amount,
        due_at: f.due_at,
        paid: f.paid_at,
      })
    ),
  };

  if (row.notes) project.notes = row.notes;
  if (row.preliminary_approved_at) project.preliminary_approved_at = row.preliminary_approved_at;
  if (row.final_approved_at) project.final_approved_at = row.final_approved_at;
  if (row.construction_started_at) project.construction_started_at = row.construction_started_at;
  if (row.owner_notified_complete_at)
    project.owner_notified_complete_at = row.owner_notified_complete_at;

  if (row.designer_name) {
    const designer: ContactInfo = { name: row.designer_name };
    if (row.designer_email) designer.email = row.designer_email;
    if (row.designer_phone) designer.phone = row.designer_phone;
    if (row.designer_company) designer.company = row.designer_company;
    project.designer = designer;
  }

  if (row.contractor_name) {
    const contractor: ContactInfo = { name: row.contractor_name };
    if (row.contractor_email) contractor.email = row.contractor_email;
    if (row.contractor_phone) contractor.phone = row.contractor_phone;
    if (row.contractor_company) contractor.company = row.contractor_company;
    project.contractor = contractor;
  }

  return project;
}

export async function getProject(
  input: GetProjectInput,
  db: Db
): Promise<Project | string> {
  const row = db
    .prepare(`SELECT * FROM projects WHERE id = ? AND organization_id = 'emhoa'`)
    .get(input.id) as ProjectRow | undefined;

  if (!row) return `Project ${input.id} not found`;

  const fees = db
    .prepare(`SELECT description, amount, due_at, paid_at FROM fees WHERE project_id = ? ORDER BY id`)
    .all(input.id) as FeeRow[];

  return rowToProject(row, fees);
}
