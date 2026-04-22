'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Fee, ProjectType } from '@/src/types';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function FeeActionButton({
  feeId,
  projectId,
  action,
  label,
  onDone,
}: {
  feeId: number;
  projectId: string;
  action: 'paid' | 'refunded';
  label: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}/fees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee_id: feeId, [action]: true }),
    });
    onDone();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
    >
      {loading ? '…' : label}
    </button>
  );
}

// Per design guidelines: New Residence $400, Major Remodel $500, Minor Remodel $200
const ADDITIONAL_REVIEW_FEE: Partial<Record<ProjectType, number>> = {
  new_residence: 400,
  major_remodel: 500,
  minor_remodel: 200,
};

interface Props {
  projectId: string;
  initialFees: Fee[];
  isAdmin: boolean;
  projectType: ProjectType;
}

export default function ProjectFeesSection({ projectId, initialFees, isAdmin, projectType }: Props) {
  const router = useRouter();
  const [fees, setFees] = useState(initialFees);
  const [addingReview, setAddingReview] = useState(false);

  const additionalReviewAmount = ADDITIONAL_REVIEW_FEE[projectType];

  function refresh() {
    router.refresh();
  }

  async function handleAddReview() {
    if (!additionalReviewAmount) return;
    setAddingReview(true);
    await fetch(`/api/projects/${projectId}/fees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Additional Review Fee',
        amount: additionalReviewAmount,
        due_at: 'additional_review',
      }),
    });
    setAddingReview(false);
    refresh();
  }

  const totalOwed = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.filter((f) => f.paid).reduce((sum, f) => sum + f.amount, 0);
  const totalRefunded = fees.filter((f) => f.refunded).reduce((sum, f) => sum + f.amount, 0);
  const netHeld = totalPaid - totalRefunded;

  if (fees.length === 0) {
    return <p className="text-sm text-gray-400">No fees recorded.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Due At</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fees.map((fee) => (
            <TableRow key={fee.id}>
              <TableCell className="text-sm">{fee.description}</TableCell>
              <TableCell className="text-sm text-gray-600 capitalize">
                {fee.due_at.replace(/_/g, ' ')}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">{fmt(fee.amount)}</TableCell>
              <TableCell>
                {fee.refunded ? (
                  <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                    Refunded {formatDate(fee.refunded)}
                  </Badge>
                ) : fee.paid ? (
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                    Paid {formatDate(fee.paid)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                    Outstanding
                  </Badge>
                )}
              </TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  {!fee.paid && (
                    <FeeActionButton
                      feeId={fee.id}
                      projectId={projectId}
                      action="paid"
                      label="Mark Paid"
                      onDone={refresh}
                    />
                  )}
                  {fee.paid && !fee.refunded && (
                    <FeeActionButton
                      feeId={fee.id}
                      projectId={projectId}
                      action="refunded"
                      label="Mark Refunded"
                      onDone={refresh}
                    />
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-4 text-sm">
        {isAdmin && additionalReviewAmount ? (
          <button
            onClick={handleAddReview}
            disabled={addingReview}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
          >
            {addingReview ? '…' : `+ Additional Review (${fmt(additionalReviewAmount)})`}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-6">
        <span className="text-gray-500">
          Paid:{' '}
          <span className="font-semibold text-green-700">{fmt(totalPaid)}</span>
        </span>
        {totalRefunded > 0 && (
          <>
            <span className="text-gray-500">
              Refunded:{' '}
              <span className="font-semibold text-purple-700">{fmt(totalRefunded)}</span>
            </span>
            <span className="text-gray-500">
              Net Held:{' '}
              <span className="font-semibold text-blue-700">{fmt(netHeld)}</span>
            </span>
          </>
        )}
        <span className="text-gray-500">
          Outstanding:{' '}
          <span className="font-semibold text-orange-700">
            {fmt(totalOwed - totalPaid)}
          </span>
        </span>
        <span className="text-gray-500">
          Total:{' '}
          <span className="font-semibold text-gray-900">{fmt(totalOwed)}</span>
        </span>
        </div>
      </div>
    </>
  );
}
