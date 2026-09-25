#!/bin/sh
apk add --no-cache sqlite
DB=/data/database.sqlite

# Fix the user - set proper email
sqlite3 $DB "UPDATE user SET email = 'admin@techai.local', firstName = 'Admin', lastName = 'User' WHERE id = 'd0bc41b8-4a78-4f35-8f3c-2a7503e8aa31';"
echo "Updated user"

# Set instance owner as set up
sqlite3 $DB "UPDATE settings SET value = 'true' WHERE key = 'userManagement.isInstanceOwnerSetUp';"
echo "Set isInstanceOwnerSetUp to true"

# Verify
echo "=== User ==="
sqlite3 $DB "SELECT id, email, firstName, lastName FROM user;"
echo "=== Settings ==="
sqlite3 $DB "SELECT key, value FROM settings;"
