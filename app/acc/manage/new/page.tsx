import Link from 'next/link';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import NewProjectForm from '@/app/components/NewProjectForm';
import { listApprovalTypes } from '@/src/tools/list-approval-types';
import type { LotSearchResult } from '@/app/api/lots/route';

export default async function NewProjectPage() {
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  const lots = db.prepare(`
    SELECT
      l.lot_number,
      l.id AS lot_id,
      la.address,
      la.id AS address_id,
      p.name AS owner_name,
      p.email AS owner_email,
      p.phone AS owner_phone,
      lassoc.mailing_address AS owner_mailing_address
    FROM lots l
    LEFT JOIN lot_addresses la ON la.lot_id = l.id
    LEFT JOIN lot_associations lassoc
      ON lassoc.lot_id = l.id
      AND lassoc.end_date IS NULL
      AND lassoc.role IN ('owner', 'trustee', 'corporate_owner')
      AND lassoc.is_primary_contact = 1
    LEFT JOIN parties p ON p.id = lassoc.party_id
    WHERE l.organization_id = ?
    ORDER BY l.lot_number, la.address
  `).all(orgId) as LotSearchResult[];

  const approvalTypes = listApprovalTypes(db, orgId);

  return (
    <div className="max-w-xl">
      <Link href="/acc/manage" className="text-sm text-gray-500 hover:text-gray-900 mb-6 block">
        ← ACC Management
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Project</h1>
      <NewProjectForm lots={lots} approvalTypes={approvalTypes} />
    </div>
  );
}
