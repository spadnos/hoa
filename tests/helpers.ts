import fs from 'fs';
import os from 'os';
import path from 'path';
import matter from 'gray-matter';
import { Project, ProjectType, ProjectStatus, Fee, ContactInfo } from '../src/types';

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'emhoa-test-'));
}

export function makeTestProject(
  projectsDir: string,
  overrides: Partial<Project> = {}
): string {
  const project: Project = {
    id: '2026-001',
    lot: 42,
    owner: { name: 'Test Owner' } as ContactInfo,
    address: '42 Test Lane',
    type: 'new_residence' as ProjectType,
    status: 'preliminary_review' as ProjectStatus,
    submitted: '2026-01-01',
    fees: [] as Fee[],
    ...overrides,
  };
  const dirName = `${project.id}-lot${project.lot}-test`;
  const dirPath = path.join(projectsDir, dirName);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(
    path.join(dirPath, 'status.md'),
    matter.stringify('', project)
  );
  return dirPath;
}

export function makeTestDocument(documentsDir: string, filename: string, content: string): void {
  fs.mkdirSync(documentsDir, { recursive: true });
  fs.writeFileSync(path.join(documentsDir, filename), content);
}
