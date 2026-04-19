import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import { getLotById } from '@/src/tools/get-lots';
import { listProjects } from '@/src/tools/list-projects';
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
import LotAssociationsClient from './LotAssociationsClient';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  resident: 'Resident',
  trustee: 'Trustee',
  corporate_owner: 'Corporate Owner',
};

const TYPE_LABELS: Record<string, string> = {
  new_residence: 'New Residence',
  major_remodel: 'Major Remodel',
  minor_remodel: 'Minor Remodel',
  landscaping: 'Landscaping',
};

interface HistoryRow {
  id: number;
  party_id: number;
  name: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
}

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;
  const isAdmin = hasPermission(session, 'admin');
  const lot = getLotById(numId, db, orgId);
  if (!lot) notFound();

  const projects = await listProjects({ lot: lot.lot_number }, db, orgId);

  const historyRows = db
    .prepare(
      `SELECT la.id, la.party_id, p.name, la.role, la.start_date, la.end_date
       FROM lot_associations la
       JOIN parties p ON p.id = la.party_id
       WHERE la.lot_id = ?
       ORDER BY COALESCE(la.start_date, '0000-00-00') DESC, la.id DESC`
    )
    .all(numId) as HistoryRow[];

  const parties = isAdmin
    ? (db
        .prepare(`SELECT id, name FROM parties WHERE organization_id = ? ORDER BY name`)
        .all(orgId) as { id: number; name: string }[])
    : [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/lots" className="text-sm text-gray-500 hover:text-gray-900">
          ← Lots
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Lot {lot.lot_number}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Lot {lot.lot_number}</h1>
      {lot.notes && <p className="text-sm text-gray-500 mb-6">{lot.notes}</p>}
      {!lot.notes && <div className="mb-6" />}

      <div className="space-y-5">
        {lot.addresses.length === 0 ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">No addresses recorded.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Associations</CardTitle>
              </CardHeader>
              <CardContent>
                <LotAssociationsClient
                  associations={lot.associations}
                  lotId={lot.id}
                  isAdmin={isAdmin}
                  parties={parties}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          lot.addresses.map((addr) => {
            const assocs = lot.associations.filter(
              (a) => a.lot_address_id === addr.id || a.lot_address_id === null
            );
            return (
              <Card key={addr.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {addr.address}
                    {addr.unit ? <span className="font-normal text-gray-500"> #{addr.unit}</span> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LotAssociationsClient
                    associations={assocs}
                    lotId={lot.id}
                    isAdmin={isAdmin}
                    parties={parties}
                  />
                </CardContent>
              </Card>
            );
          })
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ownership History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyRows.length === 0 ? (
              <p className="text-sm text-gray-400">No history recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm">{ROLE_LABELS[row.role] ?? row.role}</TableCell>
                      <TableCell className="text-sm">
                        <Link href={`/directory/party-${row.party_id}`} className="text-blue-600 hover:underline">
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{row.start_date ?? '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {row.end_date ?? <span className="text-green-600">Current</span>}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="text-sm">
                        {TYPE_LABELS[p.type] ?? p.type}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
