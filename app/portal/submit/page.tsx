import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import SubmitProjectClient from './SubmitProjectClient';

export interface LotOption {
  id: number;
  lotNumber: number;
  address: string;
  ownerName: string;
}

export default async function SubmitProjectPage() {
  const session = await getSession();
  if (!session || !hasPermission(session, 'homeowner')) redirect('/');

  const db = getDb();
  const orgId = session.organizationId ?? ORG_ID;
  const partyId = session.partyId;

  const rows = db
    .prepare(
      `SELECT l.id, l.lot_number, laddr.address, p.name
       FROM lot_associations la
       JOIN lots l ON l.id = la.lot_id
       LEFT JOIN lot_addresses laddr ON laddr.lot_id = l.id
       LEFT JOIN parties p ON p.id = la.party_id
       WHERE la.party_id = ? AND la.end_date IS NULL AND l.organization_id = ?
       GROUP BY l.id
       ORDER BY l.lot_number`
    )
    .all(partyId, orgId) as Array<{
    id: number;
    lot_number: number;
    address: string | null;
    name: string | null;
  }>;

  const lots: LotOption[] = rows.map((r) => ({
    id: r.id,
    lotNumber: r.lot_number,
    address: r.address ?? '',
    ownerName: r.name ?? '',
  }));

  if (lots.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Submit a Project</h1>
        <p className="text-sm text-gray-500">
          No lots are associated with your account. Contact the HOA office for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Project</h1>
      <p className="text-sm text-gray-500 mb-6">
        Describe what you&apos;d like to do and the assistant will determine whether ACC approval is
        needed and help you start the application.
      </p>
      <SubmitProjectClient lots={lots} />
    </div>
  );
}
