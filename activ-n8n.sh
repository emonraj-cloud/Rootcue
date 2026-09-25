#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite

echo "=== Before ==="
sqlite3 $DB "SELECT id, name, active FROM workflow_entity;"

# Activate the workflow
sqlite3 $DB "UPDATE workflow_entity SET active = 1 WHERE name = 'Tech AI Ask AI';"

echo "=== After ==="
sqlite3 $DB "SELECT id, name, active FROM workflow_entity;"
