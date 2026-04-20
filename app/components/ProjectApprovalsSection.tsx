'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectApproval, ApprovalStatus } from '@/src/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending:      'text-yellow-700 border-yellow-300 bg-yellow-50',
  approved:     'text-green-700 border-green-300 bg-green-50',
  not_required: 'text-gray-500 border-gray-200 bg-gray-50',
  issued:       'text-blue-700 border-blue-300 bg-blue-50',
  rejected:     'text-red-700 border-red-300 bg-red-50',
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending:      'Pending',
  approved:     'Approved',
  not_required: 'Not Required',
  issued:       'Issued',
  rejected:     'Rejected',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

interface Props {
  projectId: string;
  initialApprovals: ProjectApproval[];
  isAdmin: boolean;
}

export default function ProjectApprovalsSection({ projectId, initialApprovals, isAdmin }: Props) {
  const router = useRouter();
  const [approvals, setApprovals] = useState(initialApprovals);
  const [editing, setEditing] = useState<Record<number, { status: string; notes: string }>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  if (approvals.length === 0) {
    return <p className="text-sm text-gray-400">No external approvals tracked for this project.</p>;
  }

  function startEdit(a: ProjectApproval) {
    setEditing((prev) => ({
      ...prev,
      [a.id]: { status: a.status ?? '', notes: a.notes ?? '' },
    }));
  }

  function cancelEdit(id: number) {
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  async function saveEdit(a: ProjectApproval) {
    const vals = editing[a.id];
    if (!vals) return;
    setSaving((prev) => ({ ...prev, [a.id]: true }));

    const res = await fetch(`/api/projects/${projectId}/approvals/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: vals.status || null, notes: vals.notes || null }),
    });

    setSaving((prev) => ({ ...prev, [a.id]: false }));
    if (res.ok) {
      setApprovals((prev) =>
        prev.map((x) =>
          x.id === a.id
            ? { ...x, status: (vals.status || null) as ApprovalStatus | null, notes: vals.notes || null }
            : x
        )
      );
      cancelEdit(a.id);
      router.refresh();
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Approval</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Updated</TableHead>
          {isAdmin && <TableHead className="w-28" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {approvals.map((a) => {
          const isEditing = !!editing[a.id];
          const isSaving = !!saving[a.id];
          const vals = editing[a.id];

          return (
            <TableRow key={a.id}>
              <TableCell className="text-sm font-medium">{a.approval_type_label}</TableCell>
              <TableCell>
                {isEditing ? (
                  <select
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2"
                    value={vals.status}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, [a.id]: { ...vals, status: e.target.value } }))
                    }
                  >
                    <option value="">— not recorded —</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="not_required">Not Required</option>
                    <option value="issued">Issued</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ) : a.status ? (
                  <Badge variant="outline" className={STATUS_COLORS[a.status]}>
                    {STATUS_LABELS[a.status]}
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-400 italic">Not recorded</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-600 max-w-xs">
                {isEditing ? (
                  <input
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2"
                    value={vals.notes}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, [a.id]: { ...vals, notes: e.target.value } }))
                    }
                    placeholder="Notes…"
                  />
                ) : (
                  a.notes ?? <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(a.updated_at)}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isSaving}
                        onClick={() => saveEdit(a)}
                        className="text-white h-7 text-xs"
                        style={{ backgroundColor: 'var(--hoa-green)' }}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => cancelEdit(a.id)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(a)}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
