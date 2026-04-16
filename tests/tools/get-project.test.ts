import fs from 'fs';
import { getProject } from '../../src/tools/get-project';
import { makeTempDir, makeTestProject } from '../helpers';

let projectsDir: string;

beforeEach(() => {
  projectsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(projectsDir, { recursive: true, force: true });
});

test('returns full project when found by id', async () => {
  makeTestProject(projectsDir, { id: '2026-001', lot: 42, owner: { name: 'Alice' } });
  const result = await getProject({ id: '2026-001' }, projectsDir);
  expect(result).toMatchObject({ id: '2026-001', lot: 42, owner: { name: 'Alice' } });
});

test('returns error string when project not found', async () => {
  const result = await getProject({ id: '9999-999' }, projectsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});
