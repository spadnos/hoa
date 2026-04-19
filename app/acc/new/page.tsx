import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import NewProjectForm from '@/app/components/NewProjectForm';
import type { LotSearchResult } from '@/app/api/lots/route';

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session) redirect('/acc');

  const db = getDb();
  const orgId = session.organizationId ?? ORG_ID;
  const isManager = hasPermission(session, 'acc_manage');

  let lots: LotSearchResult[];

  if (isManager) {
    lots = db.prepare(`
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
  } else {
    lots = db.prepare(`
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
        AND EXISTS (
          SELECT 1 FROM lot_associations ua
          WHERE ua.lot_id = l.id AND ua.party_id = ? AND ua.end_date IS NULL
        )
      ORDER BY l.lot_number, la.address
    `).all(orgId, session.partyId) as LotSearchResult[];
  }

  return (
    <div className="max-w-xl">
      <Link href="/acc" className="text-sm text-gray-500 hover:text-gray-900 mb-6 block">
        ← ACC
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Project</h1>
      <NewProjectForm lots={lots} />
    </div>
  );
}
