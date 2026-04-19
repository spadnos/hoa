import { getFeeLedger } from '../../src/tools/fee-ledger';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
});

test('returns zero totals when no fees exist', async () => {
  const result = await getFeeLedger(db, 'emhoa');
  expect(result.total_outstanding).toBe(0);
  expect(result.projects).toHaveLength(0);
});

test('returns correct unpaid totals for a project', async () => {
  seedTestProject(db, {
    id: '2026-001',
    lot: 42,
    owner: { name: 'Alice' },
    fees: [
      { description: 'Review Fee', amount: 2000, due_at: 'preliminary_review', paid: null },
      { description: 'Compliance', amount: 3500, due_at: 'final_plan_approval', paid: null },
    ],
  });

  const result = await getFeeLedger(db, 'emhoa');
  expect(result.total_outstanding).toBe(5500);
  expect(result.projects).toHaveLength(1);
  expect(result.projects[0].project_id).toBe('2026-001');
  expect(result.projects[0].total).toBe(5500);
  expect(result.projects[0].unpaid_fees).toHaveLength(2);
});

test('excludes paid fees from totals', async () => {
  seedTestProject(db, {
    id: '2026-001',
    lot: 42,
    owner: { name: 'Alice' },
    fees: [
      { description: 'Review Fee', amount: 2000, due_at: 'preliminary_review', paid: '2026-04-01' },
      { description: 'Compliance', amount: 3500, due_at: 'final_plan_approval', paid: null },
    ],
  });

  const result = await getFeeLedger(db, 'emhoa');
  expect(result.total_outstanding).toBe(3500);
  expect(result.projects[0].unpaid_fees).toHaveLength(1);
  expect(result.projects[0].unpaid_fees[0].description).toBe('Compliance');
});

test('aggregates fees across multiple projects', async () => {
  seedTestProject(db, {
    id: '2026-001',
    lot: 1,
    owner: { name: 'Alice' },
    fees: [{ description: 'Fee A', amount: 1000, due_at: 'preliminary_review', paid: null }],
  });
  seedTestProject(db, {
    id: '2026-002',
    lot: 2,
    owner: { name: 'Bob' },
    fees: [{ description: 'Fee B', amount: 500, due_at: 'preliminary_review', paid: null }],
  });

  const result = await getFeeLedger(db, 'emhoa');
  expect(result.total_outstanding).toBe(1500);
  expect(result.projects).toHaveLength(2);
});

test('returns empty when all fees are paid', async () => {
  seedTestProject(db, {
    id: '2026-001',
    lot: 1,
    owner: { name: 'Alice' },
    fees: [{ description: 'Fee A', amount: 1000, due_at: 'preliminary_review', paid: '2026-03-01' }],
  });

  const result = await getFeeLedger(db, 'emhoa');
  expect(result.total_outstanding).toBe(0);
  expect(result.projects).toHaveLength(0);
});
