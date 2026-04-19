'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { LibraryDocument } from '@/src/types';

const tierLabel: Record<string, string> = {
  public: 'Public',
  members: 'Members',
  board: 'Board',
};

const tierBadge: Record<string, string> = {
  public: 'bg-green-100 text-green-700',
  members: 'bg-blue-100 text-blue-700',
  board: 'bg-purple-100 text-purple-700',
};

interface Props {
  docs: LibraryDocument[];
  isAdmin: boolean;
}

export default function DocumentsClient({ docs, isAdmin }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: number) {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    startTransition(() => router.refresh());
  }

  const grouped = new Map<string, LibraryDocument[]>();
  for (const doc of docs) {
    const key = doc.category ?? 'General';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(doc);
  }

  if (grouped.size === 0) {
    return <p className="text-sm text-gray-500">No documents available.</p>;
  }

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([category, categoryDocs]) => (
        <section key={category}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {category}
          </h2>
          <div className="grid gap-3">
            {categoryDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tierBadge[doc.access_tier]}`}>
                      {tierLabel[doc.access_tier]}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-500">{doc.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.uploaded_at.slice(0, 10)}
                    {doc.size_bytes ? ` · ${(doc.size_bytes / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Download
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isPending}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
