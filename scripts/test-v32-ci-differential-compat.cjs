#!/usr/bin/env node
'use strict';
/** V32 FIX2: enforce intent, not stale literal commands or false certification. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const wf=fs.readFileSync('.github/workflows/build-android.yml','utf8');
const m57=fs.readFileSync('scripts/test-vault-m57-android-export.cjs','utf8');
const m67=fs.readFileSync('scripts/test-vault-m67-final-certification.cjs','utf8');
const m87=fs.readFileSync('scripts/test-vault-m87-m89-update-center.cjs','utf8');
const runner=fs.readFileSync('scripts/test-v63-differential-release.mjs','utf8');
const strict=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const pos=s=>wf.indexOf(s);
const stepGate=pos('npm run test:release');
const stepTS=pos('artifacts/V63-STRICT.log');
const stepExport=pos('run: node scripts/ci-build-export-resilient.cjs');
const stepSignature=pos('ASSINATURA E VERSIONCODE DO VAULT VALIDADOS.');
const stepApk=pos('name: Vault-App-debug');
const stepRelease=pos('gh release create');
assert(stepGate>=0 && stepTS>stepGate && stepExport>stepTS && wf.includes('set -euo pipefail'),'V33 gate estrito+log devem preceder a exportação');
assert(stepSignature>=0&&stepApk>=0&&stepRelease>=0&&pos('uses: actions/upload-artifact@v4')>stepSignature,'primeiro upload somente após assinatura');
assert(stepApk>stepSignature && stepApk<stepRelease,'artefato APK anterior ao release');
assert(wf.includes('if-no-files-found: error')&&wf.includes('retention-days: 7'),'APK ausente não é sucesso');
assert(wf.includes('if: always()')&&wf.includes('name: Vault-V63-Strict-Audit'),'falha preserva relatório estrito do gate');
assert(wf.includes("if: success() && github.ref == 'refs/heads/main' && vars.VAULT_ALLOW_STRICT_ANDROID_RELEASE == 'true'"),'release exige autorização explícita');
assert(wf.includes('permissions:\n  contents: write')&&wf.includes('GH_TOKEN: ${{ github.token }}'),'sem token adicional');
assert(pkg.scripts['test:release'].includes('test-v63-release-gate.mjs')&&pkg.scripts['test:release'].includes('tsc --noEmit'),'modo estrito original continua disponível');
assert(strict.includes('if (result.status !== 0) process.exit'),'gate estrito ainda bloqueia no erro');
assert(runner.includes('CAUSA_ALTERADA')&&runner.includes('REPROVACAO_NOVA_OU_FORA_DA_ALLOWLIST')&&runner.includes('HARD_GATE_FALHOU'),'diferencial conserva proteção');
for(const name of ['test-vault-m57-android-export.cjs','test-vault-m67-final-certification.cjs','test-vault-m87-m89-update-center.cjs']){
 assert(runner.includes("'scripts/"+name+"'"),'hard gate Android obrigatório: '+name);
}
assert(m57.includes('preserva gate estrito antes do build')&&m67.includes('publicação estrita somente com opt-in expresso'),'contratos modernos exigem execução estrita');
assert(m87.includes('release só ocorre após certificado, build e artefato'),'M87 não enfraquecido');
console.log('V33 CI ANDROID E LEGADOS: proteções estritas e V32 diferencial preservadas');
