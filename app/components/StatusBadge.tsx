import type { ProjectStatus } from '@/src/types';

const colors: Record<ProjectStatus, string> = {
  inquiry: 'bg-gray-100 text-gray-700',
  preliminary_review: 'bg-blue-100 text-blue-800',
  final_review: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-green-100 text-green-800',
  under_construction: 'bg-yellow-100 text-yellow-800',
  complete: 'bg-emerald-100 text-emerald-800',
  on_hold: 'bg-red-100 text-red-800',
};

const labels: Record<ProjectStatus, string> = {
  inquiry: 'Inquiry',
  preliminary_review: 'Preliminary Review',
  final_review: 'Final Review',
  approved: 'Approved',
  under_construction: 'Under Construction',
  complete: 'Complete',
  on_hold: 'On Hold',
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
