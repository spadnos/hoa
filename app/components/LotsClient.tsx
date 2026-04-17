'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { LotEntry } from '@/src/tools/get-lots';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  resident: 'Resident',
  trustee: 'Trustee',
  corporate_owner: 'Corporate Owner',
};

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-green-50 text-green-700',
  resident: 'bg-blue-50 text-blue-700',
  trustee: 'bg-emerald-50 text-emerald-700',
  corporate_owner: 'bg-gray-100 text-gray-600',
};

function LotCard({ lot }: { lot: LotEntry }) {
  const primaryAssoc =
    lot.associations.find((a) => a.is_primary_contact) ?? lot.associations[0] ?? null;
  const firstAddress = lot.addresses[0] ?? null;
  const extraCount = lot.associations.length - 1;

  return (
    <Link
      href={`/lots/${lot.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-900">Lot {lot.lot_number}</span>
        <div className="flex gap-1 shrink-0">
          {primaryAssoc && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_STYLES[primaryAssoc.role] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {ROLE_LABELS[primaryAssoc.role] ?? primaryAssoc.role}
            </span>
          )}
          {extraCount > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              +{extraCount}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        {firstAddress && (
          <p className="text-xs text-gray-500">
            {firstAddress.address}
            {firstAddress.unit ? ` #${firstAddress.unit}` : ''}
          </p>
        )}
        {primaryAssoc && (
          <p className="text-xs text-gray-600">{primaryAssoc.name}</p>
        )}
        {!primaryAssoc && !firstAddress && (
          <p className="text-xs text-gray-400 italic">No associations</p>
        )}
      </div>
    </Link>
  );
}

const SECTIONS = ['200s', '300s', '400s', '500s', '600s', '700s'];

function sectionOf(lot_number: number): string {
  return `${Math.floor(lot_number / 100)}00s`;
}

export default function LotsClient({ lots }: { lots: LotEntry[] }) {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const availableSections = useMemo(() => {
    const present = new Set(lots.map((l) => sectionOf(l.lot_number)));
    return SECTIONS.filter((s) => present.has(s));
  }, [lots]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lots.filter((l) => {
      if (activeSection && sectionOf(l.lot_number) !== activeSection) return false;
      if (!q) return true;
      if (String(l.lot_number).includes(q)) return true;
      if (l.addresses.some((a) => a.address.toLowerCase().includes(q))) return true;
      if (l.associations.some((a) => a.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [lots, search, activeSection]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by lot number, address, or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveSection(null)}
            className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              activeSection === null
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            style={
              activeSection === null
                ? { backgroundColor: 'var(--hoa-green)', borderColor: 'var(--hoa-green)' }
                : undefined
            }
          >
            All
          </button>
          {availableSections.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(activeSection === section ? null : section)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                activeSection === section
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              style={
                activeSection === section
                  ? { backgroundColor: 'var(--hoa-green)', borderColor: 'var(--hoa-green)' }
                  : undefined
              }
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No lots match your search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </div>
  );
}
