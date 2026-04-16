import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getContacts } from '../../src/tools/get-contacts';
import { makeTempDir } from '../helpers';

let contactsDir: string;

function writeContactsFile(dir: string, data: object): void {
  fs.writeFileSync(path.join(dir, 'hoa-members.md'), matter.stringify('', data));
}

beforeEach(() => {
  contactsDir = makeTempDir();
  writeContactsFile(contactsDir, {
    acc_members: [{ name: 'Jane Doe', role: 'Chair', email: 'jane@hoa.org' }],
    board_members: [{ name: 'Bob Smith', role: 'President' }],
  });
});

afterEach(() => {
  fs.rmSync(contactsDir, { recursive: true, force: true });
});

test('returns parsed contact data', async () => {
  const result = await getContacts(contactsDir);
  expect(result).toMatchObject({
    acc_members: [{ name: 'Jane Doe', role: 'Chair' }],
    board_members: [{ name: 'Bob Smith', role: 'President' }],
  });
});

test('returns error message when file does not exist', async () => {
  fs.rmSync(path.join(contactsDir, 'hoa-members.md'));
  const result = await getContacts(contactsDir);
  expect(result).toMatch(/not found/i);
});
