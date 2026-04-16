import fs from 'fs';
import path from 'path';
import { listProjects } from '../../src/tools/list-projects';
import { makeTempDir, makeTestProject } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('returns empty array when no projects exist', async () => {
  const result = await listProjects({}, projectsDir);
  expect(result).toEqual([]);
});

test('returns summaries for all projects', async () => {
  makeTestProject(projectsDir, { id: '2026-001', lot: 42 });
  makeTestProject(projectsDir, { id: '2026-002', lot: 99, status: 'approved' });
  const result = await listProjects({}, projectsDir);
  expect(result).toHaveLength(2);
  expect(result[0].id).toBe('2026-001');
  expect(result[1].id).toBe('2026-002');
});

test('filters by status', async () => {
  makeTestProject(projectsDir, { id: '2026-001', status: 'preliminary_review' });
  makeTestProject(projectsDir, { id: '2026-002', status: 'approved' });
  const result = await listProjects({ status: 'approved' }, projectsDir);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('2026-002');
});

test('filters by lot number', async () => {
  makeTestProject(projectsDir, { id: '2026-001', lot: 42 });
  makeTestProject(projectsDir, { id: '2026-002', lot: 99 });
  const result = await listProjects({ lot: 42 }, projectsDir);
  expect(result).toHaveLength(1);
  expect(result[0].lot).toBe(42);
});
