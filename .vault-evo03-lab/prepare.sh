#!/usr/bin/env bash
set -euo pipefail
[[ ${GITHUB_ACTIONS:-} == true && ${GITHUB_REF:-} == refs/heads/vault/lab/evolution03-20261126-r19 ]] || { echo 'STOP branch';exit 2; }
target=bd8c23bf16e76ea7f362f80c50e8bdeb0ae9a14b
[[ $(git rev-parse HEAD^) == "$target" ]] || { echo "STOP incorrect diagnostic parent";exit 2; }
root=$PWD; lab="$RUNNER_TEMP/evo03-lab"; base="$RUNNER_TEMP/evo03-base"; test ! -e "$lab" && test ! -e "$base";mkdir "$lab" "$base"
sha256sum -c .vault-evo03-lab/payload.sha256
unzip -q .vault-evo03-lab/payload.zip -d "$lab"
(cd "$lab";sha256sum -c CI-SHA256SUMS.txt >/dev/null)
PYTHONDONTWRITEBYTECODE=1 python3 "$lab/tests/test_ci_r19_isolation.py"
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
python3 - "$RUNNER_TEMP/evo03-reanchor-receipt.json" "$lab/evidence/r15/r14-reanchor-receipt.json" "$lab/evidence/r17/runtime-delta.json" <<'PYRECEIPT'
import sys,json
new,old,delta=(json.load(open(x)) for x in sys.argv[1:]);n={x['path']:x for x in new['receipts']};o={x['path']:x for x in old['receipts']};d={x['path']:x for x in delta['changed']}
assert new['target_sha']==old['target_sha'] and new['historical_base']==old['historical_base'] and set(n)==set(o)|set(d)
for k,v in n.items():
 if k not in d:assert v==o[k],k
 else:
  assert v['candidate_post_sha256']==d[k]['after'] and v['decision']=='exact-preimage',k
  if k in o:assert v['target_pre_sha256']==o[k]['target_pre_sha256'] and v['candidate_post_sha256']!=o[k]['candidate_post_sha256'],k
  else:assert v['target_pre_sha256'] is None,k
print('R17_REANCHOR_ONLY_DOCUMENTED_RUNTIME_DELTA',len(d))
PYRECEIPT
printf 'EVO03_LAB=%s\n' "$lab" >> "$GITHUB_ENV"
