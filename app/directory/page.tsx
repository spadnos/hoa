import Link from 'next/link';
import { getDirectoryParties } from '@/src/tools/get-parties';
import { getDb, ORG_ID } from '@/src/db';
import { getSession } from '@/src/auth/session';
import DirectoryClient, { type DirectoryEntry } from '../components/DirectoryClient';

const GROUP_LABEL: Record<string, string> = {
  acc: 'ACC Member',
  board: 'Board Member',
  management: 'Management',
  utility: 'Utility',
  vendor: 'Vendor',
};

export default async function DirectoryPage() {
  const [db, session] = [getDb(), await getSession()];
  const parties = await getDirectoryParties(db, session?.organizationId ?? ORG_ID);

  const entries: DirectoryEntry[] = parties.map((p) => {
    const labels: string[] = [];

    for (const assoc of p.lot_associations) {
      const label =
        assoc.role === 'owner' ? 'Legal Owner'
        : assoc.role === 'resident' ? 'Resident'
        : assoc.role === 'trustee' ? 'Trustee'
        : 'Corporate Owner';
      if (!labels.includes(label)) labels.push(label);
    }

    for (const m of p.current_memberships) {
      const label = GROUP_LABEL[m.group_name] ?? (m.group_name.charAt(0).toUpperCase() + m.group_name.slice(1));
      if (!labels.includes(label)) labels.push(label);
    }

    const primaryAssoc =
      p.lot_associations.find((a) => a.is_primary_contact) ?? p.lot_associations[0];
    const firstMembership = p.current_memberships[0];

    return {
      key: `party-${p.id}`,
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      lot: primaryAssoc?.lot_number ?? null,
      mailing_address: primaryAssoc?.mailing_address ?? null,
      is_primary_contact: primaryAssoc?.is_primary_contact ?? false,
      labels,
      committee_role: firstMembership?.title ?? null,
      party_type: p.type,
      org_type: p.org_type,
    };
  });

  entries.sort((a, b) => {
    if (a.lot !== null && b.lot !== null) return a.lot - b.lot;
    if (a.lot !== null) return -1;
    if (b.lot !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Directory</h1>
        <Link
          href="/directory/new"
          className="text-sm font-medium px-3 py-2 rounded-lg text-white"
          style={{ backgroundColor: 'var(--hoa-green)' }}
        >
          + Add Entry
        </Link>
      </div>
      <DirectoryClient entries={entries} />
    </div>
  );
}
