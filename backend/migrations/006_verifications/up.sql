CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
