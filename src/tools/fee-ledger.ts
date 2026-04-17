import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';

export const getFeeLedgerTool: Tool = {
  name: 'get_fee_ledger',
  description:
    'Get outstanding (unpaid) fees across all projects. Returns total amount outstanding and a per-project breakdown with owner name and project status.',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

interface FeeLedgerRow {
  project_id: string;
  lot: number;
  owner_name: string;
  project_status: string;
  description: string;
  amount: number;
  due_at: string;
}

export interface ProjectFees {
  project_id: string;
  lot: number;
  owner: string;
  status: string;
  unpaid_fees: { description: string; amount: number; due_at: string }[];
  total: number;
}

export interface FeeLedgerResult {
  total_outstanding: number;
  projects: ProjectFees[];
}

export async function getFeeLedger(db: Db): Promise<FeeLedgerResult> {
  const rows = db
    .prepare(
      `SELECT f.description, f.amount, f.due_at,
              p.id AS project_id, p.lot, p.owner_name, p.status AS project_status
       FROM fees f
       JOIN projects p ON p.id = f.project_id
       WHERE f.organization_id = 'emhoa' AND f.paid_at IS NULL
       ORDER BY p.id, f.id`
    )
    .all() as FeeLedgerRow[];

  const byProject = new Map<string, ProjectFees>();
  let totalOutstanding = 0;

  for (const row of rows) {
    if (!byProject.has(row.project_id)) {
      byProject.set(row.project_id, {
        project_id: row.project_id,
        lot: row.lot,
        owner: row.owner_name,
        status: row.project_status,
        unpaid_fees: [],
        total: 0,
      });
    }
    const entry = byProject.get(row.project_id)!;
    entry.unpaid_fees.push({ description: row.description, amount: row.amount, due_at: row.due_at });
    entry.total += row.amount;
    totalOutstanding += row.amount;
  }

  return {
    total_outstanding: totalOutstanding,
    projects: Array.from(byProject.values()),
  };
}
