import fs from 'fs';
import path from 'path';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const getDocumentTool: Tool = {
  name: 'get_document',
  description:
    'Read the full content of an HOA reference document. Use this to answer questions about rules, fees, and requirements.',
  input_schema: {
    type: 'object' as const,
    properties: {
      filename: {
        type: 'string',
        description: 'Filename from list_documents, e.g. "design-guidelines.md"',
      },
    },
    required: ['filename'],
  },
};

export interface GetDocumentInput {
  filename: string;
}

export async function getDocument(
  input: GetDocumentInput,
  documentsDir: string
): Promise<string> {
  // Prevent path traversal
  const resolved = path.resolve(documentsDir, input.filename);
  if (!resolved.startsWith(path.resolve(documentsDir))) {
    return `Document not found: ${input.filename}`;
  }

  if (!fs.existsSync(resolved) || !resolved.endsWith('.md')) {
    return `Document not found: ${input.filename}`;
  }

  return fs.readFileSync(resolved, 'utf-8');
}
