#!/usr/bin/env bash
# Nightly backup of the election database and the candidate photos.
#
# The photos in backend/uploads are on local disk and are not in git — a lost
# server means lost candidate images unless this runs.
#
# Install:
#   sudo install -m 750 -o voting -g voting deploy/backup.sh /opt/voting/backup.sh
#   sudo -u voting crontab -e
#   15 1 * * * /opt/voting/backup.sh >> /var/log/voting-backup.log 2>&1
set -euo pipefail

APP_DIR="/opt/voting/app/backend"
DEST="/var/backups/voting"
KEEP_DAYS=14
STAMP="$(date +%Y-%m-%d_%H%M)"

# Read MONGO_URI out of the app's .env without sourcing the whole file.
MONGO_URI="$(grep -E '^MONGO_URI=' "$APP_DIR/.env" | head -n1 | cut -d= -f2-)"
if [ -z "$MONGO_URI" ]; then
  echo "[backup] MONGO_URI not found in $APP_DIR/.env" >&2
  exit 1
fi

mkdir -p "$DEST"

echo "[backup] $STAMP — dumping database"
mongodump --uri="$MONGO_URI" --archive="$DEST/db-$STAMP.archive.gz" --gzip --quiet

echo "[backup] $STAMP — archiving uploads"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$APP_DIR" uploads

echo "[backup] pruning archives older than $KEEP_DAYS days"
find "$DEST" -type f -name '*-*.gz' -mtime "+$KEEP_DAYS" -delete
find "$DEST" -type f -name '*.archive.gz' -mtime "+$KEEP_DAYS" -delete

echo "[backup] done — $(ls -1 "$DEST" | wc -l) files in $DEST"
