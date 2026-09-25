CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  embedding_model_id UUID REFERENCES models(id),
  chunking_strategy VARCHAR(50) DEFAULT 'recursive',
  chunk_size INTEGER DEFAULT 512,
  chunk_overlap INTEGER DEFAULT 128,
  embedding_dimensions INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_bases_workspace ON knowledge_bases(workspace_id);
