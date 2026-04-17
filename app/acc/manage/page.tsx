import { Fragment } from 'react';
import { listProjects } from '@/src/tools/list-projects';
import { getDeadlines } from '@/src/tools/get-deadlines';
import { getFeeLedger } from '@/src/tools/fee-ledger';
import { getDb } from '@/src/db';
import type { ProjectSummary, ProjectStatus } from '@/src/types';
import StatusBadge from '../../components/StatusBadge';
import DeadlineAlerts from '../../components/DeadlineAlert';
import FeeLedgerCard from '../../components/FeeLedgerCard';
import ProjectTableRow from '../../components/ProjectTableRow';

const STATUS_ORDER: ProjectStatus[] = [
  'preliminary_review',
  'final_review',
  'approved',
  'under_construction',
  'inquiry',
  'on_hold',
  'complete',
];

const TYPE_LABELS: Record<string, string> = {
  new_residence: 'New Residence',
  major_remodel: 'Major Remodel',
  minor_remodel: 'Minor Remodel',
  landscaping: 'Landscaping',
};

function ProjectsTable({ byStatus, all }: { byStatus?: Record<string, ProjectSummary[]>; all?: ProjectSummary[] }) {
  const rows = all ?? [];
  const grouped = byStatus ?? {};

  if (rows.length === 0 && Object.keys(grouped).length === 0) {
    return <p className="text-sm text-gray-400 py-4">No projects.</p>;
  }

  return (
    <table className="w-full text-sm table-fixed">
      <colgroup>
        <col className="w-28" />
        <col className="w-16" />
        <col className="w-1/4" />
        <col className="w-1/4" />
        <col className="w-40" />
      </colgroup>
      <thead>
        <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
          <th className="text-left pb-2 font-medium">ID</th>
          <th className="text-left pb-2 font-medium">Lot</th>
          <th className="text-left pb-2 font-medium">Owner</th>
          <th className="text-left pb-2 font-medium">Type</th>
          <th className="text-left pb-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {all
          ? all.map((p) => <ProjectRow key={p.id} project={p} />)
          : Object.entries(grouped).map(([status, group]) => (
              <Fragment key={status}>
                <tr>
                  <td colSpan={5} className="pt-4 pb-2">
                    <StatusBadge status={status as ProjectStatus} />
                  </td>
                </tr>
                {group.map((p) => <ProjectRow key={p.id} project={p} />)}
              </Fragment>
            ))}
      </tbody>
    </table>
  );
}

function ProjectRow({ project: p }: { project: ProjectSummary }) {
  return (
    <ProjectTableRow id={p.id}>
      <td className="py-2 font-mono text-xs text-gray-600">{p.id}</td>
      <td className="py-2 text-gray-700">{p.lot}</td>
      <td className="py-2 text-gray-900 truncate pr-2">{p.owner}</td>
      <td className="py-2 text-gray-600">{TYPE_LABELS[p.type] ?? p.type}</td>
      <td className="py-2"><StatusBadge status={p.status} /></td>
    </ProjectTableRow>
  );
}

export default async function AccPage() {
  const db = getDb();
  const [projects, deadlines, ledger] = await Promise.all([
    listProjects({}, db),
    getDeadlines({ days_ahead: 90 }, db),
    getFeeLedger(db),
  ]);

  const activeProjects = projects.filter((p) => p.status !== 'complete');
  const completedProjects = projects.filter((p) => p.status === 'complete');

  const byStatus = STATUS_ORDER.reduce<Record<string, ProjectSummary[]>>((acc, status) => {
    const group = activeProjects.filter((p) => p.status === status);
    if (group.length > 0) acc[status] = group;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ACC Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold" style={{ color: 'var(--hoa-green)' }}>{activeProjects.length}</div>
          <div className="text-sm text-gray-500 mt-1">Active Projects</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-red-600">{deadlines.length}</div>
          <div className="text-sm text-gray-500 mt-1">Upcoming Deadlines (90d)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-orange-600">
            ${ledger.total_outstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-gray-500 mt-1">Outstanding Fees</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DeadlineAlerts deadlines={deadlines} />
        <FeeLedgerCard ledger={ledger} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Active Projects</h2>
        <ProjectsTable byStatus={byStatus} />
      </div>

      {completedProjects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Completed Projects</h2>
          <ProjectsTable all={completedProjects} />
        </div>
      )}
    </div>
  );
}
