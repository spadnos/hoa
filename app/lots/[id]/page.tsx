import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/src/db';
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

function AssociationsTable({ associations }: { associations: ReturnType<typeof getLotById> extends infer T ? T extends { associations: infer A } ? A : never : never }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Primary Contact</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {associations.map((a) => (
          <TableRow key={a.party_id}>
            <TableCell className="text-sm">{ROLE_LABELS[a.role] ?? a.role}</TableCell>
            <TableCell className="text-sm">
              <Link href={`/directory/party-${a.party_id}`} className="text-blue-600 hover:underline">
                {a.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-gray-500">
              {a.is_primary_contact ? 'Yes' : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const db = getDb();
  const lot = getLotById(numId, db);
  if (!lot) notFound();

  const projects = await listProjects({ lot: lot.lot_number }, db);

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
                {lot.associations.length === 0 ? (
                  <p className="text-sm text-gray-400">No current associations.</p>
                ) : (
                  <AssociationsTable associations={lot.associations} />
                )}
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
                  {assocs.length === 0 ? (
                    <p className="text-sm text-gray-400">No current associations.</p>
                  ) : (
                    <AssociationsTable associations={assocs} />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

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
