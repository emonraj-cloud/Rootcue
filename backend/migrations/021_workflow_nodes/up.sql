CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL,
  node_type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  position_x INTEGER,
  position_y INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, node_id)
);

CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
