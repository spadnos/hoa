'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { loginAction } from '@/src/auth/actions';

interface LoginEntry {
  id: number;
  name: string;
}

export default function LoginClient({ entries }: { entries: LoginEntry[] }) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    : entries;

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
          style={{ '--tw-ring-color': 'var(--hoa-green)' } as React.CSSProperties}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No results.</p>
        ) : (
          filtered.map((entry) => (
            <form key={entry.id} action={loginAction.bind(null, entry.id)}>
              <button
                type="submit"
                className="w-full text-left px-5 py-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer"
              >
                {entry.name}
              </button>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
