import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import StatusBadge from '@/app/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectStatus } from '@/src/types';

const TYPE_LABELS: Record<string, string> = {
  new_residence: 'New Residence',
  major_remodel: 'Major Remodel',
  minor_remodel: 'Minor Remodel',
  landscaping: 'Landscaping',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  resident: 'Resident',
  trustee: 'Trustee',
  corporate_owner: 'Corporate Owner',
};

interface LotSummary {
  id: number;
  lot_number: number;
  role: string;
  addresses: string[];
}

interface ProjectRow {
  id: string;
  lot_number: number;
  type: string;
  status: ProjectStatus;
  submitted: string;
}

interface FeeRow {
  id: number;
  project_id: string;
  description: string;
  amount: number;
  due_at: string | null;
}

interface LibraryDocRow {
  id: number;
  title: string;
  category: string | null;
}

export default async function PortalPage() {
  const session = await getSession();
  if (!hasPermission(session, 'homeowner')) redirect('/');

  const db = getDb();
  const orgId = session!.organizationId ?? ORG_ID;
  const partyId = session!.partyId;

  const lotRows = db
    .prepare(
      `SELECT l.id, l.lot_number, la.role,
              GROUP_CONCAT(laddr.address, ' | ') as addresses
       FROM lot_associations la
       JOIN lots l ON l.id = la.lot_id
       LEFT JOIN lot_addresses laddr ON laddr.lot_id = l.id
       WHERE la.party_id = ? AND la.end_date IS NULL AND l.organization_id = ?
       GROUP BY l.id, l.lot_number, la.role
       ORDER BY l.lot_number`
    )
    .all(partyId, orgId) as Array<{
      id: number;
      lot_number: number;
      role: string;
      addresses: string | null;
    }>;

  const lots: LotSummary[] = lotRows.map((r) => ({
    id: r.id,
    lot_number: r.lot_number,
    role: r.role,
    addresses: r.addresses ? r.addresses.split(' | ') : [],
  }));

  const lotIds = lots.map((l) => l.id);

  let projects: ProjectRow[] = [];
  if (lotIds.length > 0) {
    const placeholders = lotIds.map(() => '?').join(', ');
    projects = db
      .prepare(
        `SELECT p.id, l.lot_number, p.type, p.status, p.submitted
         FROM projects p
         JOIN lots l ON l.id = p.lot_id
         WHERE p.organization_id = ? AND l.id IN (${placeholders})
         ORDER BY p.submitted DESC`
      )
      .all(orgId, ...lotIds) as ProjectRow[];
  }

  let fees: FeeRow[] = [];
  if (projects.length > 0) {
    const projectIds = projects.map((p) => p.id);
    const placeholders = projectIds.map(() => '?').join(', ');
    fees = db
      .prepare(
        `SELECT f.id, f.project_id, f.description, f.amount, f.due_at
         FROM fees f
         WHERE f.project_id IN (${placeholders}) AND f.paid_at IS NULL
         ORDER BY f.due_at ASC NULLS LAST`
      )
      .all(...projectIds) as FeeRow[];
  }

  // library_documents table is created in FR-4 — gracefully skip if not yet present
  let docs: LibraryDocRow[] = [];
  try {
    docs = db
      .prepare(
        `SELECT id, title, category
         FROM library_documents
         WHERE organization_id = ? AND access_tier IN ('public', 'members')
         ORDER BY category, title`
      )
      .all(orgId) as LibraryDocRow[];
  } catch {
    // FR-4 not yet implemented
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const totalOutstanding = fees.reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Lots</CardTitle>
          </CardHeader>
          <CardContent>
            {lots.length === 0 ? (
              <p className="text-sm text-gray-400">No lots associated with your account.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="text-sm font-medium">
                        <Link href={`/lots/${lot.id}`} className="text-blue-600 hover:underline">
                          Lot {lot.lot_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {lot.addresses.length > 0 ? lot.addresses.join(', ') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {ROLE_LABELS[lot.role] ?? lot.role}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ACC Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-400">No ACC projects.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-mono">
                        <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">
                          {p.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">Lot {p.lot_number}</TableCell>
                      <TableCell className="text-sm">{TYPE_LABELS[p.type] ?? p.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{p.submitted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Outstanding Fees</CardTitle>
              {fees.length > 0 && (
                <span className="text-sm font-semibold text-red-600">
                  {fmt(totalOutstanding)} due
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <p className="text-sm text-gray-400">No outstanding fees.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm font-mono">
                        <Link
                          href={`/projects/${f.project_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {f.project_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{f.description}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(f.amount)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {f.due_at ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {docs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-sm">
                        <Link
                          href={`/api/documents/${doc.id}/download`}
                          className="text-blue-600 hover:underline"
                        >
                          {doc.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {doc.category ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
