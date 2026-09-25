#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite

echo "=== Webhook Entity ==="
sqlite3 $DB "SELECT * FROM webhook_entity;"

# Fix the webhook path to be just "askai" (remove the workflow ID prefix)
sqlite3 $DB "UPDATE webhook_entity SET webhookPath = 'askai' WHERE webhookPath LIKE '%askai';"

echo "=== Webhook Entity after fix ==="
sqlite3 $DB "SELECT * FROM webhook_entity;"
