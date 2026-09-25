ALTER TABLE verifications ADD COLUMN diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE SET NULL;
