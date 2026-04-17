import type { FeeLedgerResult } from '@/src/tools/fee-ledger';

export default function FeeLedgerCard({ ledger }: { ledger: FeeLedgerResult }) {
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Outstanding Fees</h2>
        <span className="text-lg font-bold text-red-600">{fmt(ledger.total_outstanding)}</span>
      </div>
      {ledger.projects.length === 0 ? (
        <p className="text-sm text-gray-400">No outstanding fees.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Project</th>
              <th className="text-left pb-2 font-medium">Owner</th>
              <th className="text-right pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ledger.projects.map((p) => (
              <tr key={p.project_id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-mono text-xs text-gray-700">{p.project_id}</td>
                <td className="py-2 text-gray-600">{p.owner}</td>
                <td className="py-2 text-right font-medium text-red-700">{fmt(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
