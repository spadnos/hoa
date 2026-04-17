import { getDb } from '@/src/db';
import { getLots } from '@/src/tools/get-lots';
import LotsClient from '../components/LotsClient';

export default function LotsPage() {
  const db = getDb();
  const lots = getLots(db);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lots</h1>
      </div>
      <LotsClient lots={lots} />
    </div>
  );
}
