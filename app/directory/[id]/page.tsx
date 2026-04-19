import { notFound } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { getPartyById } from '@/src/tools/get-parties';
import PartyProfileClient from '@/app/components/PartyProfileClient';

export default async function PartyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const match = id.match(/^party-(\d+)$/);
  if (!match) notFound();

  const numId = parseInt(match[1], 10);
  const [db, session] = [getDb(), await getSession()];
  const party = await getPartyById(numId, db, session?.organizationId ?? ORG_ID);
  if (!party) notFound();

  return <PartyProfileClient party={party} />;
}
