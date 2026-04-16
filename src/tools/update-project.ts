import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { Project } from '../types';

export const updateProjectTool: Tool = {
  name: 'update_project',
  description:
    'Update fields on an existing project. Use this to change status, mark fees as paid, update notes, or update contact information. ' +
    'Pass the full fees array when updating fee records. ' +
    'Contact fields are nested objects: owner (name, email, phone, lot_address, mailing_address), ' +
    'designer (name, company, email, phone), contractor (name, company, email, phone). ' +
    'To add or update a designer or contractor, pass the full contact object in the fields.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Project ID, e.g. "2026-001"' },
      fields: {
        type: 'object',
        description:
          'Object containing fields to update. Any top-level Project field may be included. To mark a fee paid, pass the full updated fees array.',
      },
    },
    required: ['id', 'fields'],
  },
};

export interface UpdateProjectInput {
  id: string;
  fields: Partial<Omit<Project, 'id'>>;
}

export async function updateProject(
  input: UpdateProjectInput,
  projectsDir: string
): Promise<{ id: string } | string> {
  if (!fs.existsSync(projectsDir)) return `Project ${input.id} not found`;

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(input.id)) continue;

    const statusPath = path.join(projectsDir, entry.name, 'status.md');
    if (!fs.existsSync(statusPath)) continue;

    const content = fs.readFileSync(statusPath, 'utf-8');
    const { data, content: body } = matter(content);
    const updated = { ...data, ...input.fields };
    fs.writeFileSync(statusPath, matter.stringify(body, updated));
    return { id: input.id };
  }

  return `Project ${input.id} not found`;
}
