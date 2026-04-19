import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import GroupsClient from './GroupsClient';

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

const GROUP_ORDER = ['board', 'acc', 'management', 'utility', 'vendor'];

export default async function GroupsPage() {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) redirect('/');

  const db = getDb();
  const orgId = session?.organizationId ?? ORG_ID;

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

  const presentGroups = [...new Set(memberRows.map((m) => m.group_name))];
  const allGroups = [...new Set([...GROUP_ORDER, ...presentGroups])];

  const groups = allGroups.map((name) => ({
    group_name: name,
    members: memberRows.filter((m) => m.group_name === name),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Groups</h1>
      <GroupsClient groups={groups} parties={partyRows} />
    </div>
  );
}
