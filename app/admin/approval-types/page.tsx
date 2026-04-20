import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { ApprovalType } from '@/src/types';
import ApprovalTypesClient from './ApprovalTypesClient';

export default async function ApprovalTypesPage() {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) redirect('/');

  const db = getDb();
  const orgId = session!.organizationId ?? ORG_ID;

  const types = db.prepare(
    `SELECT id, organization_id, name, label, description, sort_order,
            is_required_by_default, is_warning_indicator, is_active, created_at
     FROM approval_types
     WHERE organization_id = ?
     ORDER BY sort_order, id`
  ).all(orgId) as ApprovalType[];

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">
          ← Admin
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">External Approval Types</h1>
      <ApprovalTypesClient initialTypes={types} />
    </div>
  );
}
