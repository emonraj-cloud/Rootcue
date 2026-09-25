#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite
echo "=== Published Version Schema ==="
sqlite3 $DB ".schema workflow_published_version"
echo "=== Published Version Data ==="
sqlite3 $DB "SELECT * FROM workflow_published_version;"
echo "=== Publication Outbox ==="
sqlite3 $DB "SELECT * FROM workflow_publication_outbox;"
echo "=== Publication Trigger Status ==="
sqlite3 $DB "SELECT * FROM workflow_publication_trigger_status;"
echo "=== Workflow History Full ==="
sqlite3 $DB "SELECT versionId, workflowId, authors, autosaved, name FROM workflow_history;"
