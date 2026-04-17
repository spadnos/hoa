const MOCK_ANNOUNCEMENTS = [
  {
    id: 1,
    date: '2026-04-10',
    title: 'Spring ACC Meeting',
    body: 'The next ACC review meeting is scheduled for May 6th at 6:00 PM. All pending project owners are encouraged to attend.',
  },
  {
    id: 2,
    date: '2026-03-28',
    title: 'Earthwork Blackout Ends April 1',
    body: 'The annual earthwork blackout period (Nov 1 – Apr 1) ends on April 1st. Projects with approved grading plans may resume earthwork.',
  },
  {
    id: 3,
    date: '2026-03-15',
    title: 'Design Guidelines Updated',
    body: 'The ACC has published updated design guidelines for 2026. Key changes include revised exterior color palette requirements.',
  },
];

export default function AnnouncementsCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Announcements</h2>
      <ul className="space-y-4">
        {MOCK_ANNOUNCEMENTS.map((a) => (
          <li key={a.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900">{a.title}</span>
              <span className="text-xs text-gray-400">{a.date}</span>
            </div>
            <p className="text-sm text-gray-600 leading-snug">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
