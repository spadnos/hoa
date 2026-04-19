import path from 'path';
import type { Db } from '@/src/db';
import { hasPermission } from '@/src/auth/permissions';
import { getSession } from '@/src/auth/session';

export function projectUploadsDir(projectId: string): string {
  const base = process.env.UPLOADS_DIR
    ? path.join(process.env.UPLOADS_DIR, 'projects')
    : path.join(process.cwd(), 'uploads', 'projects');
  return path.join(base, projectId);
}

export function isProjectParticipant(
  session: Awaited<ReturnType<typeof getSession>>,
  projectId: string,
  db: Db,
  orgId: string
): boolean {
  if (!session?.partyId) return false;
  if (hasPermission(session, 'acc_manage')) return true;

  const row = db
    .prepare('SELECT lot_id, owner_party_id, designer_party_id, contractor_party_id FROM projects WHERE id = ? AND organization_id = ?')
    .get(projectId, orgId) as { lot_id: number; owner_party_id: number | null; designer_party_id: number | null; contractor_party_id: number | null } | undefined;

  if (!row) return false;

  if ([row.owner_party_id, row.designer_party_id, row.contractor_party_id].includes(session.partyId)) return true;

  const isContact = !!db
    .prepare('SELECT 1 FROM project_contacts WHERE project_id = ? AND party_id = ?')
    .get(projectId, session.partyId);
  if (isContact) return true;

  const isLotParticipant = !!db
    .prepare('SELECT 1 FROM lot_associations WHERE party_id = ? AND lot_id = ? AND end_date IS NULL')
    .get(session.partyId, row.lot_id);

  return isLotParticipant;
}
