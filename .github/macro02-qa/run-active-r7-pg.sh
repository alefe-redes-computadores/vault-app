#!/usr/bin/env bash
set -euo pipefail
# Runs only inside CI: disposable PostgreSQL 17.6, no network to production.
p=scripts/macro02-activation-lab
name="macro02-active-pg17-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-1}"
out=$(mktemp -d)
image=postgres@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3
if docker container inspect "$name" >/dev/null 2>&1; then echo 'STOP: lab name already exists'; rm -rf -- "$out"; exit 2; fi
cid=''
cleanup(){
 local rc=$?
 trap - EXIT
 if [[ -n "$cid" ]]; then
  if (( rc != 0 )); then
   echo '=== PostgreSQL container state and logs (synthetic lab only) ===' >&2
   docker inspect --format '{{json .State}}' "$cid" >&2 || true
   docker logs --tail 200 "$cid" >&2 || true
  fi
  docker rm -f "$cid" >/dev/null 2>&1 || true
 fi
 rm -rf -- "$out"
 exit "$rc"
}
trap cleanup EXIT
node "$p/active-fixtures-r7.cjs" "$out"
# Avoid the image entrypoint's implicit init lifecycle. Keep the container on
# failure until diagnostics have been emitted. Same immutable PG17.6 image.
docker pull "$image"
cid=$(docker run -d --name "$name" --network none --user postgres --entrypoint /bin/bash "$image" -euc '
 export LC_ALL=C
 initdb -D /tmp/m02pg --username=pg_lab_admin --auth-local=trust --auth-host=reject --no-locale --encoding=UTF8
 exec postgres -D /tmp/m02pg -c listen_addresses= -c unix_socket_directories=/tmp
')
[[ "$cid" =~ ^[0-9a-f]{64}$ ]]
ready=0
for i in $(seq 1 90); do
 state=$(docker inspect --format '{{.State.Status}}' "$cid")
 if [[ "$state" != running ]]; then echo "PG17_STARTUP_STATE=$state" >&2; exit 1; fi
 if docker exec "$cid" pg_isready -h /tmp -U pg_lab_admin -d postgres >/dev/null 2>&1; then ready=1; break; fi
 sleep 1
done
if [[ "$ready" != 1 ]]; then echo 'PG17_READINESS_TIMEOUT' >&2; exit 1; fi
psql_admin(){ docker exec -i "$cid" psql -X -h /tmp -v ON_ERROR_STOP=1 -U pg_lab_admin -d postgres "$@"; }
psql_lab(){ docker exec -i "$cid" psql -X -h /tmp -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
psql_admin -Atqc 'SHOW server_version_num' | grep -x '170006'
psql_admin < "$p/active-fixture-r7.sql"
for m in supabase/migrations/20261126184838_vault_evolution_macro02_r6_expand_inactive.sql supabase/migrations/20261126184907_vault_evolution_macro02_r6_writers_inactive.sql supabase/migrations/20261126212304_vault_evolution_macro02_r2_dormant_capability_receipts.sql; do psql_lab -1 < "$m"; done
psql_lab < "$out/seed.sql"
psql_lab < "$p/migration-03-r6-candidate.sql"
echo MACRO02_MIGRATION03_REAL_PG17_APPLIED_ISOLATED
psql_lab < "$p/active-enrollment-r7-tests.sql"
# Commit and discard the original response, then fetch it in a separate session.
# Independent retry and full parent receipt both must match the original request.
for k in adjustment acquisition unquantified prescription; do
 psql_lab -qAt < "$out/$k.sql" > /dev/null
 psql_lab -qAt < "$out/$k.sql" > "$out/$k.ack.json"
 psql_lab -qAt < "$out/$k.ledger.sql" > "$out/$k.ledger.json"
done
node "$p/active-fixtures-r7.cjs" "$out" verify
if psql_lab -qAt < "$out/rollback.sql" > "$out/rollback.log" 2>&1; then echo 'UNEXPECTED_ROLLBACK_SUCCESS';exit 1;fi
# Require failure at the second writer (late CAS), not a malformed first child.
grep -E 'M02_R5_CREATE_CAS|duplicate key value' "$out/rollback.log" || { cat "$out/rollback.log";exit 1; }
if psql_lab -qAt < "$out/bad-stock.sql" > "$out/bad-stock.log" 2>&1; then echo 'UNEXPECTED_UNKNOWN_STOCK_SUCCESS';exit 1;fi
# Changed committed request intentionally reuses the operation id; must reject.
# Separate same-preimage writes must serialize and exactly one must succeed.
set +e
psql_lab -qAt < "$out/race.sql" > "$out/race.log" 2>&1 & a=$!
psql_lab -qAt < "$out/rival.sql" > "$out/rival.log" 2>&1 & b=$!
wait "$a"; ar=$?;wait "$b";br=$?
set -e
if ! { [[ $ar = 0 && $br != 0 ]] || [[ $br = 0 && $ar != 0 ]]; }; then cat "$out/race.log" "$out/rival.log";echo 'M02_R7_RACE';exit 1;fi
if [[ $ar != 0 ]]; then grep -E 'M02_R6_MED_PREIMAGE|M02_R5_PREIMAGE_CAS' "$out/race.log";else grep -E 'M02_R6_MED_PREIMAGE|M02_R5_PREIMAGE_CAS' "$out/rival.log";fi
psql_lab < "$p/active-postimages-r7-tests.sql"
echo MACRO02_ACTIVE_COMPOUND_PG17_GATE_PASS
