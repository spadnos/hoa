import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { LibraryDocument } from '@/src/types';
import DocumentsClient from './DocumentsClient';

function accessTiers(session: Awaited<ReturnType<typeof getSession>>): string[] {
  if (hasPermission(session, 'admin')) return ['public', 'members', 'board'];
  if (hasPermission(session, 'homeowner')) return ['public', 'members'];
  return ['public'];
}

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const db = getDb();
  const orgId = session.organizationId ?? ORG_ID;
  const tiers = accessTiers(session);
  const placeholders = tiers.map(() => '?').join(', ');

  const docs = db.prepare<unknown[], LibraryDocument>(
    `SELECT * FROM library_documents
     WHERE organization_id = ? AND access_tier IN (${placeholders})
     ORDER BY category NULLS LAST, title`
  ).all(orgId, ...tiers);

  const isAdmin = hasPermission(session, 'admin');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        {isAdmin && (
          <Link
            href="/documents/upload"
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Upload Document
          </Link>
        )}
      </div>
      <DocumentsClient docs={docs} isAdmin={isAdmin} />
    </div>
  );
}
