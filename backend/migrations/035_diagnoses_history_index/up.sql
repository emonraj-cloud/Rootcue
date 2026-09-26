-- History is always read as "this user's diagnoses, newest first". Without
-- this the database falls back to a sort over every row for the user, which
-- gets slow once the account has a few thousand entries.
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_created
  ON diagnoses (user_id, created_at DESC);

-- Same reasoning for the join that shows the latest verification per
-- diagnosis.
CREATE INDEX IF NOT EXISTS idx_verifications_diagnosis_created
  ON verifications (diagnosis_id, created_at DESC)
  WHERE diagnosis_id IS NOT NULL;
