import { addCondition } from '../../src/tools/add-condition';
import { updateCondition } from '../../src/tools/update-condition';
import { listConditions } from '../../src/tools/list-conditions';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
  seedTestProject(db, { id: '2026-001' });
});

test('add_condition creates a condition for a project', async () => {
  const result = await addCondition({ project_id: '2026-001', description: 'Submit revised plans' }, db, 'emhoa');
  expect(result).toMatchObject({ project_id: '2026-001' });
  const conds = await listConditions({ project_id: '2026-001' }, db, 'emhoa');
  expect(conds).toHaveLength(1);
  expect(conds[0].description).toBe('Submit revised plans');
  expect(conds[0].satisfied_at).toBeNull();
});

test('add_condition returns error for unknown project', async () => {
  const result = await addCondition({ project_id: '9999-999', description: 'x' }, db, 'emhoa');
  expect(typeof result).toBe('string');
  expect(result as string).toMatch(/not found/i);
});

test('update_condition marks condition as satisfied', async () => {
  const added = (await addCondition(
    { project_id: '2026-001', description: 'Some condition' },
    db,

      'emhoa'
  )) as { id: number; project_id: string };

  await updateCondition({ id: added.id, satisfied: true }, db, 'emhoa');
  const conds = await listConditions({ project_id: '2026-001' }, db, 'emhoa');
  expect(conds[0].satisfied_at).not.toBeNull();
});

test('update_condition clears satisfied_at when satisfied=false', async () => {
  const added = (await addCondition(
    { project_id: '2026-001', description: 'Some condition' },
    db,

      'emhoa'
  )) as { id: number; project_id: string };
  await updateCondition({ id: added.id, satisfied: true }, db, 'emhoa');
  await updateCondition({ id: added.id, satisfied: false }, db, 'emhoa');

  const conds = await listConditions({ project_id: '2026-001' }, db, 'emhoa');
  expect(conds[0].satisfied_at).toBeNull();
});

test('list_conditions unsatisfied_only filters correctly', async () => {
  const c1 = (await addCondition({ project_id: '2026-001', description: 'First' }, db, 'emhoa')) as {
    id: number;
    project_id: string;
  };
  await addCondition({ project_id: '2026-001', description: 'Second' }, db, 'emhoa');
  await updateCondition({ id: c1.id, satisfied: true }, db, 'emhoa');

  const all = await listConditions({ project_id: '2026-001' }, db, 'emhoa');
  const unsatisfied = await listConditions({ project_id: '2026-001', unsatisfied_only: true }, db, 'emhoa');
  expect(all).toHaveLength(2);
  expect(unsatisfied).toHaveLength(1);
  expect(unsatisfied[0].description).toBe('Second');
});
