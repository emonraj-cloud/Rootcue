CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model_identifier VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'llm' CHECK (type IN ('llm', 'embedding', 'vision', 'tts', 'stt')),
  max_tokens INTEGER,
  context_length INTEGER,
  supports_streaming BOOLEAN DEFAULT true,
  supports_functions BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_models_workspace ON models(workspace_id);
CREATE INDEX idx_models_provider ON models(provider_id);
CREATE INDEX idx_models_type ON models(type);
