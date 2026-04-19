import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db, ProjectRow } from '../db';

export const getDeadlinesTool: Tool = {
  name: 'get_deadlines',
  description:
    'Get upcoming deadlines for HOA projects. Computes deadlines from project dates using ACC rules: ' +
    'final review window (90 days from preliminary approval), ' +
    'construction start deadline (90 days from final approval), ' +
    'winter erosion control (Oct 31 for active construction), ' +
    'earthwork blackout (Nov 1 – Apr 1), ' +
    'compliance deposit refund window (60 days after owner notification of completion).',
  input_schema: {
    type: 'object' as const,
    properties: {
      days_ahead: {
        type: 'number',
        description: 'How many days into the future to look (default 30)',
      },
      project_id: {
        type: 'string',
        description: 'Filter to a single project by ID (optional)',
      },
    },
  },
};

export interface GetDeadlinesInput {
  days_ahead?: number;
  project_id?: string;
}

export interface Deadline {
  project_id: string;
  lot: number;
  owner: string;
  type: string;
  date: string;
  days_remaining: number;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getDeadlines(
  input: GetDeadlinesInput,
  db: Db,
  orgId: string
): Promise<Deadline[]> {
  const daysAhead = input.days_ahead ?? 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = addDays(today, daysAhead);

  interface DeadlineRow {
    id: string;
    lot_number: number;
    owner_name: string | null;
    status: string;
    preliminary_approved_at: string | null;
    final_approved_at: string | null;
    construction_started_at: string | null;
    owner_notified_complete_at: string | null;
  }

  let sql = `
    SELECT p.id, l.lot_number, op.name as owner_name, p.status,
           p.preliminary_approved_at, p.final_approved_at,
           p.construction_started_at, p.owner_notified_complete_at
    FROM projects p
    JOIN lots l ON l.id = p.lot_id
    LEFT JOIN parties op ON op.id = p.owner_party_id
    WHERE p.organization_id = ?`;
  const params: unknown[] = [orgId];
  if (input.project_id) {
    sql += ' AND p.id = ?';
    params.push(input.project_id);
  }

  const projects = db.prepare(sql).all(...params) as DeadlineRow[];
  const deadlines: Deadline[] = [];

  function maybeAdd(
    project: DeadlineRow,
    type: string,
    deadline: Date
  ): void {
    if (deadline >= today && deadline <= cutoff) {
      deadlines.push({
        project_id: project.id,
        lot: project.lot_number,
        owner: project.owner_name ?? 'Unknown',
        type,
        date: formatDate(deadline),
        days_remaining: daysBetween(today, deadline),
      });
    }
  }

  for (const p of projects) {
    if (p.preliminary_approved_at) {
      maybeAdd(p, 'Final Review Deadline', addDays(new Date(p.preliminary_approved_at), 90));
    }

    if (p.final_approved_at && (p.status === 'approved' || p.status === 'under_construction')) {
      maybeAdd(
        p,
        'Construction Start Deadline',
        addDays(new Date(p.final_approved_at), 90)
      );
    }

    if (p.status === 'under_construction') {
      const year = today.getFullYear();
      maybeAdd(p, 'Winter Erosion Control Due', new Date(year, 9, 31));

      // Earthwork blackout starts Nov 1
      const blackoutStart = new Date(year, 10, 1);
      maybeAdd(p, 'Earthwork Blackout Starts', blackoutStart);
    }

    if (p.owner_notified_complete_at) {
      maybeAdd(
        p,
        'Compliance Deposit Refund Window Closes',
        addDays(new Date(p.owner_notified_complete_at), 60)
      );
    }
  }

  return deadlines.sort((a, b) => a.date.localeCompare(b.date));
}
