import { updateProject } from '../../src/tools/update-project';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
});

test('updates status field', async () => {
  seedTestProject(db, { id: '2026-001', status: 'inquiry' });
  await updateProject({ id: '2026-001', fields: { status: 'preliminary_review' } }, db, 'emhoa');

  const row = db
    .prepare(`SELECT status FROM projects WHERE id = '2026-001'`)
    .get() as { status: string };
  expect(row.status).toBe('preliminary_review');
});

test('updates fees array', async () => {
  seedTestProject(db, {
    id: '2026-001',
    fees: [{ description: 'Review Fee', amount: 200, due_at: 'preliminary_review', paid: null }],
  });

  await updateProject(
    {
      id: '2026-001',
      fields: {
        fees: [
          {
            description: 'Review Fee',
            amount: 200,
            due_at: 'preliminary_review',
            paid: '2026-04-15',
          },
        ],
      },
    },
    db,

      'emhoa'
  );

  const fees = db
    .prepare(`SELECT paid_at FROM fees WHERE project_id = '2026-001'`)
    .all() as { paid_at: string | null }[];
  expect(fees[0].paid_at).toBe('2026-04-15');
});

test('returns error string when project not found', async () => {
  const result = await updateProject({ id: '9999-999', fields: { status: 'approved' } }, db, 'emhoa');
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});

test('preserves existing fields not in update', async () => {
  seedTestProject(db, { id: '2026-001', owner: { name: 'Alice' }, status: 'inquiry' });
  await updateProject({ id: '2026-001', fields: { status: 'approved' } }, db, 'emhoa');

  const row = db
    .prepare(
      `SELECT p.name as owner_name, pr.status
       FROM projects pr
       JOIN parties p ON p.id = pr.owner_party_id
       WHERE pr.id = '2026-001'`
    )
    .get() as { owner_name: string; status: string };
  expect(row.owner_name).toBe('Alice');
  expect(row.status).toBe('approved');
});
