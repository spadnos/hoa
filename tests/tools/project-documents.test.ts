import { addProjectDocument } from '../../src/tools/add-project-document';
import { listProjectDocuments } from '../../src/tools/list-project-documents';
import { makeTestDb, seedTestProject } from '../helpers';
import type { Db } from '../../src/db';

let db: Db;

beforeEach(() => {
  db = makeTestDb();
  seedTestProject(db, { id: '2026-001' });
});

test('add_project_document indexes a document', async () => {
  const result = await addProjectDocument(
    {
      project_id: '2026-001',
      title: 'Preliminary Plans',
      file_path: 'plans-prelim-v1.pdf',
      description: 'First draft of preliminary plans',
    },
    db,

      'emhoa'
  );
  expect(result).toMatchObject({ project_id: '2026-001' });

  const docs = await listProjectDocuments({ project_id: '2026-001' }, db, 'emhoa');
  expect(docs).toHaveLength(1);
  expect(docs[0].title).toBe('Preliminary Plans');
  expect(docs[0].file_path).toBe('plans-prelim-v1.pdf');
});

test('add_project_document returns error for unknown project', async () => {
  const result = await addProjectDocument(
    { project_id: '9999-999', title: 'Plans', file_path: 'plans.pdf' },
    db,

      'emhoa'
  );
  expect(typeof result).toBe('string');
  expect(result as string).toMatch(/not found/i);
});

test('list_project_documents returns empty for project with no docs', async () => {
  const docs = await listProjectDocuments({ project_id: '2026-001' }, db, 'emhoa');
  expect(docs).toHaveLength(0);
});

test('list_project_documents returns multiple documents in order', async () => {
  await addProjectDocument(
    { project_id: '2026-001', title: 'First', file_path: 'first.pdf' },
    db,

      'emhoa'
  );
  await addProjectDocument(
    { project_id: '2026-001', title: 'Second', file_path: 'second.pdf' },
    db,

      'emhoa'
  );
  const docs = await listProjectDocuments({ project_id: '2026-001' }, db, 'emhoa');
  expect(docs).toHaveLength(2);
  expect(docs[0].title).toBe('First');
  expect(docs[1].title).toBe('Second');
});
