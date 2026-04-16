import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createProject } from '../../src/tools/create-project';
import { makeTempDir } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
  fs.mkdirSync(projectsDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('creates project directory and status.md', async () => {
  const result = await createProject(
    { lot: 42, owner: 'Alice', address: '42 Alpine Way', type: 'new_residence', description: 'new house' },
    projectsDir
  );
  expect(typeof result).toBe('object');
  const project = result as { id: string; directory: string };
  expect(project.id).toMatch(/^\d{4}-001$/);
  expect(fs.existsSync(path.join(project.directory, 'status.md'))).toBe(true);
});

test('pre-populates standard fees for new_residence', async () => {
  const result = await createProject(
    { lot: 1, owner: 'Bob', address: '1 Main St', type: 'new_residence', description: 'build' },
    projectsDir
  ) as { id: string; directory: string };

  const statusPath = path.join(result.directory, 'status.md');
  const { data } = matter(fs.readFileSync(statusPath, 'utf-8'));
  expect(data.fees).toHaveLength(4);
  expect(data.fees[0].description).toBe('EMACC Review Fee');
  expect(data.fees[0].amount).toBe(2000);
  expect(data.fees[0].paid).toBeNull();
});

test('pre-populates standard fees for minor_remodel', async () => {
  const result = await createProject(
    { lot: 2, owner: 'Carol', address: '2 Pine St', type: 'minor_remodel', description: 'deck' },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.fees[0].amount).toBe(250);
});

test('generates sequential IDs within the same year', async () => {
  const r1 = await createProject(
    { lot: 1, owner: 'A', address: '1 St', type: 'landscaping', description: 'trees' },
    projectsDir
  ) as { id: string; directory: string };
  const r2 = await createProject(
    { lot: 2, owner: 'B', address: '2 St', type: 'landscaping', description: 'shrubs' },
    projectsDir
  ) as { id: string; directory: string };

  const year = new Date().getFullYear();
  expect(r1.id).toBe(`${year}-001`);
  expect(r2.id).toBe(`${year}-002`);
});
