#!/usr/bin/env bash
set -euo pipefail
# Laboratory only. Container is not exposed on the host network. Never accepts
# a database URL or any production credential. Synthetic fixture only.
name=macro02-activation-pg17
p=scripts/macro02-activation-lab
if docker container inspect "$name" >/dev/null 2>&1; then echo 'STOP: lab name already exists'; exit 2; fi
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$name" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3 >/dev/null
for i in $(seq 1 90); do if docker exec "$name" pg_isready -U postgres -d postgres >/dev/null 2>&1; then break; fi; sleep 1; done
psql_lab(){ docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
psql_lab -Atqc 'SHOW server_version_num' | grep -E '^17[0-9]{4}$'
psql_lab < "$p/fixture.sql"
psql_lab < "$p/fence-draft.sql"
psql_lab < "$p/fence-tests.sql"
python "$p/fence-race.py"
# Exercise the actual PostgreSQL JSON wire against the TypeScript validator.
# Snapshot is synthetic, kept in a temporary file only; not an artifact.
tmp=$(mktemp); trap 'rm -f "$tmp"; docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
psql_lab -q <<'SQL'
SELECT vault_macro02_private.cutover_freeze_lab('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000096','wire-fixture');
SQL
psql_lab -qAt > "$tmp" <<'SQL'
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
SELECT public.vault_macro02_cutover_snapshot_lab('00000000-0000-4000-8000-000000000096');
SQL
node "$p/fence-read.cjs" --pg-snapshot "$tmp"
psql_lab -q <<'SQL'
SELECT vault_macro02_private.cutover_cancel_lab('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000096');
SQL
