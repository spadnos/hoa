'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Member {
  id: number;
  party_id: number;
  party_name: string;
  title: string | null;
  start_date: string | null;
}

interface GroupData {
  group_name: string;
  members: Member[];
}

interface PartyOption {
  id: number;
  name: string;
}

interface Props {
  groups: GroupData[];
  parties: PartyOption[];
}

const GROUP_LABELS: Record<string, string> = {
  board: 'Board',
  acc: 'ACC Committee',
  management: 'Management',
  utility: 'Utility',
  vendor: 'Vendor',
};

function GroupSection({ group, parties }: { group: GroupData; parties: PartyOption[] }) {
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [partyId, setPartyId] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const label = GROUP_LABELS[group.group_name] ?? group.group_name;

  async function handleEnd(membershipId: number) {
    await fetch(`/api/group-memberships/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    });
    startTransition(() => router.refresh());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!partyId) return;
    await fetch(`/api/parties/${partyId}/memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_name: group.group_name,
        title: title || undefined,
        start_date: startDate || undefined,
      }),
    });
    setPartyId('');
    setTitle('');
    setStartDate('');
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-sm text-gray-500">
          {group.members.length} member{group.members.length !== 1 ? 's' : ''}{' '}
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {group.members.length === 0 ? (
            <p className="text-sm text-gray-500 mb-3">No current members.</p>
          ) : (
            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-1 font-medium">Name</th>
                  <th className="pb-1 font-medium">Title</th>
                  <th className="pb-1 font-medium">Since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2">
                      <Link
                        href={`/directory/party-${m.party_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {m.party_name}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-600">{m.title ?? '—'}</td>
                    <td className="py-2 text-gray-600">{m.start_date ?? '—'}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleEnd(m.id)}
                        disabled={isPending}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
                      >
                        End
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showForm ? (
            <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end border-t pt-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Person</label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  required
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select...</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. President"
                  className="border rounded px-2 py-1 text-sm w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Start date (optional)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-sm px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm px-3 py-1 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-green-700 hover:text-green-900 font-medium cursor-pointer"
            >
              + Add member
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function GroupsClient({ groups, parties }: Props) {
  return (
    <div>
      {groups.map((group) => (
        <GroupSection key={group.group_name} group={group} parties={parties} />
      ))}
    </div>
  );
}
