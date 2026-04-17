import { getContacts } from '@/src/tools/get-contacts';
import { getMembers } from '@/src/tools/get-members';
import { getDb } from '@/src/db';
import DirectoryClient, { type DirectoryEntry } from '../components/DirectoryClient';

export default async function MembersPage() {
  const db = getDb();
  const [contacts, members] = await Promise.all([
    getContacts(db),
    getMembers({}, db),
  ]);

  // Build entries from members table
  const entries: DirectoryEntry[] = members.map((m) => ({
    key: `member-${m.id}`,
    name: m.name,
    email: m.email,
    phone: m.phone,
    lot: m.lot,
    mailing_address: m.mailing_address,
    is_primary_contact: m.is_primary_contact,
    labels: [m.role === 'legal_owner' ? 'Legal Owner' : 'Resident'],
    committee_role: null,
  }));

  // Merge contacts into entries (match by email, then name)
  const allContacts = [
    ...contacts.acc_members.map((c) => ({ ...c, label: 'ACC Member' as const })),
    ...contacts.board_members.map((c) => ({ ...c, label: 'Board Member' as const })),
  ];

  for (const contact of allContacts) {
    const match = entries.find(
      (e) =>
        (contact.email && e.email && contact.email.toLowerCase() === e.email.toLowerCase()) ||
        contact.name.toLowerCase() === e.name.toLowerCase()
    );
    if (match) {
      if (!match.labels.includes(contact.label)) match.labels.push(contact.label);
      if (!match.committee_role) match.committee_role = contact.role;
    } else {
      entries.push({
        key: `contact-${contact.name}`,
        name: contact.name,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        lot: null,
        mailing_address: null,
        is_primary_contact: false,
        labels: [contact.label],
        committee_role: contact.role,
      });
    }
  }

  // Sort: lot-based entries first (by lot), then committee-only entries (by name)
  entries.sort((a, b) => {
    if (a.lot !== null && b.lot !== null) return a.lot - b.lot;
    if (a.lot !== null) return -1;
    if (b.lot !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Member Directory</h1>
      <DirectoryClient entries={entries} />
    </div>
  );
}
