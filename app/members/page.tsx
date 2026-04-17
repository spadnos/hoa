import { getContacts } from '@/src/tools/get-contacts';
import { getMembers } from '@/src/tools/get-members';
import { getDb } from '@/src/db';
import type { Member } from '@/src/types';
import ContactsCard from '../components/ContactsCard';

function MembersTable({ members, title }: { members: Member[]; title: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {members.length === 0 ? (
        <p className="text-sm text-gray-400">No records yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Lot</th>
              <th className="text-left pb-2 font-medium">Name</th>
              <th className="text-left pb-2 font-medium">Email</th>
              <th className="text-left pb-2 font-medium">Phone</th>
              <th className="text-left pb-2 font-medium">Mailing Address</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-medium text-gray-700">{m.lot}</td>
                <td className="py-2 text-gray-900">
                  {m.name}
                  {m.is_primary_contact && (
                    <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </td>
                <td className="py-2">
                  {m.email ? (
                    <a href={`mailto:${m.email}`} className="text-blue-600 hover:underline">{m.email}</a>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2 text-gray-600">{m.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="py-2 text-gray-600 text-xs">{m.mailing_address ?? <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function MembersPage() {
  const db = getDb();
  const [contacts, members] = await Promise.all([
    getContacts(db),
    getMembers({}, db),
  ]);

  const legalOwners = members.filter((m) => m.role === 'legal_owner');
  const residents = members.filter((m) => m.role === 'resident');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Member Directory</h1>
      <div className="space-y-6">
        <ContactsCard contacts={contacts} title="ACC & Board Members" />
        <MembersTable members={legalOwners} title="Legal Owners" />
        <MembersTable members={residents} title="Residents" />
      </div>
    </div>
  );
}
