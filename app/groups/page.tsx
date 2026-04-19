import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import GroupsClient from './GroupsClient';

interface GroupRow {
  name: string;
  label: string;
  description: string | null;
}

interface MemberRow {
  id: number;
  party_id: number;
  group_name: string;
  title: string | null;
  start_date: string | null;
  party_name: string;
}

interface PartyRow {
  id: number;
  name: string;
}

export default async function GroupsPage() {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) redirect('/');

  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;

  const groupRows = db
    .prepare(
      `SELECT name, label, description
       FROM groups
       WHERE organization_id = ?
       ORDER BY sort_order, name`
    )
    .all(orgId) as GroupRow[];

  const memberRows = db
    .prepare(
      `SELECT gm.id, gm.party_id, gm.group_name, gm.title, gm.start_date, p.name as party_name
       FROM group_memberships gm
       JOIN parties p ON p.id = gm.party_id
       WHERE gm.end_date IS NULL AND p.organization_id = ?
       ORDER BY gm.group_name, p.name`
    )
    .all(orgId) as MemberRow[];

  const partyRows = db
    .prepare(
      `SELECT id, name FROM parties WHERE organization_id = ? AND type = 'person' ORDER BY name`
    )
    .all(orgId) as PartyRow[];

  const groups = groupRows.map((g) => ({
    group_name: g.name,
    label: g.label,
    description: g.description,
    members: memberRows.filter((m) => m.group_name === g.name),
  }));

  return <GroupsClient groups={groups} parties={partyRows} />;
}
