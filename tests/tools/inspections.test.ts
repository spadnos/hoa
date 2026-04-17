import { logInspection } from '../../src/tools/log-inspection';
import { listInspections } from '../../src/tools/list-inspections';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
  seedTestProject(db, { id: '2026-001' });
});

test('log_inspection records an inspection', async () => {
  const result = await logInspection(
    {
      project_id: '2026-001',
      type: 'pre-construction',
      inspector: 'Jane Doe',
      date: '2026-05-01',
      outcome: 'passed',
    },
    db
  );
  expect(result).toMatchObject({ project_id: '2026-001' });

  const inspections = await listInspections({ project_id: '2026-001' }, db);
  expect(inspections).toHaveLength(1);
  expect(inspections[0].type).toBe('pre-construction');
  expect(inspections[0].outcome).toBe('passed');
});

test('log_inspection returns error for unknown project', async () => {
  const result = await logInspection(
    {
      project_id: '9999-999',
      type: 'final',
      inspector: 'X',
      date: '2026-05-01',
      outcome: 'passed',
    },
    db
  );
  expect(typeof result).toBe('string');
  expect(result as string).toMatch(/not found/i);
});

test('log_inspection stores notes', async () => {
  await logInspection(
    {
      project_id: '2026-001',
      type: 'framing',
      inspector: 'Bob',
      date: '2026-06-01',
      outcome: 'conditional',
      notes: 'Fix rebar before pour',
    },
    db
  );
  const inspections = await listInspections({ project_id: '2026-001' }, db);
  expect(inspections[0].notes).toBe('Fix rebar before pour');
});

test('list_inspections returns sorted by date', async () => {
  await logInspection(
    { project_id: '2026-001', type: 'final', inspector: 'X', date: '2026-07-01', outcome: 'passed' },
    db
  );
  await logInspection(
    {
      project_id: '2026-001',
      type: 'pre-construction',
      inspector: 'X',
      date: '2026-05-01',
      outcome: 'passed',
    },
    db
  );
  const inspections = await listInspections({ project_id: '2026-001' }, db);
  expect(inspections[0].date).toBe('2026-05-01');
  expect(inspections[1].date).toBe('2026-07-01');
});
