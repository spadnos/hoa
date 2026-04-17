import type { Deadline } from '@/src/tools/get-deadlines';

function urgencyClass(days: number): string {
  if (days <= 7) return 'bg-red-50 border-red-300 text-red-800';
  if (days <= 21) return 'bg-yellow-50 border-yellow-300 text-yellow-800';
  return 'bg-blue-50 border-blue-300 text-blue-800';
}

export default function DeadlineAlerts({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) {
    return (
      <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Upcoming Deadlines</h2>
        <p className="text-sm text-gray-400">No deadlines in the next 90 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
      <ul className="space-y-2">
        {deadlines.map((d, i) => (
          <li key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${urgencyClass(d.days_remaining)}`}>
            <div>
              <span className="font-medium">Lot {d.lot}</span>
              <span className="mx-1 opacity-60">·</span>
              <span>{d.type}</span>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className="font-medium">{d.date}</span>
              <span className="ml-2 opacity-70">({d.days_remaining}d)</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
