'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/src/db';
import { derivePermissions } from './permissions';
import { createSession, clearSession } from './session';
import type { GroupMembership, LotAssociation } from '@/src/types';

export async function loginAction(partyId: number): Promise<void> {
  const db = getDb();

  const party = db.prepare(
    `SELECT id, name FROM parties WHERE id = ? AND type = 'person'`
  ).get(partyId) as { id: number; name: string } | undefined;

  if (!party) throw new Error('Party not found');

  const memberships = db.prepare(
    `SELECT * FROM group_memberships WHERE party_id = ? AND end_date IS NULL`
  ).all(partyId) as GroupMembership[];

  const lotAssociations = db.prepare(
    `SELECT * FROM lot_associations WHERE party_id = ? AND end_date IS NULL`
  ).all(partyId) as LotAssociation[];

  const permissions = derivePermissions(memberships, lotAssociations);
  await createSession({ partyId: party.id, name: party.name, permissions });

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}
