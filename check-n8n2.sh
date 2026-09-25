#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite

echo "=== Webhook Entity ==="
sqlite3 $DB ".schema webhook_entity" 2>&1
sqlite3 $DB "SELECT * FROM webhook_entity;" 2>&1

echo "=== Environment Settings ==="
sqlite3 $DB "SELECT key, value FROM settings WHERE key LIKE '%webhook%' OR key LIKE '%Webhook%';" 2>&1

echo "=== Full Log Check ==="
sqlite3 $DB "SELECT * FROM settings;" 2>&1
