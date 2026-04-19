import { getProject } from '../../src/tools/get-project';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
});

test('returns full project when found by id', async () => {
  seedTestProject(db, { id: '2026-001', lot: 42, owner: { name: 'Alice' } });
  const result = await getProject({ id: '2026-001' }, db, 'emhoa');
  expect(result).toMatchObject({ id: '2026-001', lot: 42, owner: { name: 'Alice' } });
});

test('returns error string when project not found', async () => {
  const result = await getProject({ id: '9999-999' }, db, 'emhoa');
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});
