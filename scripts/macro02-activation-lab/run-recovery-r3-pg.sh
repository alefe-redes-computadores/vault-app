#!/usr/bin/env bash
set -euo pipefail
# New recovery claim fixture only. No production connection or credentials.
name=macro02-recovery-r3-pg17
p=scripts/macro02-activation-lab
if docker container inspect "$name" >/dev/null 2>&1; then echo 'STOP: lab name already exists'; exit 2; fi
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$name" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3 >/dev/null
for i in $(seq 1 90); do if docker exec "$name" pg_isready -U postgres -d postgres >/dev/null 2>&1; then break; fi; sleep 1; done
psql_lab(){ docker exec -i "$name" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
psql_lab -Atqc 'SHOW server_version_num' | grep -E '^17[0-9]{4}$'
psql_lab < "$p/fixture.sql"
psql_lab < "$p/fence-recovery-r3-candidate.sql"
psql_lab < "$p/fence-recovery-r3-tests.sql"
