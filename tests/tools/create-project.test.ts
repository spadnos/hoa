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
    { lot: 42, owner: { name: 'Alice' }, address: '42 Alpine Way', type: 'new_residence', description: 'new house' },
    projectsDir
  );
  expect(typeof result).toBe('object');
  const project = result as { id: string; directory: string };
  expect(project.id).toMatch(/^\d{4}-001$/);
  expect(fs.existsSync(path.join(project.directory, 'status.md'))).toBe(true);
});

test('pre-populates standard fees for new_residence', async () => {
  const result = await createProject(
    { lot: 1, owner: { name: 'Bob' }, address: '1 Main St', type: 'new_residence', description: 'build' },
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
    { lot: 2, owner: { name: 'Carol' }, address: '2 Pine St', type: 'minor_remodel', description: 'deck' },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.fees[0].amount).toBe(250);
});

test('generates sequential IDs within the same year', async () => {
  const r1 = await createProject(
    { lot: 1, owner: { name: 'A' }, address: '1 St', type: 'landscaping', description: 'trees' },
    projectsDir
  ) as { id: string; directory: string };
  const r2 = await createProject(
    { lot: 2, owner: { name: 'B' }, address: '2 St', type: 'landscaping', description: 'shrubs' },
    projectsDir
  ) as { id: string; directory: string };

  const year = new Date().getFullYear();
  expect(r1.id).toBe(`${year}-001`);
  expect(r2.id).toBe(`${year}-002`);
});

test('writes owner as a ContactInfo object', async () => {
  const result = await createProject(
    {
      lot: 5,
      owner: { name: 'Dana', email: 'dana@example.com', phone: '555-000-1111',
               lot_address: '5 Hill Rd', mailing_address: 'PO Box 5' },
      address: '5 Hill Rd',
      type: 'new_residence',
      description: 'new-house',
    },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.owner).toMatchObject({ name: 'Dana', email: 'dana@example.com' });
});

test('writes designer and contractor when provided', async () => {
  const result = await createProject(
    {
      lot: 6,
      owner: { name: 'Eve' },
      address: '6 Ridge Rd',
      type: 'major_remodel',
      description: 'remodel',
      designer: { name: 'Frank', company: 'Studio F', email: 'frank@studio.com' },
      contractor: { name: 'Grace', company: 'GC Inc', phone: '555-222-3333' },
    },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.designer).toMatchObject({ name: 'Frank', company: 'Studio F' });
  expect(data.contractor).toMatchObject({ name: 'Grace', company: 'GC Inc' });
});

test('omits designer and contractor when not provided', async () => {
  const result = await createProject(
    { lot: 7, owner: { name: 'Hank' }, address: '7 Peak St', type: 'landscaping', description: 'landscaping' },
    projectsDir
  ) as { id: string; directory: string };

  const { data } = matter(fs.readFileSync(path.join(result.directory, 'status.md'), 'utf-8'));
  expect(data.designer).toBeUndefined();
  expect(data.contractor).toBeUndefined();
});
