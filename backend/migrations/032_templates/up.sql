CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('customer_support', 'marketing', 'sales', 'hr', 'research', 'development', 'data', 'productivity', 'personal', 'custom')),
  icon_url TEXT,
  config JSONB NOT NULL,
  required_tools JSONB DEFAULT '[]'::jsonb,
  required_model BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_featured ON templates(is_featured);
