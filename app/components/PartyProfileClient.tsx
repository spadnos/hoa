'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DirectoryParty, GroupMembership, OrgType } from '@/src/types';

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  management: 'Management',
  utility: 'Utility',
  vendor: 'Vendor',
  government: 'Government',
  other: 'Other',
};

const GROUP_LABELS: Record<string, string> = {
  acc: 'ACC',
  board: 'Board',
  management: 'Management',
  utility: 'Utility',
  vendor: 'Vendor',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-36 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface EditState {
  name: string;
  email: string;
  phone: string;
  notes: string;
  org_type: string;
  website: string;
}

export default function PartyProfileClient({ party }: { party: DirectoryParty }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditState>({
    name: party.name,
    email: party.email ?? '',
    phone: party.phone ?? '',
    notes: party.notes ?? '',
    org_type: party.org_type ?? 'other',
    website: party.website ?? '',
  });

  // Local state for memberships so we can optimistically update "End" actions
  const [memberships, setMemberships] = useState(party.current_memberships);
  const [lotAssocs, setLotAssocs] = useState(party.lot_associations);
  const [showAddMembership, setShowAddMembership] = useState(false);
  const [showAddLotAssoc, setShowAddLotAssoc] = useState(false);
  const [newMembership, setNewMembership] = useState({ group_name: 'board', title: '', start_date: '' });
  const [newLotAssoc, setNewLotAssoc] = useState({ lot_number: '', role: 'owner', address: '', unit: '', mailing_address: '', start_date: '' });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: draft.name,
      email: draft.email || null,
      phone: draft.phone || null,
      notes: draft.notes || null,
    };
    if (party.type === 'organization') {
      body.org_type = draft.org_type;
      body.website = draft.website || null;
    }
    const res = await fetch(`/api/parties/${party.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setIsEditing(false);
      router.refresh();
    } else {
      setError('Failed to save. Please try again.');
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${party.name}? This cannot be undone.`)) return;
    await fetch(`/api/parties/${party.id}`, { method: 'DELETE' });
    router.push('/directory');
  }

  async function handleEndMembership(m: GroupMembership) {
    await fetch(`/api/group-memberships/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    });
    setMemberships((prev) => prev.filter((x) => x.id !== m.id));
  }

  async function handleEndLotAssoc(id: number) {
    await fetch(`/api/lot-associations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    });
    setLotAssocs((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleAddMembership() {
    const res = await fetch(`/api/parties/${party.id}/memberships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMembership),
    });
    if (res.ok) {
      router.refresh();
      setShowAddMembership(false);
      setNewMembership({ group_name: 'board', title: '', start_date: '' });
    }
  }

  async function handleAddLotAssoc() {
    if (!newLotAssoc.lot_number) return;
    const res = await fetch(`/api/parties/${party.id}/lot-associations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lot_number: parseInt(newLotAssoc.lot_number),
        role: newLotAssoc.role,
        address: newLotAssoc.address || undefined,
        unit: newLotAssoc.unit || undefined,
        mailing_address: newLotAssoc.mailing_address || undefined,
        start_date: newLotAssoc.start_date || undefined,
      }),
    });
    if (res.ok) {
      router.refresh();
      setShowAddLotAssoc(false);
      setNewLotAssoc({ lot_number: '', role: 'owner', address: '', unit: '', mailing_address: '', start_date: '' });
    }
  }

  const currentLotAssocs = lotAssocs.filter((a) => !a.end_date);
  const historicalLotAssocs = lotAssocs.filter((a) => a.end_date);
  const currentMemberships = memberships.filter((m) => !m.end_date);
  const historicalMemberships = memberships.filter((m) => m.end_date);

  return (
    <div className="max-w-2xl">
      <Link href="/directory" className="text-sm text-gray-500 hover:text-gray-900 mb-6 block">
        ← Directory
      </Link>

      {/* Basic info card */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">
            {isEditing ? (party.type === 'person' ? 'Edit Person' : 'Edit Organization') : party.name}
          </CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setError(null); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}
                  style={{ backgroundColor: 'var(--hoa-green)' }} className="text-white border-0">
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </div>
              {party.type === 'organization' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                    <select
                      className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                      value={draft.org_type}
                      onChange={(e) => setDraft({ ...draft, org_type: e.target.value })}
                    >
                      <option value="management">Management</option>
                      <option value="utility">Utility</option>
                      <option value="vendor">Vendor</option>
                      <option value="government">Government</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</label>
                    <input
                      className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                      value={draft.website}
                      onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div>
              {party.type === 'organization' && party.org_type && (
                <InfoRow label="Type" value={
                  <Badge variant="secondary">{ORG_TYPE_LABELS[party.org_type]}</Badge>
                } />
              )}
              {party.email && (
                <InfoRow label="Email" value={
                  <a href={`mailto:${party.email}`} className="text-blue-600 hover:underline">{party.email}</a>
                } />
              )}
              {party.phone && <InfoRow label="Phone" value={party.phone} />}
              {party.website && (
                <InfoRow label="Website" value={party.website} />
              )}
              {party.notes && <InfoRow label="Notes" value={party.notes} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot associations (persons only) */}
      {party.type === 'person' && (
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Lot Associations</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddLotAssoc(!showAddLotAssoc)}>
              + Add
            </Button>
          </CardHeader>
          <CardContent>
            {showAddLotAssoc && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Lot #</label>
                    <input
                      type="number"
                      className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      value={newLotAssoc.lot_number}
                      onChange={(e) => setNewLotAssoc({ ...newLotAssoc, lot_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Role</label>
                    <select
                      className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                      value={newLotAssoc.role}
                      onChange={(e) => setNewLotAssoc({ ...newLotAssoc, role: e.target.value })}
                    >
                      <option value="owner">Owner</option>
                      <option value="resident">Resident</option>
                      <option value="trustee">Trustee</option>
                      <option value="corporate_owner">Corporate Owner</option>
                    </select>
                  </div>
                </div>
                <input
                  placeholder="Address (optional)"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  value={newLotAssoc.address}
                  onChange={(e) => setNewLotAssoc({ ...newLotAssoc, address: e.target.value })}
                />
                <input
                  placeholder="Mailing address (optional)"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  value={newLotAssoc.mailing_address}
                  onChange={(e) => setNewLotAssoc({ ...newLotAssoc, mailing_address: e.target.value })}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowAddLotAssoc(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAddLotAssoc}
                    style={{ backgroundColor: 'var(--hoa-green)' }} className="text-white border-0">
                    Add
                  </Button>
                </div>
              </div>
            )}

            {currentLotAssocs.length === 0 && !showAddLotAssoc && (
              <p className="text-sm text-gray-400">No active lot associations.</p>
            )}
            {currentLotAssocs.map((assoc) => (
              <div key={assoc.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-900">Lot {assoc.lot_number}</span>
                  {assoc.address && <span className="text-xs text-gray-500 ml-2">{assoc.address}{assoc.unit ? ` ${assoc.unit}` : ''}</span>}
                  <div className="flex gap-1 mt-0.5">
                    <Badge variant="outline" className="text-xs capitalize">{assoc.role.replace('_', ' ')}</Badge>
                    {assoc.is_primary_contact && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                  </div>
                  {assoc.mailing_address && (
                    <p className="text-xs text-gray-400 mt-0.5">Mail: {assoc.mailing_address}</p>
                  )}
                  {assoc.start_date && <p className="text-xs text-gray-400">Since {formatDate(assoc.start_date)}</p>}
                </div>
                <Button size="sm" variant="outline" className="text-xs shrink-0 ml-2"
                  onClick={() => handleEndLotAssoc(assoc.id)}>
                  End
                </Button>
              </div>
            ))}

            {historicalLotAssocs.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer">History ({historicalLotAssocs.length})</summary>
                <div className="mt-2 space-y-1">
                  {historicalLotAssocs.map((assoc) => (
                    <div key={assoc.id} className="text-xs text-gray-400 py-1">
                      Lot {assoc.lot_number} — <span className="capitalize">{assoc.role.replace('_', ' ')}</span>
                      {assoc.start_date && ` · ${formatDate(assoc.start_date)}`}
                      {assoc.end_date && ` – ${formatDate(assoc.end_date)}`}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Group memberships */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Group Memberships</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddMembership(!showAddMembership)}>
            + Add
          </Button>
        </CardHeader>
        <CardContent>
          {showAddMembership && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Group</label>
                  <select
                    className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                    value={newMembership.group_name}
                    onChange={(e) => setNewMembership({ ...newMembership, group_name: e.target.value })}
                  >
                    <option value="board">Board</option>
                    <option value="acc">ACC</option>
                    <option value="management">Management</option>
                    <option value="utility">Utility</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Title</label>
                  <input
                    placeholder="e.g. President, Member"
                    className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                    value={newMembership.title}
                    onChange={(e) => setNewMembership({ ...newMembership, title: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Start date (optional)</label>
                <input
                  type="date"
                  className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  value={newMembership.start_date}
                  onChange={(e) => setNewMembership({ ...newMembership, start_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowAddMembership(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddMembership}
                  style={{ backgroundColor: 'var(--hoa-green)' }} className="text-white border-0">
                  Add
                </Button>
              </div>
            </div>
          )}

          {currentMemberships.length === 0 && !showAddMembership && (
            <p className="text-sm text-gray-400">No active memberships.</p>
          )}
          {currentMemberships.map((m) => (
            <div key={m.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {GROUP_LABELS[m.group_name] ?? m.group_name}
                </span>
                {m.title && <span className="text-xs text-gray-500 ml-1.5">{m.title}</span>}
                {m.start_date && <p className="text-xs text-gray-400">Since {formatDate(m.start_date)}</p>}
              </div>
              <Button size="sm" variant="outline" className="text-xs shrink-0 ml-2"
                onClick={() => handleEndMembership(m)}>
                End
              </Button>
            </div>
          ))}

          {historicalMemberships.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer">History ({historicalMemberships.length})</summary>
              <div className="mt-2 space-y-1">
                {historicalMemberships.map((m) => (
                  <div key={m.id} className="text-xs text-gray-400 py-1">
                    {GROUP_LABELS[m.group_name] ?? m.group_name}
                    {m.title && ` — ${m.title}`}
                    {m.start_date && ` · ${formatDate(m.start_date)}`}
                    {m.end_date && ` – ${formatDate(m.end_date)}`}
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Affiliated persons (organizations) */}
      {party.type === 'organization' && party.affiliated_persons.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {party.affiliated_persons.map((aff) => (
              <div key={aff.id} className="py-2 border-b border-gray-100 last:border-0">
                <Link href={`/directory/party-${aff.person.id}`} className="text-sm font-medium text-gray-900 hover:underline">
                  {aff.person.name}
                </Link>
                {aff.title && <span className="text-xs text-gray-500 ml-1.5">{aff.title}</span>}
                {aff.person.email && (
                  <p className="text-xs text-blue-600">{aff.person.email}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Affiliated organizations (persons) */}
      {party.type === 'person' && party.affiliations.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Organization Affiliations</CardTitle>
          </CardHeader>
          <CardContent>
            {party.affiliations.map((aff) => (
              <div key={aff.id} className="py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-900">{aff.org_name}</span>
                {aff.title && <span className="text-xs text-gray-500 ml-1.5">{aff.title}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Delete */}
      <div className="mt-2">
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-sm"
          onClick={handleDelete}>
          Delete {party.type === 'person' ? 'Person' : 'Organization'}
        </Button>
      </div>
    </div>
  );
}
