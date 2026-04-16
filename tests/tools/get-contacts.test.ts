import fs from 'fs';
import path from 'path';
import { getContacts } from '../../src/tools/get-contacts';
import { makeTempDir } from '../helpers';

let contactsDir: string;

beforeEach(() => {
  contactsDir = makeTempDir();
  fs.writeFileSync(
    path.join(contactsDir, 'hoa-members.md'),
    '# HOA Members\n\n## ACC Members\n\n| Name | Role |\n|------|------|\n| Jane Doe | Chair |\n'
  );
});

afterEach(() => {
  fs.rmSync(contactsDir, { recursive: true, force: true });
});

test('returns content of hoa-members.md', async () => {
  const result = await getContacts(contactsDir);
  expect(result).toContain('Jane Doe');
  expect(result).toContain('ACC Members');
});

test('returns error message when file does not exist', async () => {
  fs.rmSync(path.join(contactsDir, 'hoa-members.md'));
  const result = await getContacts(contactsDir);
  expect(result).toMatch(/not found/i);
});
