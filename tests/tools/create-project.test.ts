import { createProject } from '../../src/tools/create-project';
import { makeTestDb } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
});

test('creates project and returns id', async () => {
  const result = await createProject(
    {
      lot: 42,
      owner: { name: 'Alice' },
      address: '42 Alpine Way',
      type: 'new_residence',
      description: 'new house',
    },
    db
  );
  expect(typeof result).toBe('object');
  const project = result as { id: string };
  expect(project.id).toMatch(/^\d{4}-001$/);

  const row = db.prepare(`SELECT id FROM projects WHERE id = ?`).get(project.id);
  expect(row).toBeTruthy();
});

test('pre-populates standard fees for new_residence', async () => {
  const result = (await createProject(
    { lot: 1, owner: { name: 'Bob' }, address: '1 Main St', type: 'new_residence', description: 'build' },
    db
  )) as { id: string };

  const fees = db
    .prepare(`SELECT description, amount, paid_at FROM fees WHERE project_id = ? ORDER BY id`)
    .all(result.id) as { description: string; amount: number; paid_at: string | null }[];
  expect(fees).toHaveLength(4);
  expect(fees[0].description).toBe('EMACC Review Fee');
  expect(fees[0].amount).toBe(2000);
  expect(fees[0].paid_at).toBeNull();
});

test('pre-populates standard fees for minor_remodel', async () => {
  const result = (await createProject(
    { lot: 2, owner: { name: 'Carol' }, address: '2 Pine St', type: 'minor_remodel', description: 'deck' },
    db
  )) as { id: string };

  const fees = db
    .prepare(`SELECT amount FROM fees WHERE project_id = ? ORDER BY id`)
    .all(result.id) as { amount: number }[];
  expect(fees[0].amount).toBe(250);
});

test('generates sequential IDs within the same year', async () => {
  const r1 = (await createProject(
    { lot: 1, owner: { name: 'A' }, address: '1 St', type: 'landscaping', description: 'trees' },
    db
  )) as { id: string };
  const r2 = (await createProject(
    { lot: 2, owner: { name: 'B' }, address: '2 St', type: 'landscaping', description: 'shrubs' },
    db
  )) as { id: string };

  const year = new Date().getFullYear();
  expect(r1.id).toBe(`${year}-001`);
  expect(r2.id).toBe(`${year}-002`);
});

test('writes owner as a ContactInfo object', async () => {
  const result = (await createProject(
    {
      lot: 5,
      owner: {
        name: 'Dana',
        email: 'dana@example.com',
        phone: '555-000-1111',
        lot_address: '5 Hill Rd',
        mailing_address: 'PO Box 5',
      },
      address: '5 Hill Rd',
      type: 'new_residence',
      description: 'new-house',
    },
    db
  )) as { id: string };

  const row = db
    .prepare(`SELECT owner_name, owner_email, owner_lot_address FROM projects WHERE id = ?`)
    .get(result.id) as { owner_name: string; owner_email: string; owner_lot_address: string };
  expect(row.owner_name).toBe('Dana');
  expect(row.owner_email).toBe('dana@example.com');
  expect(row.owner_lot_address).toBe('5 Hill Rd');
});

test('writes designer and contractor when provided', async () => {
  const result = (await createProject(
    {
      lot: 6,
      owner: { name: 'Eve' },
      address: '6 Ridge Rd',
      type: 'major_remodel',
      description: 'remodel',
      designer: { name: 'Frank', company: 'Studio F', email: 'frank@studio.com' },
      contractor: { name: 'Grace', company: 'GC Inc', phone: '555-222-3333' },
    },
    db
  )) as { id: string };

  const row = db
    .prepare(
      `SELECT designer_name, designer_company, contractor_name, contractor_company FROM projects WHERE id = ?`
    )
    .get(result.id) as {
    designer_name: string;
    designer_company: string;
    contractor_name: string;
    contractor_company: string;
  };
  expect(row.designer_name).toBe('Frank');
  expect(row.designer_company).toBe('Studio F');
  expect(row.contractor_name).toBe('Grace');
  expect(row.contractor_company).toBe('GC Inc');
});

test('omits designer and contractor when not provided', async () => {
  const result = (await createProject(
    {
      lot: 7,
      owner: { name: 'Hank' },
      address: '7 Peak St',
      type: 'landscaping',
      description: 'landscaping',
    },
    db
  )) as { id: string };

  const row = db
    .prepare(`SELECT designer_name, contractor_name FROM projects WHERE id = ?`)
    .get(result.id) as { designer_name: string | null; contractor_name: string | null };
  expect(row.designer_name).toBeNull();
  expect(row.contractor_name).toBeNull();
});
