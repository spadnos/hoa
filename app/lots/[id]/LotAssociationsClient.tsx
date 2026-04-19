'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LotAssociation } from '@/src/tools/get-lots';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  resident: 'Resident',
  trustee: 'Trustee',
  corporate_owner: 'Corporate Owner',
};

interface Party {
  id: number;
  name: string;
}

interface Props {
  associations: LotAssociation[];
  lotId: number;
  isAdmin: boolean;
  parties: Party[];
}

export default function LotAssociationsClient({ associations, lotId, isAdmin, parties }: Props) {
  const [list, setList] = useState(associations);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    party_id: '',
    role: 'owner',
    start_date: '',
    is_primary_contact: false,
  });

  async function handleEnd(assocId: number) {
    await fetch(`/api/lot-associations/${assocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    });
    setList((prev) => prev.filter((a) => a.id !== assocId));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.party_id) return;
    setAdding(true);
    await fetch(`/api/lots/${lotId}/associations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        party_id: parseInt(form.party_id),
        role: form.role,
        start_date: form.start_date || undefined,
        is_primary_contact: form.is_primary_contact,
      }),
    });
    setAdding(false);
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="text-sm text-gray-400">No current associations.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Primary Contact</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm">{ROLE_LABELS[a.role] ?? a.role}</TableCell>
                <TableCell className="text-sm">
                  <Link href={`/directory/party-${a.party_id}`} className="text-blue-600 hover:underline">
                    {a.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {a.is_primary_contact ? 'Yes' : '—'}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 h-auto py-0.5 px-2 text-xs"
                      onClick={() => handleEnd(a.id)}
                    >
                      End
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isAdmin && (
        showAddForm ? (
          <form onSubmit={handleAdd} className="border rounded-md p-3 space-y-3 bg-gray-50">
            <p className="text-sm font-medium">Add Association</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Person</label>
                <select
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={form.party_id}
                  onChange={(e) => setForm((f) => ({ ...f, party_id: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Role</label>
                <select
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="owner">Owner</option>
                  <option value="resident">Resident</option>
                  <option value="trustee">Trustee</option>
                  <option value="corporate_owner">Corporate Owner</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="is_primary_contact"
                  checked={form.is_primary_contact}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary_contact: e.target.checked }))}
                />
                <label htmlFor="is_primary_contact" className="text-xs text-gray-600">Primary contact</label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            + Add Association
          </Button>
        )
      )}
    </div>
  );
}
