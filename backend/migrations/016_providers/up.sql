CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ollama', 'openai', 'anthropic', 'google', 'custom')),
  base_url TEXT,
  api_key_encrypted TEXT,
  is_connected BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_workspace ON providers(workspace_id);
CREATE INDEX idx_providers_type ON providers(type);
