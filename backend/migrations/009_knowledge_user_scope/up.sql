ALTER TABLE knowledge_documents ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
