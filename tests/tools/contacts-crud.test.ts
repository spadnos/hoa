import { addContact } from '../../src/tools/add-contact';
import { editContact } from '../../src/tools/edit-contact';
import { removeContact } from '../../src/tools/remove-contact';
import { makeTestDb, seedTestContact } from '../helpers';
import type { Db } from '../../src/db';

function setup(): Db {
  const db = makeTestDb();
  seedTestContact(db, { name: 'Jane Doe', role: 'Chair', group_name: 'acc_member', email: 'jane@hoa.org' });
  seedTestContact(db, { name: 'Bob Smith', role: 'President', group_name: 'board_member' });
  return db;
}

// --- add_contact ---

test('add_contact appends a new contact to the correct section', async () => {
  const db = setup();
  const result = await addContact(
    { section: 'acc', name: 'Alice New', role: 'Member', email: 'alice@hoa.org' },
    db,

      'emhoa'
  );
  expect(result).toEqual({ section: 'acc', name: 'Alice New' });

  const rows = db
    .prepare(
      `SELECT p.name, p.email FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE gm.group_name = 'acc' AND p.organization_id = 'emhoa' AND gm.end_date IS NULL
       ORDER BY gm.id`
    )
    .all() as { name: string; email: string }[];
  expect(rows).toHaveLength(2);
  expect(rows[1]).toMatchObject({ name: 'Alice New', email: 'alice@hoa.org' });
});

test('add_contact rejects a duplicate name (case-insensitive)', async () => {
  const db = setup();
  const result = await addContact({ section: 'acc', name: 'jane doe', role: 'Member' }, db, 'emhoa');
  expect(typeof result).toBe('string');
  expect(result as string).toMatch(/already exists/i);
});

test('add_contact works on an empty database', async () => {
  const db = makeTestDb();
  const result = await addContact({ section: 'board', name: 'X', role: 'Y' }, db, 'emhoa');
  expect(result).toEqual({ section: 'board', name: 'X' });
});

// --- edit_contact ---

test('edit_contact updates fields on an existing contact', async () => {
  const db = setup();
  const result = await editContact(
    { section: 'acc', name: 'Jane Doe', fields: { email: 'newemail@hoa.org', phone: '555-1234' } },
    db,

      'emhoa'
  );
  expect(result).toEqual({ section: 'acc', name: 'Jane Doe' });

  const row = db
    .prepare(
      `SELECT p.email, p.phone FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE gm.group_name = 'acc' AND p.organization_id = 'emhoa'
         AND LOWER(p.name) = 'jane doe' AND gm.end_date IS NULL`
    )
    .get() as { email: string; phone: string };
  expect(row.email).toBe('newemail@hoa.org');
  expect(row.phone).toBe('555-1234');
});

test('edit_contact can rename a contact', async () => {
  const db = setup();
  const result = await editContact(
    { section: 'board', name: 'Bob Smith', fields: { name: 'Robert Smith' } },
    db,

      'emhoa'
  );
  expect(result).toEqual({ section: 'board', name: 'Robert Smith' });

  const row = db
    .prepare(
      `SELECT p.name FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE gm.group_name = 'board' AND p.organization_id = 'emhoa' AND gm.end_date IS NULL`
    )
    .get() as { name: string };
  expect(row.name).toBe('Robert Smith');
});

test('edit_contact returns error when contact not found', async () => {
  const db = setup();
  const result = await editContact(
    { section: 'acc', name: 'Nobody', fields: { role: 'X' } },
    db,

      'emhoa'
  );
  expect(result as string).toMatch(/not found/i);
});

test('edit_contact returns error when contact not found in empty db', async () => {
  const db = makeTestDb();
  const result = await editContact({ section: 'acc', name: 'Jane Doe', fields: {} }, db, 'emhoa');
  expect(result as string).toMatch(/not found/i);
});

// --- remove_contact ---

test('remove_contact removes the matching contact', async () => {
  const db = setup();
  const result = await removeContact({ section: 'acc', name: 'Jane Doe' }, db, 'emhoa');
  expect(result).toEqual({ section: 'acc', name: 'Jane Doe' });

  const count = (
    db
      .prepare(
        `SELECT COUNT(*) as n FROM group_memberships gm
         JOIN parties p ON p.id = gm.party_id
         WHERE gm.group_name = 'acc' AND p.organization_id = 'emhoa' AND gm.end_date IS NULL`
      )
      .get() as { n: number }
  ).n;
  expect(count).toBe(0);
});

test('remove_contact is case-insensitive', async () => {
  const db = setup();
  const result = await removeContact({ section: 'board', name: 'bob smith' }, db, 'emhoa');
  expect(result).toEqual({ section: 'board', name: 'bob smith' });

  const count = (
    db
      .prepare(
        `SELECT COUNT(*) as n FROM group_memberships gm
         JOIN parties p ON p.id = gm.party_id
         WHERE gm.group_name = 'board' AND p.organization_id = 'emhoa' AND gm.end_date IS NULL`
      )
      .get() as { n: number }
  ).n;
  expect(count).toBe(0);
});

test('remove_contact returns error when contact not found', async () => {
  const db = setup();
  const result = await removeContact({ section: 'acc', name: 'Nobody' }, db, 'emhoa');
  expect(result as string).toMatch(/not found/i);
});

test('remove_contact returns error when contact not found in empty db', async () => {
  const db = makeTestDb();
  const result = await removeContact({ section: 'acc', name: 'Jane Doe' }, db, 'emhoa');
  expect(result as string).toMatch(/not found/i);
});
