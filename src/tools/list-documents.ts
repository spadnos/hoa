import fs from 'fs';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const listDocumentsTool: Tool = {
  name: 'list_documents',
  description:
    'List available HOA reference documents (Design Guidelines, Construction Rules, Delinquency Policy, etc.).',
  input_schema: {
    type: 'object' as const,
    properties: {},
  },
};

export async function listDocuments(
  documentsDir: string
): Promise<Array<{ filename: string }>> {
  if (!fs.existsSync(documentsDir)) return [];

  const entries = fs.readdirSync(documentsDir);
  return entries
    .filter((e) => e.endsWith('.md'))
    .map((filename) => ({ filename }));
}
