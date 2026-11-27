#!/usr/bin/env bash
set -euo pipefail
unset PYTHONOPTIMIZE
[[ ${GITHUB_ACTIONS:-} == true && ${GITHUB_REF:-} == refs/heads/vault/lab/evolution03-20261126-r26 && ${GITHUB_REPOSITORY:-} == alefe-redes-computadores/vault-app ]] || { echo 'STOP lab only';exit 2; }
[[ $(git rev-parse HEAD^) == 109b116e997de0087883c5b0a7deb94143d97ef3 ]] || { echo 'STOP envelope parent';exit 2; }
root=$PWD; lab="$RUNNER_TEMP/evo03-lab"; stage="$RUNNER_TEMP/evo03-r20-input"; evidence="$RUNNER_TEMP/evo03-r20-evidence"
test ! -e "$lab" && test ! -e "$stage" && test ! -e "$evidence";mkdir "$stage" "$lab" "$evidence"
sha256sum -c .vault-evo03-r20/input.sha256
unzip -q .vault-evo03-r20/input.zip -d "$stage"
(cd "$stage";sha256sum -c SHA256SUMS.txt >/dev/null)
PYTHONDONTWRITEBYTECODE=1 python3 "$stage/r20/test_r25.py" > "$evidence/r25-local-tests.log" 2>&1
python3 "$stage/r20/r25-verify.py" "$evidence/certified-runs.json"
python3 "$stage/r20/safe-unzip.py" "$stage/reference/payload-r24.zip" "$lab"
(cd "$lab";sha256sum -c CI-SHA256SUMS.txt >/dev/null)
# Reproduce R24 pre-adaptation tests, then change only exact branch guards.
PYTHONDONTWRITEBYTECODE=1 python3 "$lab/tests/test_ci_r23_isolation.py" > "$evidence/r24-isolation.log" 2>&1
python3 "$stage/r20/r25-materialize.py" "$root" "$lab" "$stage" "$evidence"
python3 "$stage/r20/contract-union.py" "$root" "$stage/reference/source-manifest.json" "$lab/candidate" - "$evidence/v63-union-preflight.json"
# The real materialized candidate must be byte-identical to R25 across all lanes.
cmp "$lab/r20-receipt.json" "$stage/reference/r25-materialization.json"
python3 "$stage/r20/adapt-drivers.py" "$lab" "$evidence/driver-guard-delta.json"
python3 "$stage/r20/adapt-r26-fixtures.py" "$lab" "$evidence/r26-fixture-delta.json"
PYTHONDONTWRITEBYTECODE=1 python3 "$stage/r20/test_r26.py" > "$evidence/r26-local-tests.log" 2>&1
node "$stage/r20/test-r26-schema.cjs" "$lab/tools" > "$evidence/r26-schema-tests.log" 2>&1
node --test "$stage/r20/test-r26-resolver.cjs" > "$evidence/r26-static-tests.log" 2>&1
printf 'EVO03_LAB=%s\nR20_STAGE=%s\nR20_EVIDENCE=%s\nR20_REPO=%s\nR20_MACRO02_SHA=%s\n' "$lab" "$stage" "$evidence" "$root" d2a024e72b0a4796ed06ae3064b538c2960d2aeb >> "$GITHUB_ENV"
