#!/bin/sh
set -eu
umask 077
cd /opt/draftmango/current/deploy
mkdir -p /opt/draftmango/backups
target="/opt/draftmango/backups/database-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f "$target.partial"' EXIT
docker compose exec -T db pg_dump -U postgres -d draftmango --format=custom > "$target.partial"
test -s "$target.partial"
mv "$target.partial" "$target"
printf 'Database backup created: %s\n' "$target"
# No automatic deletion. Configure retention and encrypted off-server copies
# before accepting customer data.
