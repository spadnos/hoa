import { NextRequest, NextResponse } from 'next/server';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { ProjectDocument } from '@/src/types';
import { projectUploadsDir } from '../../_project-docs-helpers';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: projectId, docId } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'acc_manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const doc = db
    .prepare<unknown[], ProjectDocument>(
      'SELECT * FROM project_documents WHERE id = ? AND project_id = ? AND organization_id = ?'
    )
    .get(docId, projectId, orgId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.document_type !== 'plan') {
    return NextResponse.json({ error: 'Only plan documents can be reviewed' }, { status: 400 });
  }

  const filePath = path.join(projectUploadsDir(projectId), doc.file_path);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Plan file not found on disk' }, { status: 404 });
  }

  const guidelinesPath = path.join(process.cwd(), 'documents', 'design-guidelines.md');
  if (!fs.existsSync(guidelinesPath)) {
    return NextResponse.json({ error: 'Design guidelines not found' }, { status: 500 });
  }

  const pdfBuffer = fs.readFileSync(filePath);
  const pdfBase64 = pdfBuffer.toString('base64');
  const guidelinesText = fs.readFileSync(guidelinesPath, 'utf-8');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let reviewText: string;
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      betas: ['pdfs-2024-09-25'],
      system: `You are an expert architectural plan reviewer for the East Meadows Homeowners Association (EMHOA) Architectural Control Committee (ACC) in Kirkwood, CA.

You review submitted construction plans and documents for compliance with the EMHOA Design Guidelines.

Produce a structured review with these sections:
1. **Summary** — one-paragraph overall assessment
2. **Compliance Issues** — bulleted list of specific guideline violations or concerns, each citing the relevant guideline section. If none, say "None identified."
3. **Recommendations** — bulleted list of changes required before approval. If none, say "None."
4. **Items Requiring Clarification** — questions for the applicant about unclear aspects. If none, say "None."
5. **Preliminary Assessment** — one of: Approve / Approve with Conditions / Revise and Resubmit / Reject

Be specific, cite section numbers from the guidelines where applicable, and be constructive.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `## EMHOA Design Guidelines\n\n${guidelinesText}\n\n---\n\nPlease review the attached plan document for compliance with these guidelines. Project ID: ${projectId}`,
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
              title: doc.title,
              context: `Submitted plan for EMHOA project ${projectId}`,
            },
          ],
        },
      ],
    });

    reviewText = response.content
      .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n');
  } catch (err) {
    console.error('Plan review Claude API error:', err);
    return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
  }

  const dir = projectUploadsDir(projectId);
  fs.mkdirSync(dir, { recursive: true });

  const reviewFilename = `${Date.now()}-review.md`;
  const reviewFilePath = path.join(dir, reviewFilename);
  const reviewTitle = `AI Review: ${doc.title}`;

  const header = `# ${reviewTitle}\n\n*Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} for project ${projectId}*\n\n---\n\n`;
  fs.writeFileSync(reviewFilePath, header + reviewText);

  const result = db
    .prepare(
      `INSERT INTO project_documents
         (project_id, organization_id, title, description, file_path, document_type, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, 'review', 'text/markdown', ?)`
    )
    .run(
      projectId,
      orgId,
      reviewTitle,
      `AI-generated plan review for "${doc.title}"`,
      reviewFilename,
      Buffer.byteLength(header + reviewText)
    );

  const created = db
    .prepare<unknown[], ProjectDocument>(
      `SELECT id, project_id, title, file_path, description, document_type, mime_type, size_bytes, uploaded_at
       FROM project_documents WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(created, { status: 201 });
}
