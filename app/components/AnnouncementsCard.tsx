import type { Announcement } from '@/src/types';

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementsCard({ announcements }: Props) {
  return (
    <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Announcements</h2>
      </div>
      {announcements.length === 0 ? (
        <p className="text-sm text-gray-500">No recent announcements.</p>
      ) : (
        <ul className="space-y-4">
          {announcements.map((a) => (
            <li key={a.id} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{a.title}</span>
                <span className="text-xs text-gray-400">{a.visible_from}</span>
              </div>
              <p className="text-sm text-gray-600 leading-snug">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
