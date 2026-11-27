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
# Avoid the image entrypoint's implicit init lifecycle. Keep the container on
# failure until diagnostics have been emitted. Same immutable PG17.6 image.
docker pull "$image"
cid=$(docker run -d --name "$name" --network none --user postgres --entrypoint /bin/bash "$image" -euc '
 export LC_ALL=C
 initdb -D /tmp/m02pg --username=vault_lab_admin --auth-local=trust --auth-host=reject --no-locale --encoding=UTF8
 exec postgres -D /tmp/m02pg -c listen_addresses= -c unix_socket_directories=/tmp
')
[[ "$cid" =~ ^[0-9a-f]{64}$ ]]
ready=0
for i in $(seq 1 90); do
 state=$(docker inspect --format '{{.State.Status}}' "$cid")
 if [[ "$state" != running ]]; then echo "PG17_STARTUP_STATE=$state" >&2; exit 1; fi
 if docker exec "$cid" pg_isready -h /tmp -U vault_lab_admin -d postgres >/dev/null 2>&1; then ready=1; break; fi
 sleep 1
done
if [[ "$ready" != 1 ]]; then echo 'PG17_READINESS_TIMEOUT' >&2; exit 1; fi
psql_admin(){ docker exec -i "$cid" psql -X -h /tmp -v ON_ERROR_STOP=1 -U vault_lab_admin -d postgres "$@"; }
psql_lab(){ docker exec -i "$cid" psql -X -h /tmp -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }
psql_admin -Atqc 'SHOW server_version_num' | grep -x '170006'
psql_admin < "$p/active-fixture-r7.sql"
for m in supabase/migrations/20261126184838_vault_evolution_macro02_r6_expand_inactive.sql supabase/migrations/20261126184907_vault_evolution_macro02_r6_writers_inactive.sql supabase/migrations/20261126212304_vault_evolution_macro02_r2_dormant_capability_receipts.sql; do psql_lab -1 < "$m"; done
psql_lab <<'UI_SEED_SQL'
UPDATE public.persons SET is_default=true WHERE id='00000000-0000-4000-8000-000000000002';
INSERT INTO public.medicamentos(id,user_id,person_id,nome,dosagem,tipo_uso,status,estoque_quantidade,estoque_unidade_medida,estoque_unidade_por_dose,estoque_horarios,estoque_data_referencia,tratamento_ids,cid_ids,forma_farmaceutica)
VALUES('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','QA Dose Sintetica','1 unidade','continuo','ativo',10,'comprimido',1,ARRAY['00:00','00:01'],current_date-1,ARRAY[]::text[],ARRAY[]::text[],'comprimido'),
('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','QA Aquisicao Sintetica','1 unidade','continuo','ativo',7,'comprimido',1,ARRAY[]::text[],current_date-1,ARRAY[]::text[],ARRAY[]::text[],'comprimido');
UI_SEED_SQL
psql_lab < "$p/migration-03-r6-candidate.sql"
echo MACRO02_MIGRATION03_REAL_PG17_APPLIED_ISOLATED
psql_lab < "$p/active-enrollment-r7-tests.sql"
export LAB_PG_CID="$cid"
node "$UI_GATE_DIR/browser.cjs"
