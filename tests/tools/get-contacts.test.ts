import { getContacts } from '../../src/tools/get-contacts';
import { makeTestDb, seedTestContact } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
  seedTestContact(db, { name: 'Jane Doe', role: 'Chair', group_name: 'acc_member', email: 'jane@hoa.org' });
  seedTestContact(db, { name: 'Bob Smith', role: 'President', group_name: 'board_member' });
});

test('returns parsed contact data', async () => {
  const result = await getContacts(db, 'emhoa');
  expect(result).toMatchObject({
    acc_members: [{ name: 'Jane Doe', role: 'Chair' }],
    board_members: [{ name: 'Bob Smith', role: 'President' }],
  });
});

test('returns empty lists when no contacts exist', async () => {
  const emptyDb = makeTestDb();
  const result = await getContacts(emptyDb, 'emhoa');
  expect(result.acc_members).toHaveLength(0);
  expect(result.board_members).toHaveLength(0);
});
