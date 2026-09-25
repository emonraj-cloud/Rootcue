-- Add workspace_id to users table
ALTER TABLE users ADD COLUMN workspace_id UUID REFERENCES workspaces(id);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'paused', 'error')),
  agent_type VARCHAR(50) NOT NULL DEFAULT 'general',
  model_config JSONB DEFAULT '{}'::jsonb,
  instructions TEXT,
  personality TEXT,
  response_style TEXT,
  rules TEXT,
  tool_ids JSONB DEFAULT '[]'::jsonb,
  knowledge_base_ids JSONB DEFAULT '[]'::jsonb,
  guardrails JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(agent_type);
