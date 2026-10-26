#!/bin/sh
set -eu
umask 077
exec 9>/run/lock/draftmango-certificate.lock
flock -n 9 || exit 0
case "${1:-}" in ''|--dry-run) ;; *) exit 2 ;; esac
docker run --rm --name draftmango-certbot-renew --memory 256m --cpus 0.5 \
  -v /etc/letsencrypt/draftmango-managed:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -v /opt/draftmango/certbot/work:/var/lib/letsencrypt \
  -v /opt/draftmango/certbot/logs:/var/log/letsencrypt \
  certbot/certbot@sha256:f70ad0adbb7e117f0fe42a63c553f28ea451edabc0148757b6efcd9735acaa20 \
  renew --cert-name draftmango.com --webroot --webroot-path /var/www/certbot --non-interactive ${1:-}
if [ "${1:-}" = '--dry-run' ]; then exit 0; fi
current=$(sha256sum /etc/letsencrypt/draftmango-managed/live/draftmango.com/fullchain.pem | cut -d ' ' -f 1)
loaded=$(cat /opt/draftmango/certbot/loaded.sha256 2>/dev/null || true)
if [ "$current" != "$loaded" ]; then
  docker exec nginx-nginx-1 nginx -t
  docker exec nginx-nginx-1 nginx -s reload
  printf '%s\n' "$current" > /opt/draftmango/certbot/loaded.sha256
fi
