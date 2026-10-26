#!/bin/sh
set -eu
# Generated passwords use hexadecimal only. Never echo them or enable shell tracing.
app_password=$(cat /run/secrets/db_app_password)
case "$app_password" in ''|*[!a-f0-9]*) exit 1 ;; esac
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE draftmango LOGIN PASSWORD '$app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE draftmango OWNER TO draftmango;
ALTER SCHEMA public OWNER TO draftmango;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
