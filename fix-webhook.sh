#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite

# Fix the webhook_entity - correct path and set webhookId to node ID
sqlite3 $DB "DELETE FROM webhook_entity;"
sqlite3 $DB "INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength) VALUES ('1bo1vunZzYKUqxzg', 'askai', 'POST', 'Webhook - Ask AI', 'b9d5293a-333a-47e2-a58d-569a2b131547', 5);"

echo "=== Webhook Entity ==="
sqlite3 $DB "SELECT * FROM webhook_entity;"
