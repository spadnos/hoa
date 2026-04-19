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
  sort_order: number | null;
}

interface GroupData {
  group_name: string;
  label: string;
  description: string | null;
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

function GroupSection({ group, parties }: { group: GroupData; parties: PartyOption[] }) {
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [partyId, setPartyId] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleEnd(membershipId: number) {
    await fetch(`/api/group-memberships/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    });
    startTransition(() => router.refresh());
  }

  async function handleReorder(index: number, direction: 'up' | 'down') {
    const a = group.members[index];
    const b = group.members[direction === 'up' ? index - 1 : index + 1];
    const aOrder = a.sort_order ?? index + 1;
    const bOrder = b.sort_order ?? (direction === 'up' ? index : index + 2);
    await fetch(`/api/group-memberships/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort_order: bOrder }),
    });
    await fetch(`/api/group-memberships/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort_order: aOrder }),
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
        <div>
          <span className="font-semibold text-gray-900">{group.label}</span>
          {group.description && (
            <span className="ml-3 text-sm text-gray-500">{group.description}</span>
          )}
        </div>
        <span className="text-sm text-gray-500 shrink-0 ml-4">
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
                  <th className="pb-1 w-12"></th>
                  <th className="pb-1 font-medium">Name</th>
                  <th className="pb-1 font-medium">Title</th>
                  <th className="pb-1 font-medium">Since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((m, idx) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-1">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleReorder(idx, 'up')}
                          disabled={isPending || idx === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:invisible cursor-pointer leading-none"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleReorder(idx, 'down')}
                          disabled={isPending || idx === group.members.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:invisible cursor-pointer leading-none"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
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
                <label className="text-xs text-gray-500">Entity</label>
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
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, label: newLabel, description: newDescription }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? 'Failed to create group');
      return;
    }
    setNewName('');
    setNewLabel('');
    setNewDescription('');
    setShowNewForm(false);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="text-sm px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 cursor-pointer"
          >
            + New group
          </button>
        )}
      </div>
      {groups.map((group) => (
        <GroupSection
          key={group.group_name}
          group={group}
          parties={parties}
        />
      ))}
      {showNewForm && (
        <form onSubmit={handleCreate} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 mt-2">
          <h2 className="font-semibold text-gray-900">New group</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Name (slug)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. landscaping"
                autoFocus
                required
                className="border rounded px-2 py-1 text-sm w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Display label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Landscaping Committee"
                required
                className="border rounded px-2 py-1 text-sm w-56"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label className="text-xs text-gray-500">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of this group's role"
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="text-sm px-3 py-1 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50 cursor-pointer"
            >
              Create group
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setError(''); }}
              className="text-sm px-3 py-1 border rounded hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
