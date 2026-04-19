'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LotSearchResult } from '@/app/api/lots/route';

interface Selected {
  lot_number: number;
  address: string | null;
  address_id: number | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_mailing_address: string;
}

export default function NewProjectForm({ lots }: { lots: LotSearchResult[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lot search
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Editable fields (populated from selection)
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerMailingAddress, setOwnerMailingAddress] = useState('');

  // Project fields
  const [type, setType] = useState('new_residence');

  // Designer (optional)
  const [addDesigner, setAddDesigner] = useState(false);
  const [designerName, setDesignerName] = useState('');
  const [designerCompany, setDesignerCompany] = useState('');
  const [designerEmail, setDesignerEmail] = useState('');
  const [designerPhone, setDesignerPhone] = useState('');

  // Contractor (optional)
  const [addContractor, setAddContractor] = useState(false);
  const [contractorName, setContractorName] = useState('');
  const [contractorCompany, setContractorCompany] = useState('');
  const [contractorEmail, setContractorEmail] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = query.trim()
    ? lots.filter((l) => {
        const q = query.toLowerCase();
        return (
          String(l.lot_number).includes(q) ||
          (l.address ?? '').toLowerCase().includes(q) ||
          (l.owner_name ?? '').toLowerCase().includes(q)
        );
      })
    : lots;

  function selectLot(lot: LotSearchResult) {
    setSelected({
      lot_number: lot.lot_number,
      address: lot.address,
      address_id: lot.address_id,
      owner_name: lot.owner_name ?? '',
      owner_email: lot.owner_email ?? '',
      owner_phone: lot.owner_phone ?? '',
      owner_mailing_address: lot.owner_mailing_address ?? '',
    });
    setOwnerName(lot.owner_name ?? '');
    setOwnerEmail(lot.owner_email ?? '');
    setOwnerPhone(lot.owner_phone ?? '');
    setOwnerMailingAddress(lot.owner_mailing_address ?? '');
    setQuery(`Lot ${lot.lot_number}${lot.address ? ` — ${lot.address}` : ''}`);
    setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError('Please select a lot.'); return; }
    if (!ownerName.trim()) { setError('Owner name is required.'); return; }

    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      lot: selected.lot_number,
      address: selected.address ?? `Lot ${selected.lot_number}`,
      type,
      description: `${type.replace(/_/g, '-')}-lot${selected.lot_number}`,
      owner: {
        name: ownerName.trim(),
        email: ownerEmail || undefined,
        phone: ownerPhone || undefined,
        mailing_address: ownerMailingAddress || undefined,
      },
    };

    if (addDesigner && designerName.trim()) {
      body.designer = {
        name: designerName.trim(),
        company: designerCompany || undefined,
        email: designerEmail || undefined,
        phone: designerPhone || undefined,
      };
    }

    if (addContractor && contractorName.trim()) {
      body.contractor = {
        name: contractorName.trim(),
        company: contractorCompany || undefined,
        email: contractorEmail || undefined,
        phone: contractorPhone || undefined,
      };
    }

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      setError(data.error ?? 'Failed to create project. Please try again.');
      return;
    }

    const { id } = await res.json();
    router.push(`/projects/${id}`);
  }

  const inputCls = 'mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2';
  const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit}>
      {/* Lot search */}
      <div ref={searchRef} className="relative mb-4">
        <label className={labelCls}>Lot / Address</label>
        <input
          className={inputCls}
          placeholder="Search by lot number, address, or owner…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          autoComplete="off"
        />
        {showDropdown && filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {filtered.map((lot, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-baseline gap-3"
                  onClick={() => selectLot(lot)}
                >
                  <span className="font-medium text-gray-900 w-12 shrink-0">
                    Lot {lot.lot_number}
                  </span>
                  <span className="text-gray-500 truncate">{lot.address ?? '—'}</span>
                  {lot.owner_name && (
                    <span className="text-gray-400 text-xs shrink-0 ml-auto">{lot.owner_name}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {showDropdown && query.trim() && filtered.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-sm text-gray-400">
            No lots found.
          </div>
        )}
      </div>

      {/* Show the rest only after a lot is selected */}
      {selected && (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Project Type</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="new_residence">New Residence</option>
                <option value="major_remodel">Major Remodel</option>
                <option value="minor_remodel">Minor Remodel</option>
                <option value="landscaping">Landscaping</option>
                <option value="notification_only">Notification Only</option>
              </select>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Owner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  className={inputCls}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    className={inputCls}
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Mailing Address</label>
                <input
                  className={inputCls}
                  value={ownerMailingAddress}
                  onChange={(e) => setOwnerMailingAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Designer</CardTitle>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addDesigner}
                    onChange={(e) => setAddDesigner(e.target.checked)}
                    className="rounded"
                  />
                  Add
                </label>
              </div>
            </CardHeader>
            {addDesigner && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Name</label>
                    <input className={inputCls} value={designerName} onChange={(e) => setDesignerName(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Company</label>
                    <input className={inputCls} value={designerCompany} onChange={(e) => setDesignerCompany(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} value={designerEmail} onChange={(e) => setDesignerEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input className={inputCls} value={designerPhone} onChange={(e) => setDesignerPhone(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Contractor</CardTitle>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addContractor}
                    onChange={(e) => setAddContractor(e.target.checked)}
                    className="rounded"
                  />
                  Add
                </label>
              </div>
            </CardHeader>
            {addContractor && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Name</label>
                    <input className={inputCls} value={contractorName} onChange={(e) => setContractorName(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Company</label>
                    <input className={inputCls} value={contractorCompany} onChange={(e) => setContractorCompany(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} value={contractorEmail} onChange={(e) => setContractorEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input className={inputCls} value={contractorPhone} onChange={(e) => setContractorPhone(e.target.value)} />
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
            {saving ? 'Creating…' : 'Create Project'}
          </Button>
        </>
      )}

      {!selected && error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </form>
  );
}
