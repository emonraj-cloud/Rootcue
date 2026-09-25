CREATE TABLE workflow_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id VARCHAR(100) NOT NULL,
  source_handle VARCHAR(50),
  target_node_id VARCHAR(100) NOT NULL,
  target_handle VARCHAR(50),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_connections_workflow ON workflow_connections(workflow_id);
CREATE INDEX idx_workflow_connections_source ON workflow_connections(workflow_id, source_node_id);
CREATE INDEX idx_workflow_connections_target ON workflow_connections(workflow_id, target_node_id);
