import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getProject } from '@/src/tools/get-project';
import { listConditions } from '@/src/tools/list-conditions';
import { listInspections } from '@/src/tools/list-inspections';
import { listProjectDocuments } from '@/src/tools/list-project-documents';
import type { Fee, Condition, Inspection, ProjectDocument, ProjectType } from '@/src/types';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import ProjectContactsSection from '@/app/components/ProjectContactsSection';
import StatusBadge from '@/app/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TYPE_LABELS: Record<ProjectType, string> = {
  new_residence: 'New Residence',
  major_remodel: 'Major Remodel',
  minor_remodel: 'Minor Remodel',
  landscaping: 'Landscaping',
  notification_only: 'Notification Only',
};

const MILESTONE_LABELS: Record<string, string> = {
  preliminary_approved_at: 'Preliminary Approved',
  final_approved_at: 'Final Approved',
  construction_started_at: 'Construction Started',
  owner_notified_complete_at: 'Owner Notified Complete',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-44 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}


function FeesCard({ fees }: { fees: Fee[] }) {
  const totalOwed = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.filter((f) => f.paid).reduce((sum, f) => sum + f.amount, 0);
  const outstanding = totalOwed - totalPaid;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fees</CardTitle>
      </CardHeader>
      <CardContent>
        {fees.length === 0 ? (
          <p className="text-sm text-gray-400">No fees recorded.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Due At</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{fee.description}</TableCell>
                    <TableCell className="text-sm text-gray-600 capitalize">
                      {fee.due_at.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      ${fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {fee.paid ? (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                          Paid {formatDate(fee.paid)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                          Outstanding
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-6 text-sm">
              <span className="text-gray-500">
                Paid:{' '}
                <span className="font-semibold text-green-700">
                  ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </span>
              <span className="text-gray-500">
                Outstanding:{' '}
                <span className="font-semibold text-orange-700">
                  ${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </span>
              <span className="text-gray-500">
                Total:{' '}
                <span className="font-semibold text-gray-900">
                  ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ConditionsCard({ conditions }: { conditions: Condition[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        {conditions.length === 0 ? (
          <p className="text-sm text-gray-400">No conditions recorded.</p>
        ) : (
          <ul className="space-y-2">
            {conditions.map((c) => (
              <li key={c.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">
                  {c.satisfied_at ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">
                      ○
                    </span>
                  )}
                </span>
                <div>
                  <p className="text-sm text-gray-900">{c.description}</p>
                  {c.satisfied_at && (
                    <p className="text-xs text-gray-500 mt-0.5">Satisfied {formatDate(c.satisfied_at)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InspectionsCard({ inspections }: { inspections: Inspection[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inspections</CardTitle>
      </CardHeader>
      <CardContent>
        {inspections.length === 0 ? (
          <p className="text-sm text-gray-400">No inspections recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((insp) => (
                <TableRow key={insp.id}>
                  <TableCell className="text-sm font-mono">{formatDate(insp.date)}</TableCell>
                  <TableCell className="text-sm">{insp.type}</TableCell>
                  <TableCell className="text-sm">{insp.inspector}</TableCell>
                  <TableCell className="text-sm">
                    <Badge
                      variant="outline"
                      className={
                        insp.outcome.toLowerCase().includes('pass')
                          ? 'text-green-700 border-green-300 bg-green-50'
                          : insp.outcome.toLowerCase().includes('fail')
                          ? 'text-red-700 border-red-300 bg-red-50'
                          : 'text-gray-700 border-gray-200'
                      }
                    >
                      {insp.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{insp.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsCard({ documents }: { documents: ProjectDocument[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">No documents indexed.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                {doc.description && <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>}
                <p className="text-xs font-mono text-gray-400 mt-1 break-all">{doc.file_path}</p>
                <p className="text-xs text-gray-400 mt-0.5">Uploaded {formatDate(doc.uploaded_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  const [project, conditions, inspections, documents] = await Promise.all([
    getProject({ id }, db, orgId),
    listConditions({ project_id: id }, db, orgId),
    listInspections({ project_id: id }, db, orgId),
    listProjectDocuments({ project_id: id }, db, orgId),
  ]);

  if (typeof project === 'string') {
    notFound();
  }

  if (!hasPermission(session, 'acc_manage')) {
    const projectRow = db
      .prepare('SELECT lot_id FROM projects WHERE id = ?')
      .get(id) as { lot_id: number } | undefined;

    const isLotParticipant =
      projectRow &&
      !!db
        .prepare(
          'SELECT 1 FROM lot_associations WHERE party_id = ? AND lot_id = ? AND end_date IS NULL'
        )
        .get(session?.partyId, projectRow.lot_id);

    const contactPartyIds = [
      project.owner?.party_id,
      project.designer?.party_id,
      project.contractor?.party_id,
      ...(project.additional_contacts?.map((c) => c.party_id) ?? []),
    ].filter((pid): pid is number => typeof pid === 'number');

    if (!isLotParticipant && !contactPartyIds.includes(session?.partyId ?? -1)) {
      redirect('/');
    }
  }

  const milestones = [
    'preliminary_approved_at',
    'final_approved_at',
    'construction_started_at',
    'owner_notified_complete_at',
  ] as const;

  const hasTimeline = milestones.some((m) => project[m]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/acc"
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          ← ACC
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-mono font-medium">{project.id}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project {project.id}</h1>
        <StatusBadge status={project.status} />
      </div>

      <div className="space-y-5">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-50">
              <InfoRow label="Lot" value={project.lot} />
              <InfoRow label="Address" value={project.address} />
              <InfoRow label="Type" value={TYPE_LABELS[project.type]} />
              <InfoRow label="Status" value={<StatusBadge status={project.status} />} />
              <InfoRow label="Submitted" value={formatDate(project.submitted)} />
              {project.notes && <InfoRow label="Notes" value={project.notes} />}
            </div>

            {hasTimeline && (
              <>
                <Separator className="my-4" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Timeline
                </h3>
                <div className="divide-y divide-gray-50">
                  {milestones.map((m) =>
                    project[m] ? (
                      <InfoRow key={m} label={MILESTONE_LABELS[m]} value={formatDate(project[m]!)} />
                    ) : null
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectContactsSection
              projectId={project.id}
              owner={project.owner}
              designer={project.designer}
              contractor={project.contractor}
              initialAdditional={project.additional_contacts ?? []}
            />
          </CardContent>
        </Card>

        {/* Fees */}
        <FeesCard fees={project.fees} />

        {/* Conditions */}
        <ConditionsCard conditions={conditions} />

        {/* Inspections */}
        <InspectionsCard inspections={inspections} />

        {/* Documents */}
        <DocumentsCard documents={documents} />

        {/* Communications placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gray-50 border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm font-medium text-gray-500">Communications tracking coming soon</p>
              <p className="text-xs text-gray-400 mt-1">
                This section will show email correspondence, notices, and owner communications related to this project.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
