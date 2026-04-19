ALTER TABLE project_documents ADD COLUMN document_type TEXT NOT NULL DEFAULT 'document'
  CHECK(document_type IN ('document', 'plan', 'review'));
ALTER TABLE project_documents ADD COLUMN mime_type TEXT;
ALTER TABLE project_documents ADD COLUMN size_bytes INTEGER;
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id);
