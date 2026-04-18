'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { AdditionalContact, ContactInfo } from '@/src/types';

interface PartySearchResult {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  notes: string | null;
}

interface Props {
  projectId: string;
  owner: ContactInfo;
  designer?: ContactInfo;
  contractor?: ContactInfo;
  initialAdditional: AdditionalContact[];
}

function ContactCard({
  title,
  name,
  email,
  phone,
  company,
  lotAddress,
  mailingAddress,
  partyId,
  onRemove,
}: {
  title: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  lotAddress?: string;
  mailingAddress?: string;
  partyId?: number;
  onRemove?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-500 leading-none"
            title="Remove contact"
          >
            ✕
          </button>
        )}
      </div>
      <div className="pl-2 border-l-2 border-gray-100 space-y-0.5">
        {partyId ? (
          <Link
            href={`/directory/party-${partyId}`}
            className="text-sm font-medium text-blue-700 hover:underline block"
          >
            {name}
          </Link>
        ) : (
          <p className="text-sm font-medium text-gray-900">{name}</p>
        )}
        {company && <p className="text-sm text-gray-600">{company}</p>}
        {email && (
          <a href={`mailto:${email}`} className="text-sm text-blue-600 hover:underline block">
            {email}
          </a>
        )}
        {phone && <p className="text-sm text-gray-600">{phone}</p>}
        {lotAddress && <p className="text-sm text-gray-500">Lot: {lotAddress}</p>}
        {mailingAddress && <p className="text-sm text-gray-500">Mail: {mailingAddress}</p>}
      </div>
    </div>
  );
}

export default function ProjectContactsSection({
  projectId,
  owner,
  designer,
  contractor,
  initialAdditional,
}: Props) {
  const [additional, setAdditional] = useState<AdditionalContact[]>(initialAdditional);
  const [showAddForm, setShowAddForm] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PartySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedParty, setSelectedParty] = useState<PartySearchResult | null>(null);

  // Form state
  const [roleLabel, setRoleLabel] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/parties?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  function resetForm() {
    setShowAddForm(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedParty(null);
    setRoleLabel('');
    setCreateMode(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewCompany('');
    setError(null);
  }

  async function handleAdd() {
    if (!roleLabel.trim()) {
      setError('Role / Title is required');
      return;
    }
    if (!selectedParty && !createMode) {
      setError('Select a contact or choose "Create new"');
      return;
    }
    if (createMode && !newName.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = { role_label: roleLabel.trim() };

    if (selectedParty && !createMode) {
      body.party_id = selectedParty.id;
    } else {
      body.name = newName.trim();
      if (newEmail.trim()) body.email = newEmail.trim();
      if (newPhone.trim()) body.phone = newPhone.trim();
      if (newCompany.trim()) body.company = newCompany.trim();
    }

    const res = await fetch(`/api/projects/${projectId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (res.ok) {
      const { id, party_id } = await res.json();
      const contact: AdditionalContact = {
        id,
        party_id: selectedParty ? selectedParty.id : party_id,
        role_label: roleLabel.trim(),
        name: selectedParty ? selectedParty.name : newName.trim(),
        email: selectedParty ? (selectedParty.email ?? undefined) : (newEmail.trim() || undefined),
        phone: selectedParty ? (selectedParty.phone ?? undefined) : (newPhone.trim() || undefined),
        company: createMode ? (newCompany.trim() || undefined) : undefined,
      };
      setAdditional((prev) => [...prev, contact]);
      resetForm();
    } else {
      const json = await res.json();
      setError(json.error ?? 'Failed to add contact');
    }
  }

  async function handleRemove(contactId: number) {
    await fetch(`/api/projects/${projectId}/contacts/${contactId}`, { method: 'DELETE' });
    setAdditional((prev) => prev.filter((c) => c.id !== contactId));
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ContactCard
          title="Owner"
          name={owner.name}
          email={owner.email}
          phone={owner.phone}
          lotAddress={owner.lot_address}
          mailingAddress={owner.mailing_address}
          partyId={owner.party_id}
        />
        {designer && (
          <ContactCard
            title="Designer"
            name={designer.name}
            email={designer.email}
            phone={designer.phone}
            company={designer.company}
            partyId={designer.party_id}
          />
        )}
        {contractor && (
          <ContactCard
            title="Contractor"
            name={contractor.name}
            email={contractor.email}
            phone={contractor.phone}
            company={contractor.company}
            partyId={contractor.party_id}
          />
        )}
        {additional.map((c) => (
          <ContactCard
            key={c.id}
            title={c.role_label}
            name={c.name}
            email={c.email}
            phone={c.phone}
            company={c.company}
            partyId={c.party_id}
            onRemove={() => handleRemove(c.id)}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        {showAddForm ? (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Role / Title
              </label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="e.g. Architect, Inspector, Survey Company"
                value={roleLabel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoleLabel(e.target.value)}
              />
            </div>

            {!createMode ? (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Search Existing Parties
                </label>
                {selectedParty ? (
                  <div className="flex items-center gap-2 p-2 bg-white border rounded text-sm">
                    <span className="flex-1 font-medium">{selectedParty.name}</span>
                    {selectedParty.email && (
                      <span className="text-gray-500 text-xs">{selectedParty.email}</span>
                    )}
                    <button
                      onClick={() => setSelectedParty(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="Type a name or email…"
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                    {searching && (
                      <p className="text-xs text-gray-400 mt-1">Searching…</p>
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded shadow-md mt-1 max-h-48 overflow-y-auto">
                        {searchResults.map((r) => (
                          <button
                            key={r.id}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                            onClick={() => {
                              setSelectedParty(r);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                          >
                            <span className="font-medium">{r.name}</span>
                            {r.email && (
                              <span className="text-gray-500 text-xs ml-2">{r.email}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">No results found.</p>
                    )}
                  </div>
                )}
                <button
                  className="text-xs text-blue-600 hover:underline mt-2"
                  onClick={() => {
                    setCreateMode(true);
                    setSelectedParty(null);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  Can&apos;t find them? Create new contact
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    New Contact
                  </label>
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => setCreateMode(false)}
                  >
                    ← Search instead
                  </button>
                </div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Name *"
                  value={newName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                />
                <input
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Company"
                  value={newCompany}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCompany(e.target.value)}
                />
                <input
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Email"
                  type="email"
                  value={newEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
                />
                <input
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  placeholder="Phone"
                  type="tel"
                  value={newPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPhone(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? 'Adding…' : 'Add Contact'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
            + Add Contact
          </Button>
        )}
      </div>
    </div>
  );
}
