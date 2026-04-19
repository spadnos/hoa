'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectFees } from '@/src/tools/fee-ledger';

function MarkPaidButton({ feeId, projectId }: { feeId: number; projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMarkPaid() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}/fees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee_id: feeId, paid: true }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={handleMarkPaid}
      disabled={loading}
      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
    >
      {loading ? '…' : 'Mark Paid'}
    </button>
  );
}

export default function FeesTable({
  projects,
  totalOutstanding,
}: {
  projects: ProjectFees[];
  totalOutstanding: number;
}) {
  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No outstanding fees.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium">Project</th>
            <th className="text-left px-4 py-3 font-medium">Lot</th>
            <th className="text-left px-4 py-3 font-medium">Owner</th>
            <th className="text-left px-4 py-3 font-medium">Description</th>
            <th className="text-left px-4 py-3 font-medium">Due At</th>
            <th className="text-right px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) =>
            p.unpaid_fees.map((fee, i) => (
              <tr
                key={fee.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                {i === 0 ? (
                  <>
                    <td
                      rowSpan={p.unpaid_fees.length}
                      className="px-4 py-2 align-top font-mono text-xs text-gray-700 border-r border-gray-100"
                    >
                      <Link
                        href={`/projects/${p.project_id}`}
                        className="hover:underline text-blue-600"
                      >
                        {p.project_id}
                      </Link>
                    </td>
                    <td
                      rowSpan={p.unpaid_fees.length}
                      className="px-4 py-2 align-top text-gray-700 border-r border-gray-100"
                    >
                      {p.lot}
                    </td>
                    <td
                      rowSpan={p.unpaid_fees.length}
                      className="px-4 py-2 align-top text-gray-900 border-r border-gray-100"
                    >
                      {p.owner}
                    </td>
                  </>
                ) : null}
                <td className="px-4 py-2 text-gray-700">{fee.description}</td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                  {fee.due_at.replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2 text-right font-medium text-red-700">
                  {fmt(fee.amount)}
                </td>
                <td className="px-4 py-2 text-right">
                  <MarkPaidButton feeId={fee.id} projectId={p.project_id} />
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50">
            <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">
              Total Outstanding
            </td>
            <td className="px-4 py-3 text-right font-bold text-red-700">
              {fmt(totalOutstanding)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
