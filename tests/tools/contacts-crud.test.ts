import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { addContact } from '../../src/tools/add-contact';
import { editContact } from '../../src/tools/edit-contact';
import { removeContact } from '../../src/tools/remove-contact';
import { makeTempDir } from '../helpers';

function writeContactsFile(dir: string, data: object): void {
  fs.writeFileSync(path.join(dir, 'hoa-members.md'), matter.stringify('', data));
}

function readContactsFile(dir: string): { acc_members: object[]; board_members: object[] } {
  const { data } = matter(fs.readFileSync(path.join(dir, 'hoa-members.md'), 'utf-8'));
  return data as { acc_members: object[]; board_members: object[] };
}

const INITIAL_DATA = {
  acc_members: [{ name: 'Jane Doe', role: 'Chair', email: 'jane@hoa.org' }],
  board_members: [{ name: 'Bob Smith', role: 'President' }],
};

// Each test creates its own isolated temp dir
function setup() {
  const dir = makeTempDir();
  writeContactsFile(dir, INITIAL_DATA);
  return dir;
}

function teardown(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- add_contact ---

test('add_contact appends a new contact to the correct section', async () => {
  const dir = setup();
  try {
    const result = await addContact(
      { section: 'acc', name: 'Alice New', role: 'Member', email: 'alice@hoa.org' },
      dir
    );
    expect(result).toEqual({ section: 'acc', name: 'Alice New' });

    const data = readContactsFile(dir);
    expect(data.acc_members).toHaveLength(2);
    expect(data.acc_members[1]).toMatchObject({ name: 'Alice New', role: 'Member', email: 'alice@hoa.org' });
  } finally {
    teardown(dir);
  }
});

test('add_contact rejects a duplicate name (case-insensitive)', async () => {
  const dir = setup();
  try {
    const result = await addContact({ section: 'acc', name: 'jane doe', role: 'Member' }, dir);
    expect(typeof result).toBe('string');
    expect(result as string).toMatch(/already exists/i);
  } finally {
    teardown(dir);
  }
});

test('add_contact returns error when file does not exist', async () => {
  const dir = makeTempDir();
  try {
    const result = await addContact({ section: 'board', name: 'X', role: 'Y' }, dir);
    expect(result as string).toMatch(/not found/i);
  } finally {
    teardown(dir);
  }
});

// --- edit_contact ---

test('edit_contact updates fields on an existing contact', async () => {
  const dir = setup();
  try {
    const result = await editContact(
      { section: 'acc', name: 'Jane Doe', fields: { email: 'newemail@hoa.org', phone: '555-1234' } },
      dir
    );
    expect(result).toEqual({ section: 'acc', name: 'Jane Doe' });

    const data = readContactsFile(dir);
    expect(data.acc_members[0]).toMatchObject({ email: 'newemail@hoa.org', phone: '555-1234' });
  } finally {
    teardown(dir);
  }
});

test('edit_contact can rename a contact', async () => {
  const dir = setup();
  try {
    const result = await editContact(
      { section: 'board', name: 'Bob Smith', fields: { name: 'Robert Smith' } },
      dir
    );
    expect(result).toEqual({ section: 'board', name: 'Robert Smith' });

    const data = readContactsFile(dir);
    expect(data.board_members[0]).toMatchObject({ name: 'Robert Smith' });
  } finally {
    teardown(dir);
  }
});

test('edit_contact returns error when contact not found', async () => {
  const dir = setup();
  try {
    const result = await editContact(
      { section: 'acc', name: 'Nobody', fields: { role: 'X' } },
      dir
    );
    expect(result as string).toMatch(/not found/i);
  } finally {
    teardown(dir);
  }
});

test('edit_contact returns error when file does not exist', async () => {
  const dir = makeTempDir();
  try {
    const result = await editContact({ section: 'acc', name: 'Jane Doe', fields: {} }, dir);
    expect(result as string).toMatch(/not found/i);
  } finally {
    teardown(dir);
  }
});

// --- remove_contact ---

test('remove_contact removes the matching contact', async () => {
  const dir = setup();
  try {
    const result = await removeContact({ section: 'acc', name: 'Jane Doe' }, dir);
    expect(result).toEqual({ section: 'acc', name: 'Jane Doe' });

    const data = readContactsFile(dir);
    expect(data.acc_members).toHaveLength(0);
  } finally {
    teardown(dir);
  }
});

test('remove_contact is case-insensitive', async () => {
  const dir = setup();
  try {
    const result = await removeContact({ section: 'board', name: 'bob smith' }, dir);
    expect(result).toEqual({ section: 'board', name: 'bob smith' });

    const data = readContactsFile(dir);
    expect(data.board_members).toHaveLength(0);
  } finally {
    teardown(dir);
  }
});

test('remove_contact returns error when contact not found', async () => {
  const dir = setup();
  try {
    const result = await removeContact({ section: 'acc', name: 'Nobody' }, dir);
    expect(result as string).toMatch(/not found/i);
  } finally {
    teardown(dir);
  }
});

test('remove_contact returns error when file does not exist', async () => {
  const dir = makeTempDir();
  try {
    const result = await removeContact({ section: 'acc', name: 'Jane Doe' }, dir);
    expect(result as string).toMatch(/not found/i);
  } finally {
    teardown(dir);
  }
});
