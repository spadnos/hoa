import { getDeadlines } from '../../src/tools/get-deadlines';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
});

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

test('returns empty when no projects have deadline-triggering dates', async () => {
  seedTestProject(db, { id: '2026-001', status: 'inquiry' });
  const result = await getDeadlines({}, db, 'emhoa');
  expect(result).toHaveLength(0);
});

test('detects final review deadline (90 days from preliminary approval)', async () => {
  const prelimDate = addDays(TODAY, -80); // 80 days ago → 10 days remaining
  seedTestProject(db, {
    id: '2026-001',
    status: 'preliminary_review',
    preliminary_approved_at: prelimDate,
  });

  const result = await getDeadlines({ days_ahead: 30 }, db, 'emhoa');
  const deadline = result.find((d) => d.type === 'Final Review Deadline');
  expect(deadline).toBeDefined();
  expect(deadline!.project_id).toBe('2026-001');
  expect(deadline!.days_remaining).toBe(10);
});

test('detects construction start deadline (90 days from final approval)', async () => {
  const finalDate = addDays(TODAY, -85); // 5 days remaining
  seedTestProject(db, {
    id: '2026-001',
    status: 'approved',
    final_approved_at: finalDate,
  });

  const result = await getDeadlines({ days_ahead: 30 }, db, 'emhoa');
  const deadline = result.find((d) => d.type === 'Construction Start Deadline');
  expect(deadline).toBeDefined();
  expect(deadline!.days_remaining).toBe(5);
});

test('detects compliance deposit refund window closing', async () => {
  const notifiedDate = addDays(TODAY, -55); // 5 days remaining
  seedTestProject(db, {
    id: '2026-001',
    status: 'complete',
    owner_notified_complete_at: notifiedDate,
  });

  const result = await getDeadlines({ days_ahead: 30 }, db, 'emhoa');
  const deadline = result.find((d) => d.type === 'Compliance Deposit Refund Window Closes');
  expect(deadline).toBeDefined();
  expect(deadline!.days_remaining).toBe(5);
});

test('does not return deadlines beyond days_ahead window', async () => {
  const prelimDate = addDays(TODAY, -1); // 89 days remaining → outside 30-day window
  seedTestProject(db, {
    id: '2026-001',
    status: 'preliminary_review',
    preliminary_approved_at: prelimDate,
  });

  const result = await getDeadlines({ days_ahead: 30 }, db, 'emhoa');
  expect(result.find((d) => d.type === 'Final Review Deadline')).toBeUndefined();
});

test('filters to a single project when project_id provided', async () => {
  const prelimDate = addDays(TODAY, -80);
  seedTestProject(db, {
    id: '2026-001',
    status: 'preliminary_review',
    preliminary_approved_at: prelimDate,
  });
  seedTestProject(db, {
    id: '2026-002',
    status: 'preliminary_review',
    preliminary_approved_at: prelimDate,
  });

  const result = await getDeadlines({ days_ahead: 30, project_id: '2026-001' }, db, 'emhoa');
  expect(result.every((d) => d.project_id === '2026-001')).toBe(true);
});

test('results are sorted by date ascending', async () => {
  const earlyDate = addDays(TODAY, -88); // 2 days remaining
  const laterDate = addDays(TODAY, -80); // 10 days remaining
  seedTestProject(db, {
    id: '2026-001',
    status: 'approved',
    final_approved_at: earlyDate,
  });
  seedTestProject(db, {
    id: '2026-002',
    status: 'preliminary_review',
    preliminary_approved_at: laterDate,
  });

  const result = await getDeadlines({ days_ahead: 30 }, db, 'emhoa');
  expect(result.length).toBeGreaterThan(1);
  for (let i = 1; i < result.length; i++) {
    expect(result[i].date >= result[i - 1].date).toBe(true);
  }
});
