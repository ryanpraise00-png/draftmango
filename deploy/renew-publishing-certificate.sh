#!/bin/bash
set -euo pipefail
exec 9>/run/draftmango-publishing-certificate.lock
flock -n 9 || exit 0
image=$(cat /opt/draftmango/shared/publishing-certbot-image)
docker run --rm \
  -v /etc/letsencrypt/draftmango-publishing:/etc/letsencrypt \
  -v /opt/draftmango/certbot-publishing/work:/var/lib/letsencrypt \
  -v /opt/draftmango/certbot-publishing/log:/var/log/letsencrypt \
  -v /opt/draftmango/shared/cloudflare-dns.ini:/run/secrets/cloudflare.ini:ro \
  "$image" renew --non-interactive "$@"
certificate=/etc/letsencrypt/draftmango-publishing/live/draftmango-sites/fullchain.pem
current=$(sha256sum "$certificate" | cut -d' ' -f1)
previous=$(cat /opt/draftmango/certbot-publishing/loaded.sha256 2>/dev/null || true)
if [ "$current" != "$previous" ]; then
  docker exec nginx-nginx-1 nginx -t
  docker exec nginx-nginx-1 nginx -s reload
  printf '%s\n' "$current" > /opt/draftmango/certbot-publishing/loaded.sha256
fi
