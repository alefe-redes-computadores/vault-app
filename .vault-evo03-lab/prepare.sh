#!/usr/bin/env bash
set -euo pipefail
[[ ${GITHUB_ACTIONS:-} == true && ${GITHUB_REF:-} == refs/heads/vault/lab/evolution03-20261126-r06 ]] || { echo 'STOP branch';exit 2; }
target=bd8c23bf16e76ea7f362f80c50e8bdeb0ae9a14b
[[ $(git rev-parse HEAD^) == "$target" ]] || { echo "STOP incorrect diagnostic parent";exit 2; }
root=$PWD; lab="$RUNNER_TEMP/evo03-lab"; base="$RUNNER_TEMP/evo03-base"; test ! -e "$lab" && test ! -e "$base";mkdir "$lab" "$base"
sha256sum -c .vault-evo03-lab/payload.sha256
unzip -q .vault-evo03-lab/payload.zip -d "$lab"
(cd "$lab";sha256sum -c CI-SHA256SUMS.txt >/dev/null)
PYTHONDONTWRITEBYTECODE=1 python3 "$lab/tests/test_ci_r06_isolation.py"
git archive 43c39ee489283c772fa52fa07803b2735e94737e | tar -x -C "$base"
python3 - "$base" "$lab/docs/BASELINE-SHA256.json" <<'PYBASE'
import sys,json,hashlib,pathlib
root=pathlib.Path(sys.argv[1]);expected=json.loads(pathlib.Path(sys.argv[2]).read_text());actual={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
assert expected==actual, 'STOP exact baseline byte mismatch'
print('BASELINE_SHA256_PASS',len(actual))
PYBASE
# Preserve historical evidence, but run actual host checks on the exact observed Macro02 parent.
remote="$RUNNER_TEMP/evo03-observed-macro02"; test ! -e "$remote";mkdir "$remote"
git archive "$target" | tar -x -C "$remote"
python3 "$lab/tests/test_reanchor_review.py"
python3 "$lab/tools/reanchor-review-tree.py" "$root" "$remote" "$lab/candidate" "$RUNNER_TEMP/evo03-reanchor-receipt.json"
printf 'EVO03_LAB=%s\n' "$lab" >> "$GITHUB_ENV"
