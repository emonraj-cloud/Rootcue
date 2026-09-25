#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite

USER_ID=$(sqlite3 $DB "SELECT id FROM user LIMIT 1;")
echo "User ID: $USER_ID"

# Insert API key with correct columns (no audience, no scopes)
sqlite3 $DB "DELETE FROM user_api_keys;"
sqlite3 $DB "INSERT INTO user_api_keys (id, userId, label, apiKey, createdAt, updatedAt) VALUES ('550e8400-e29b-41d4-a716-446655440000', '$USER_ID', 'Tech AI', 'sk-n8n-tech-ai-key-2024', datetime('now'), datetime('now'));"

echo "=== API Keys ==="
sqlite3 $DB "SELECT id, label, apiKey FROM user_api_keys;"

# Also update user email
sqlite3 $DB "UPDATE user SET email = 'admin@techai.local', \"firstName\" = 'Admin', \"lastName\" = 'User' WHERE id = '$USER_ID';"
echo "=== User ==="
sqlite3 $DB "SELECT id, email, \"firstName\" FROM user;"

# Fix settings
sqlite3 $DB "UPDATE settings SET value = 'true' WHERE key = 'userManagement.isInstanceOwnerSetUp';"
sqlite3 $DB "SELECT key, value FROM settings WHERE key = 'userManagement.isInstanceOwnerSetUp';"
