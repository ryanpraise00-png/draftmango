# Draftmango HTTPS deployment, 2026-10-25

## Public URL: https://draftmango.com/
HTTP and www redirect to the HTTPS apex. Cloudflare DNS-only records are:
A @ 187.124.47.123, CNAME www draftmango.com. No AAAA record is configured.

Certificate: Let's Encrypt, covers draftmango.com and www.draftmango.com.
Initial expiry: 2027-01-23.
The separate certificate directory is /etc/letsencrypt/draftmango-managed.
Nginx reads .../live/draftmango.com/fullchain.pem and privkey.pem there.
The shared proxy's other certificate renewal processes do not manage this tree.
Certbot image is pinned to:
certbot/certbot@sha256:f70ad0adbb7e117f0fe42a63c553f28ea451edabc0148757b6efcd9735acaa20

## Renewal
```
systemctl status draftmango-certificate.timer
systemctl start draftmango-certificate.service
journalctl -u draftmango-certificate.service --no-pager -n 30
/usr/local/sbin/draftmango-renew-certificate --dry-run
```

The systemd timer checks twice daily with a randomized delay. The script
uses a lock to prevent overlap, renews only Draftmango, checks the Nginx
configuration, and reloads Nginx only if the installed certificate changes.

## Proxy
```
/home/xensiq/Oxtune/nginx/conf.d/draftmango.conf
/home/xensiq/Oxtune/nginx/docker-compose.yml
```
The existing Nginx container is attached to draftmango-edge at 172.16.9.254;
this attachment is persisted in its Compose service. The app trusts only
that IP for X-Real-IP. Nginx overwrites incoming proxy headers.
Do not enable Cloudflare proxying until trusted Cloudflare client-IP handling
is configured; production is currently tested with DNS-only routing.

## Recovery files
```
/opt/draftmango/backups/https-20261025/nginx-compose.yml
/opt/draftmango/backups/https-20261025/nginx-http.conf
/opt/draftmango/backups/https-20261025/web.env (secret: never print/share)
```
To return the new domain to its setup response, restore only nginx-http.conf
to the Draftmango virtual host, run nginx -t, then reload. Do not overwrite
the shared Compose file after other projects have made subsequent changes.

App release remains 20261025-02, served through the private Docker network.
Public signup is disabled; production email/provider keys/billing still need
configuration. Local accounts and drafts were not migrated. Customer-site
publishing is a separate feature and is not enabled by this domain setup.

Documentation: https://eff-certbot.readthedocs.io/en/stable/using.html
