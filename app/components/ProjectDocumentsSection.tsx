'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProjectDocument, ProjectDocumentType } from '@/src/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_BADGE: Record<ProjectDocumentType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  plan: { label: 'Plan', variant: 'default' },
  review: { label: 'AI Review', variant: 'secondary' },
  document: { label: 'Document', variant: 'outline' },
};

interface Props {
  projectId: string;
  initialDocuments: ProjectDocument[];
  isAdmin: boolean;
  canUpload: boolean;
}

export default function ProjectDocumentsSection({ projectId, initialDocuments, isAdmin, canUpload }: Props) {
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<'document' | 'plan'>('document');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [reviewingDocId, setReviewingDocId] = useState<number | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [viewingDocId, setViewingDocId] = useState<number | null>(null);
  const [viewContent, setViewContent] = useState<Record<number, string>>({});

  async function handleView(docId: number) {
    if (viewingDocId === docId) {
      setViewingDocId(null);
      return;
    }
    if (!viewContent[docId]) {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/download`);
      if (res.ok) {
        const text = await res.text();
        setViewContent((prev) => ({ ...prev, [docId]: text }));
      }
    }
    setViewingDocId(docId);
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setDocumentType('document');
    setFile(null);
    setUploadError(null);
    setShowUploadForm(false);
  }

  async function handleUpload() {
    if (!title.trim() || !file) {
      setUploadError('Title and file are required');
      return;
    }
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.set('title', title.trim());
    if (description.trim()) formData.set('description', description.trim());
    formData.set('document_type', documentType);
    formData.set('file', file);

    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: 'POST',
      body: formData,
    });

    setUploading(false);

    if (res.ok) {
      const created: ProjectDocument = await res.json();
      setDocuments((prev) => [created, ...prev]);
      resetForm();
    } else {
      const data = await res.json();
      setUploadError(data.error ?? 'Upload failed');
    }
  }

  async function handleReviewPlan(docId: number) {
    setReviewingDocId(docId);
    setReviewError(null);

    const res = await fetch(`/api/projects/${projectId}/documents/${docId}/review`, {
      method: 'POST',
    });

    setReviewingDocId(null);

    if (res.ok) {
      const newDoc: ProjectDocument = await res.json();
      setDocuments((prev) => [...prev, newDoc]);
    } else {
      const data = await res.json();
      setReviewError(data.error ?? 'Review failed');
    }
  }

  async function handleDelete(docId: number) {
    const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  }

  return (
    <div>
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">No documents uploaded.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const { label, variant } = TYPE_BADGE[doc.document_type] ?? TYPE_BADGE.document;
            const ext = doc.file_path.includes('.') ? doc.file_path.split('.').pop() : '';
            return (
              <li key={doc.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-gray-400">
                        Uploaded {formatDate(doc.uploaded_at)}
                        {doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ''}
                      </p>
                      {doc.document_type === 'review' && (
                        <button
                          onClick={() => handleView(doc.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {viewingDocId === doc.id ? 'Hide' : 'View'}
                        </button>
                      )}
                      <a
                        href={`/api/projects/${projectId}/documents/${doc.id}/download`}
                        className="text-xs text-blue-600 hover:underline"
                        download
                      >
                        Download {ext ? `.${ext}` : ''}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && doc.document_type === 'plan' && (
                      <button
                        onClick={() => handleReviewPlan(doc.id)}
                        disabled={reviewingDocId !== null}
                        className="text-xs text-green-700 hover:text-green-900 border border-green-300 rounded px-2 py-0.5 disabled:opacity-50"
                        title="Run AI plan review"
                      >
                        {reviewingDocId === doc.id ? 'Reviewing…' : 'Review Plan'}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                        title="Delete document"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {viewingDocId === doc.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    {viewContent[doc.id] ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-2 mt-4 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mb-1.5 mt-4 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mb-1 mt-3 first:mt-0">{children}</h3>,
                          p: ({ children }) => <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-gray-700">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-gray-700">{children}</ol>,
                          li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          hr: () => <hr className="border-gray-200 my-3" />,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-600 italic my-2">{children}</blockquote>,
                          code: ({ children }) => <code className="bg-gray-200 text-gray-800 text-xs rounded px-1 py-0.5 font-mono">{children}</code>,
                        }}
                      >
                        {viewContent[doc.id]}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-xs text-gray-400">Loading…</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {reviewError && (
        <p className="text-xs text-red-600 mt-2">{reviewError}</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        {showUploadForm ? (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Title *
              </label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="e.g. Site Plan, Elevation Drawing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                rows={2}
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Type
              </label>
              <select
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as 'document' | 'plan')}
              >
                <option value="document">Document</option>
                <option value="plan">Plan (reviewable by AI)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                File *
              </label>
              <input
                type="file"
                className="text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm} disabled={uploading}>
                Cancel
              </Button>
            </div>
          </div>
        ) : canUpload ? (
          <Button size="sm" variant="outline" onClick={() => setShowUploadForm(true)}>
            + Upload Document
          </Button>
        ) : null}
      </div>
    </div>
  );
}
