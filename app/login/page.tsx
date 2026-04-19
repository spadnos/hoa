import { redirect } from 'next/navigation';
import { getSession } from '@/src/auth/session';
import { getDb, ORG_ID } from '@/src/db';
import type { Party } from '@/src/types';
import LoginClient from '../components/LoginClient';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/');

  const db = getDb();
  const parties = db.prepare(
    `SELECT id, name FROM parties
     WHERE type = 'person' AND organization_id = ?
     ORDER BY name ASC`
  ).all(ORG_ID) as Pick<Party, 'id' | 'name'>[];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div
          className="rounded-xl p-6 text-white mb-8 text-center shadow-md"
          style={{ backgroundColor: 'var(--hoa-green)' }}
        >
          <h1 className="text-2xl font-bold tracking-tight">East Meadows HOA</h1>
          <p className="text-sm mt-1 opacity-80">Select your name to continue</p>
        </div>

        <LoginClient entries={parties} />
      </div>
    </div>
  );
}
