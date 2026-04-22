import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getDb, ORG_ID } from '@/src/db';
import { getProject } from '@/src/tools/get-project';
import { listConditions } from '@/src/tools/list-conditions';
import { listInspections } from '@/src/tools/list-inspections';
import { listProjectDocuments } from '@/src/tools/list-project-documents';
import { listProjectApprovals } from '@/src/tools/list-project-approvals';
import type { Condition, Inspection, ProjectType } from '@/src/types';
import ProjectApprovalsSection from '@/app/components/ProjectApprovalsSection';
import { getSession } from '@/src/auth/session';
import { hasPermission } from '@/src/auth/permissions';
import ProjectContactsSection from '@/app/components/ProjectContactsSection';
import ProjectDocumentsSection from '@/app/components/ProjectDocumentsSection';
import ProjectFeesSection from '@/app/components/ProjectFeesSection';
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


export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, session] = [getDb(), await getSession()];
  const orgId = session?.organizationId ?? ORG_ID;

  const [project, conditions, inspections, documents, approvals] = await Promise.all([
    getProject({ id }, db, orgId),
    listConditions({ project_id: id }, db, orgId),
    listInspections({ project_id: id }, db, orgId),
    listProjectDocuments({ project_id: id }, db, orgId),
    listProjectApprovals({ project_id: id }, db, orgId),
  ]);

  if (typeof project === 'string') {
    notFound();
  }

  const isAdmin = hasPermission(session, 'acc_manage');

  const contactPartyIds = [
    project.owner?.party_id,
    project.designer?.party_id,
    project.contractor?.party_id,
    ...(project.additional_contacts?.map((c) => c.party_id) ?? []),
  ].filter((pid): pid is number => typeof pid === 'number');

  let isLotParticipant = false;
  if (!isAdmin) {
    const projectRow = db
      .prepare('SELECT lot_id FROM projects WHERE id = ?')
      .get(id) as { lot_id: number } | undefined;

    isLotParticipant =
      !!projectRow &&
      !!db
        .prepare(
          'SELECT 1 FROM lot_associations WHERE party_id = ? AND lot_id = ? AND end_date IS NULL'
        )
        .get(session?.partyId, projectRow?.lot_id);

    if (!isLotParticipant && !contactPartyIds.includes(session?.partyId ?? -1)) {
      redirect('/');
    }
  }

  const canUpload = isAdmin || isLotParticipant || contactPartyIds.includes(session?.partyId ?? -1);

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

      {approvals.some((a) => a.is_warning_indicator && (a.status === null || a.status === 'pending')) && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="text-amber-500 font-bold">⚠</span>
          One or more external agency approvals are pending for this project.
        </div>
      )}

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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectFeesSection
              projectId={project.id}
              initialFees={project.fees}
              isAdmin={isAdmin}
              projectType={project.type}
            />
          </CardContent>
        </Card>

        {/* Conditions */}
        <ConditionsCard conditions={conditions} />

        {/* Inspections */}
        <InspectionsCard inspections={inspections} />

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectDocumentsSection
              projectId={project.id}
              initialDocuments={documents}
              isAdmin={isAdmin}
              canUpload={canUpload}
            />
          </CardContent>
        </Card>

        {/* External Approvals */}
        {approvals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">External Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectApprovalsSection
                projectId={project.id}
                initialApprovals={approvals}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        )}

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
