import fs from 'fs';
import { listDocuments } from '../../src/tools/list-documents';
import { getDocument } from '../../src/tools/get-document';
import { makeTempDir, makeTestDocument } from '../helpers';

let documentsDir: string;

beforeEach(() => {
  documentsDir = makeTempDir();
});

afterEach(() => {
  fs.rmSync(documentsDir, { recursive: true, force: true });
});

test('listDocuments returns names of markdown files', async () => {
  makeTestDocument(documentsDir, 'design-guidelines.md', '# Design Guidelines\nContent here.');
  makeTestDocument(documentsDir, 'construction-rules.md', '# Construction Rules\nContent here.');
  makeTestDocument(documentsDir, 'not-markdown.txt', 'ignore me');

  const result = await listDocuments(documentsDir);
  expect(result).toHaveLength(2);
  expect(result.map((d: { filename: string }) => d.filename)).toContain('design-guidelines.md');
  expect(result.map((d: { filename: string }) => d.filename)).toContain('construction-rules.md');
});

test('getDocument returns file content', async () => {
  makeTestDocument(documentsDir, 'design-guidelines.md', '# Design Guidelines\nContent here.');
  const result = await getDocument({ filename: 'design-guidelines.md' }, documentsDir);
  expect(result).toContain('# Design Guidelines');
});

test('getDocument returns error for unknown file', async () => {
  const result = await getDocument({ filename: 'nonexistent.md' }, documentsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});

test('getDocument rejects path traversal attempts', async () => {
  const result = await getDocument({ filename: '../../../etc/passwd' }, documentsDir);
  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
});
