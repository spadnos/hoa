import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getFeeLedger } from '@/src/tools/fee-ledger';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import FeesTable from './FeesTable';

export default async function FeesPage() {
  const session = await getSession();
  if (!hasPermission(session, 'acc_manage')) redirect('/');

  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;
  const ledger = await getFeeLedger(db, orgId);

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outstanding Fees</h1>
        <div className="text-xl font-bold text-red-600">{fmt(ledger.total_outstanding)}</div>
      </div>
      <FeesTable projects={ledger.projects} totalOutstanding={ledger.total_outstanding} />
    </div>
  );
}
