#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite
echo "=== Webhook Entity ==="
sqlite3 $DB "SELECT * FROM webhook_entity;"
echo "=== Workflow ==="
sqlite3 $DB "SELECT id, name, active FROM workflow_entity;"
echo "=== Workflow History ==="
sqlite3 $DB "SELECT versionId, workflowId FROM workflow_history;"
echo "=== Publish History ==="
sqlite3 $DB "SELECT * FROM workflow_publish_history;"
echo "=== Published Version ==="
sqlite3 $DB "SELECT * FROM workflow_published_version;"
