import { notFound } from 'next/navigation';
import { getDb } from '@/src/db';
import { getPartyById } from '@/src/tools/get-parties';
import PartyProfileClient from '@/app/components/PartyProfileClient';

export default async function PartyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const match = id.match(/^party-(\d+)$/);
  if (!match) notFound();

  const numId = parseInt(match[1], 10);
  const db = getDb();
  const party = await getPartyById(numId, db);
  if (!party) notFound();

  return <PartyProfileClient party={party} />;
}
