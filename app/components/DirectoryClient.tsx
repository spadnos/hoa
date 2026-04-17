'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { OrgType } from '@/src/types';

export interface DirectoryEntry {
  key: string;
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  lot: number | null;
  mailing_address: string | null;
  is_primary_contact: boolean;
  labels: string[];
  committee_role: string | null;
  party_type: 'person' | 'organization';
  org_type?: OrgType;
}

const LABEL_STYLES: Record<string, string> = {
  'Legal Owner': 'bg-green-50 text-green-700',
  'Resident': 'bg-blue-50 text-blue-700',
  'ACC Member': 'bg-amber-50 text-amber-700',
  'Board Member': 'bg-purple-50 text-purple-700',
  'Management': 'bg-orange-50 text-orange-700',
  'Utility': 'bg-cyan-50 text-cyan-700',
  'Vendor': 'bg-gray-100 text-gray-600',
  'Trustee': 'bg-emerald-50 text-emerald-700',
};

const LABEL_ORDER = ['Legal Owner', 'Resident', 'Trustee', 'ACC Member', 'Board Member', 'Management', 'Utility', 'Vendor'];

function EntryCard({ entry }: { entry: DirectoryEntry }) {
  return (
    <Link
      href={`/directory/party-${entry.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <span className="text-sm font-semibold text-gray-900">{entry.name}</span>
          {entry.committee_role && (
            <span className="text-xs text-gray-500 ml-1.5">{entry.committee_role}</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {entry.lot !== null && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
              Lot {entry.lot}
            </span>
          )}
          {entry.party_type === 'organization' && entry.org_type && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium capitalize">
              {entry.org_type}
            </span>
          )}
          {entry.is_primary_contact && (
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Primary</span>
          )}
        </div>
      </div>

      <div className="space-y-0.5 mb-3">
        {entry.email ? (
          <span
            className="block text-xs text-blue-600"
            onClick={(e) => { e.preventDefault(); window.location.href = `mailto:${entry.email}`; }}
          >
            {entry.email}
          </span>
        ) : null}
        {entry.phone ? (
          <p className="text-xs text-gray-500">{entry.phone}</p>
        ) : null}
        {entry.mailing_address ? (
          <p className="text-xs text-gray-400">{entry.mailing_address}</p>
        ) : null}
      </div>

      {entry.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.labels.map((label) => (
            <span
              key={label}
              className={`text-xs px-1.5 py-0.5 rounded ${LABEL_STYLES[label] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function DirectoryClient({ entries }: { entries: DirectoryEntry[] }) {
  const [search, setSearch] = useState('');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const availableLabels = useMemo(() => {
    const present = new Set(entries.flatMap((e) => e.labels));
    return LABEL_ORDER.filter((l) => present.has(l));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeLabel && !e.labels.includes(activeLabel)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        (e.phone ?? '').includes(q) ||
        (e.lot !== null && String(e.lot).includes(q))
      );
    });
  }, [entries, search, activeLabel]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or lot…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveLabel(null)}
            className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              activeLabel === null
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            style={activeLabel === null ? { backgroundColor: 'var(--hoa-green)', borderColor: 'var(--hoa-green)' } : undefined}
          >
            All
          </button>
          {availableLabels.map((label) => (
            <button
              key={label}
              onClick={() => setActiveLabel(activeLabel === label ? null : label)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                activeLabel === label
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              style={activeLabel === label ? { backgroundColor: 'var(--hoa-green)', borderColor: 'var(--hoa-green)' } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No contacts match your search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <EntryCard key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
