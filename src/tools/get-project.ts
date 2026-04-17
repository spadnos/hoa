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

const PROJECT_JOIN_SQL = `
  SELECT
    p.*,
    l.lot_number,
    la_addr.address as lot_address,
    la_addr.unit as lot_address_unit,
    op.name as owner_name, op.email as owner_email, op.phone as owner_phone,
    la_assoc.mailing_address as owner_mailing_address,
    dp.name as designer_name, dp.email as designer_email, dp.phone as designer_phone, dp.notes as designer_notes,
    cp.name as contractor_name, cp.email as contractor_email, cp.phone as contractor_phone, cp.notes as contractor_notes
  FROM projects p
  JOIN lots l ON l.id = p.lot_id
  LEFT JOIN lot_addresses la_addr ON la_addr.id = p.lot_address_id
  LEFT JOIN parties op ON op.id = p.owner_party_id
  LEFT JOIN lot_associations la_assoc ON la_assoc.party_id = p.owner_party_id
    AND la_assoc.lot_id = p.lot_id AND la_assoc.end_date IS NULL
  LEFT JOIN parties dp ON dp.id = p.designer_party_id
  LEFT JOIN parties cp ON cp.id = p.contractor_party_id
`;

export function rowToProject(row: ProjectRow, fees: FeeRow[]): Project {
  const owner: ContactInfo = { name: row.owner_name ?? 'Unknown' };
  if (row.owner_email) owner.email = row.owner_email;
  if (row.owner_phone) owner.phone = row.owner_phone;
  if (row.lot_address) owner.lot_address = row.lot_address;
  if (row.owner_mailing_address) owner.mailing_address = row.owner_mailing_address;

  const project: Project = {
    id: row.id,
    lot: row.lot_number,
    address: row.lot_address ?? '',
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
    if (row.designer_notes) designer.company = row.designer_notes.replace(/^Company: /, '');
    project.designer = designer;
  }

  if (row.contractor_name) {
    const contractor: ContactInfo = { name: row.contractor_name };
    if (row.contractor_email) contractor.email = row.contractor_email;
    if (row.contractor_phone) contractor.phone = row.contractor_phone;
    if (row.contractor_notes) contractor.company = row.contractor_notes.replace(/^Company: /, '');
    project.contractor = contractor;
  }

  return project;
}

export async function getProject(
  input: GetProjectInput,
  db: Db
): Promise<Project | string> {
  const row = db
    .prepare(`${PROJECT_JOIN_SQL} WHERE p.id = ? AND p.organization_id = 'emhoa'`)
    .get(input.id) as ProjectRow | undefined;

  if (!row) return `Project ${input.id} not found`;

  const fees = db
    .prepare(`SELECT description, amount, due_at, paid_at FROM fees WHERE project_id = ? ORDER BY id`)
    .all(input.id) as FeeRow[];

  return rowToProject(row, fees);
}

export { PROJECT_JOIN_SQL };
