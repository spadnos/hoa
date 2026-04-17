import { listProjects } from '../../src/tools/list-projects';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
});

test('returns empty array when no projects exist', async () => {
  const result = await listProjects({}, db);
  expect(result).toEqual([]);
});

test('returns summaries for all projects', async () => {
  seedTestProject(db, { id: '2026-001', lot: 42 });
  seedTestProject(db, { id: '2026-002', lot: 99, status: 'approved' });
  const result = await listProjects({}, db);
  expect(result).toHaveLength(2);
  expect(result[0].id).toBe('2026-001');
  expect(result[1].id).toBe('2026-002');
});

test('filters by status', async () => {
  seedTestProject(db, { id: '2026-001', status: 'preliminary_review' });
  seedTestProject(db, { id: '2026-002', status: 'approved' });
  const result = await listProjects({ status: 'approved' }, db);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('2026-002');
});

test('filters by lot number', async () => {
  seedTestProject(db, { id: '2026-001', lot: 42 });
  seedTestProject(db, { id: '2026-002', lot: 99 });
  const result = await listProjects({ lot: 42 }, db);
  expect(result).toHaveLength(1);
  expect(result[0].lot).toBe(42);
});

test('summary owner is the owner name string', async () => {
  seedTestProject(db, {
    id: '2026-001',
    owner: { name: 'Alice Sample', email: 'alice@example.com' },
  });
  const result = await listProjects({}, db);
  expect(result[0].owner).toBe('Alice Sample');
});
