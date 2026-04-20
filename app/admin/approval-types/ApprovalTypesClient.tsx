'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApprovalType } from '@/src/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  initialTypes: ApprovalType[];
}

export default function ApprovalTypesClient({ initialTypes }: Props) {
  const router = useRouter();
  const [types, setTypes] = useState(initialTypes);
  const [editing, setEditing] = useState<number | null>(null);
  const [editVals, setEditVals] = useState<Partial<ApprovalType>>({});
  const [saving, setSaving] = useState(false);

  // New type form
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWarning, setNewWarning] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  function startEdit(t: ApprovalType) {
    setEditing(t.id);
    setEditVals({ label: t.label, description: t.description ?? '', is_warning_indicator: t.is_warning_indicator });
  }

  function cancelEdit() {
    setEditing(null);
    setEditVals({});
  }

  async function saveEdit(t: ApprovalType) {
    setSaving(true);
    const res = await fetch(`/api/approval-types/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editVals),
    });
    setSaving(false);
    if (res.ok) {
      setTypes((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, ...editVals } as ApprovalType : x))
      );
      cancelEdit();
      router.refresh();
    }
  }

  async function toggleActive(t: ApprovalType) {
    const res = await fetch(`/api/approval-types/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !t.is_active }),
    });
    if (res.ok) {
      setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !t.is_active } : x)));
      router.refresh();
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newLabel.trim()) {
      setAddError('Name and label are required.');
      return;
    }
    setAddSaving(true);
    setAddError(null);
    const res = await fetch('/api/approval-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        label: newLabel.trim(),
        description: newDescription.trim() || undefined,
        is_warning_indicator: newWarning,
        sort_order: types.length,
      }),
    });
    setAddSaving(false);
    if (res.ok) {
      setNewName(''); setNewLabel(''); setNewDescription(''); setNewWarning(false);
      setAdding(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? 'Failed to add type.');
    }
  }

  const inputCls = 'mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2';
  const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-4">
        {types.length === 0 && (
          <p className="text-sm text-gray-400 p-5">No approval types configured.</p>
        )}
        {types.map((t) => (
          <div key={t.id} className={`p-4 ${!t.is_active ? 'opacity-50' : ''}`}>
            {editing === t.id ? (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Label</label>
                  <input
                    className={inputCls}
                    value={editVals.label ?? ''}
                    onChange={(e) => setEditVals((v) => ({ ...v, label: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input
                    className={inputCls}
                    value={editVals.description ?? ''}
                    onChange={(e) => setEditVals((v) => ({ ...v, description: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={!!editVals.is_warning_indicator}
                    onChange={(e) => setEditVals((v) => ({ ...v, is_warning_indicator: e.target.checked }))}
                  />
                  Show warning badge when pending
                </label>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => saveEdit(t)}
                    className="text-white"
                    style={{ backgroundColor: 'var(--hoa-green)' }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{t.label}</span>
                    <code className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">{t.name}</code>
                    {t.is_warning_indicator && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
                        Warning indicator
                      </Badge>
                    )}
                    {!t.is_active && (
                      <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(t)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => toggleActive(t)}
                  >
                    {t.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Add Approval Type</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name (slug) *</label>
              <input
                className={inputCls}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. county_permit"
              />
              <p className="text-xs text-gray-400 mt-1">Lowercase, no spaces. Used by the AI.</p>
            </div>
            <div>
              <label className={labelCls}>Label *</label>
              <input
                className={inputCls}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. County Building Permit"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional explanation"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={newWarning}
              onChange={(e) => setNewWarning(e.target.checked)}
            />
            Show warning badge when pending
          </label>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={addSaving}
              className="text-white"
              style={{ backgroundColor: 'var(--hoa-green)' }}
            >
              {addSaving ? 'Adding…' : 'Add Type'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setAdding(false); setAddError(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          + Add Approval Type
        </Button>
      )}
    </div>
  );
}
