import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { getLots } from '@/src/tools/get-lots';
import LotsClient from '../components/LotsClient';

export default async function LotsPage() {
  const [db, session] = [getDb(), await getSession()];
  const lots = getLots(db, session?.organizationId ?? ORG_ID);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lots</h1>
      </div>
      <LotsClient lots={lots} />
    </div>
  );
}
