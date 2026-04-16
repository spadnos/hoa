import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { updateProject } from '../../src/tools/update-project';
import { makeTempDir, makeTestProject } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('updates status field', async () => {
  const dir = makeTestProject(projectsDir, { id: '2026-001', status: 'inquiry' });
  await updateProject({ id: '2026-001', fields: { status: 'preliminary_review' } }, projectsDir);

  const { data } = matter(fs.readFileSync(path.join(dir, 'status.md'), 'utf-8'));
  expect(data.status).toBe('preliminary_review');
});

test('updates fees array', async () => {
  const dir = makeTestProject(projectsDir, {
    id: '2026-001',
    fees: [{ description: 'Review Fee', amount: 200, due_at: 'preliminary_review', paid: null }],
  });

  await updateProject(
    {
      id: '2026-001',
      fields: {
        fees: [{ description: 'Review Fee', amount: 200, due_at: 'preliminary_review', paid: '2026-04-15' }],
      },
    },
    projectsDir
  );

  const { data } = matter(fs.readFileSync(path.join(dir, 'status.md'), 'utf-8'));
  expect(data.fees[0].paid).toBe('2026-04-15');
});

test('returns error string when project not found', async () => {
  const result = await updateProject({ id: '9999-999', fields: { status: 'approved' } }, projectsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});

test('preserves existing fields not in update', async () => {
  makeTestProject(projectsDir, { id: '2026-001', owner: { name: 'Alice' }, status: 'inquiry' });
  await updateProject({ id: '2026-001', fields: { status: 'approved' } }, projectsDir);

  const dirs = fs.readdirSync(projectsDir);
  const { data } = matter(fs.readFileSync(path.join(projectsDir, dirs[0], 'status.md'), 'utf-8'));
  expect(data.owner.name).toBe('Alice');
  expect(data.status).toBe('approved');
});
