import Link from 'next/link';
import type { HoaContact } from '@/src/types';

interface Props {
  contacts: HoaContact[];
}

export default function ManagementContactsCard({ contacts }: Props) {
  return (
    <div className="bg-gray-100 rounded-xl border-2 border-gray-300 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Management Contacts</h2>
      {contacts.length === 0 ? (
        <p className="text-sm text-gray-400">No management contacts found.</p>
      ) : (
        <ul className="space-y-0">
          {contacts.map((c) => (
            <li key={c.id} className="py-2 border-b border-gray-200 last:border-0">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/directory/party-${c.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                  {c.role && <span className="text-xs text-gray-500 ml-2">{c.role}</span>}
                </div>
              </div>
              <div className="flex gap-4 mt-0.5">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline">
                    {c.email}
                  </a>
                )}
                {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
