CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  category VARCHAR(50) CHECK (category IN ('communication', 'database', 'web', 'productivity', 'developer', 'business', 'files', 'ai', 'custom')),
  type VARCHAR(20) NOT NULL DEFAULT 'builtin' CHECK (type IN ('builtin', 'custom', 'integration')),
  integration_id UUID,
  credential_id UUID,
  config JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tools_workspace ON tools(workspace_id);
CREATE INDEX idx_tools_category ON tools(category);
