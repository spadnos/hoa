'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Announcement } from '@/src/types';

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementsClient({ announcements }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'public' | 'members' | 'board'>('members');
  const [visibleFrom, setVisibleFrom] = useState(new Date().toISOString().slice(0, 10));
  const [visibleUntil, setVisibleUntil] = useState('');

  function resetForm() {
    setTitle('');
    setBody('');
    setAudience('members');
    setVisibleFrom(new Date().toISOString().slice(0, 10));
    setVisibleUntil('');
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setAudience(a.audience);
    setVisibleFrom(a.visible_from);
    setVisibleUntil(a.visible_until ?? '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      body,
      audience,
      visible_from: visibleFrom,
      visible_until: visibleUntil || null,
    };

    if (editingId !== null) {
      await fetch(`/api/announcements/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this announcement?')) return;
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    startTransition(() => router.refresh());
  }

  const audienceLabel = (a: string) =>
    a === 'public' ? 'Public' : a === 'members' ? 'Members' : 'Board';

  const audienceBadge = (a: string) =>
    a === 'public'
      ? 'bg-green-100 text-green-700'
      : a === 'members'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            New Announcement
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            {editingId !== null ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as 'public' | 'members' | 'board')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="public">Public</option>
                <option value="members">Members</option>
                <option value="board">Board</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visible From</label>
              <input
                type="date"
                required
                value={visibleFrom}
                onChange={(e) => setVisibleFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visible Until</label>
              <input
                type="date"
                value={visibleUntil}
                onChange={(e) => setVisibleUntil(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="No expiry"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editingId !== null ? 'Save Changes' : 'Create'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <p className="text-sm text-gray-500">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{a.title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${audienceBadge(a.audience)}`}>
                      {audienceLabel(a.audience)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{a.body}</p>
                  <div className="text-xs text-gray-400">
                    From {a.visible_from}
                    {a.visible_until ? ` until ${a.visible_until}` : ''}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(a)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={isPending}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
