#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite
echo "=== Webhook Entity ==="
sqlite3 $DB "SELECT * FROM webhook_entity;"
