'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type EntryType = 'person' | 'organization';

export default function NewPartyForm() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<EntryType>('person');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [orgType, setOrgType] = useState('management');
  const [website, setWebsite] = useState('');

  // Optional lot association (person only)
  const [addLot, setAddLot] = useState(false);
  const [lotNumber, setLotNumber] = useState('');
  const [lotRole, setLotRole] = useState('owner');
  const [lotAddress, setLotAddress] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');

  // Optional group membership
  const [addGroup, setAddGroup] = useState(false);
  const [groupName, setGroupName] = useState('board');
  const [groupTitle, setGroupTitle] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    setError(null);

    const res = await fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: entryType,
        name: name.trim(),
        email: email || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
        org_type: entryType === 'organization' ? orgType : undefined,
        website: entryType === 'organization' && website ? website : undefined,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      setError('Failed to create entry. Please try again.');
      return;
    }

    const { id } = await res.json();

    if (entryType === 'person' && addLot && lotNumber) {
      await fetch(`/api/parties/${id}/lot-associations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_number: parseInt(lotNumber),
          role: lotRole,
          address: lotAddress || undefined,
          mailing_address: mailingAddress || undefined,
        }),
      });
    }

    if (addGroup) {
      await fetch(`/api/parties/${id}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groupName, title: groupTitle || undefined }),
      });
    }

    router.push(`/directory/party-${id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Type toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setEntryType('person')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
            entryType === 'person'
              ? 'text-white border-transparent'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
          style={entryType === 'person' ? { backgroundColor: 'var(--hoa-green)', borderColor: 'var(--hoa-green)' } : undefined}
        >
          Person
        </button>
        <button
          type="button"
          onClick={() => setEntryType('organization')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
            entryType === 'organization'
              ? 'text-white border-transparent'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
          style={entryType === 'organization' ? { backgroundColor: 'var(--hoa-green)', borderColor: 'var(--hoa-green)' } : undefined}
        >
          Organization
        </button>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Name *
            </label>
            <input
              className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
            <input
              type="email"
              className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
            <input
              className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {entryType === 'organization' && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Organization Type</label>
                <select
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
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
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
            <textarea
              rows={2}
              className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lot association (person only) */}
      {entryType === 'person' && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Lot Association</CardTitle>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addLot}
                  onChange={(e) => setAddLot(e.target.checked)}
                  className="rounded"
                />
                Add
              </label>
            </div>
          </CardHeader>
          {addLot && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lot #</label>
                  <input
                    type="number"
                    className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</label>
                  <select
                    className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                    value={lotRole}
                    onChange={(e) => setLotRole(e.target.value)}
                  >
                    <option value="owner">Owner</option>
                    <option value="resident">Resident</option>
                    <option value="trustee">Trustee</option>
                    <option value="corporate_owner">Corporate Owner</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lot Address</label>
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={lotAddress}
                  onChange={(e) => setLotAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mailing Address</label>
                <input
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={mailingAddress}
                  onChange={(e) => setMailingAddress(e.target.value)}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Group membership */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Group Membership</CardTitle>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={addGroup}
                onChange={(e) => setAddGroup(e.target.checked)}
                className="rounded"
              />
              Add
            </label>
          </div>
        </CardHeader>
        {addGroup && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</label>
                <select
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                >
                  <option value="board">Board</option>
                  <option value="acc">ACC</option>
                  <option value="management">Management</option>
                  <option value="utility">Utility</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
                <input
                  placeholder="e.g. President, Member"
                  className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <Button
        type="submit"
        disabled={saving}
        className="w-full text-white"
        style={{ backgroundColor: 'var(--hoa-green)' }}
      >
        {saving ? 'Creating…' : 'Create Entry'}
      </Button>
    </form>
  );
}
