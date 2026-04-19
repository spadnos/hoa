import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import type { Announcement } from '@/src/types';
import AnnouncementsClient from './AnnouncementsClient';

export default async function AdminAnnouncementsPage() {
  const session = await getSession();
  if (!hasPermission(session, 'admin')) redirect('/');

  const db = getDb();
  const orgId = session!.organizationId ?? ORG_ID;

  const announcements = db.prepare<unknown[], Announcement>(
    `SELECT * FROM announcements WHERE organization_id = ? ORDER BY visible_from DESC`
  ).all(orgId);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <AnnouncementsClient announcements={announcements} />
    </div>
  );
}
