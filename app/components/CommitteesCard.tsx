import Link from 'next/link';

const COMMITTEES = [
  { name: 'Architectural Control Committee (ACC)', href: '/acc' },
];

export default function CommitteesCard() {
  return (
    <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Committees</h2>
      <ul className="space-y-1">
        {COMMITTEES.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="text-sm text-blue-600 hover:underline">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
