#!/usr/bin/env node
'use strict';
/** G4-01/G4-03: strict gate composition, negative assertions and build config scope. No network/SQL. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = p => fs.readFileSync(p, 'utf8');
let checks = 0;
const ok = (condition, message) => {assert.ok(condition, 'G4: '+message);checks++;};
const equal = (actual, expected, message) => {assert.deepEqual(actual, expected, 'G4: '+message);checks++;};
const GATE = 'scripts/test-v63-release-gate.mjs';
const UX = 'scripts/test-vault-guardian3-ux.cjs';
const A11 = 'scripts/test-vault-a11-integral-360.cjs';
const CLINIC = 'scripts/test-vault-guardian3-g2-clinico.cjs';
const readGate = read(GATE);
const match = /const contracts = \[([\s\S]*?)\];/.exec(readGate);
ok(Boolean(match), 'V63 possui array permanente');
const list = [...match[1].matchAll(/"(scripts\/[^"\n]+)"/g)].map(x=>x[1]);
equal(list.length, 558, '558 contratos exatos, sem tolerância');
equal(new Set(list).size, 558, 'nenhuma suíte duplicada');
for (const p of list) ok(fs.existsSync(p), `contrato existente: ${p}`);
for (const file of [
  UX,
  A11,
  'scripts/test-vault-a10-integral-360.cjs',
  'scripts/test-vault-guardian-ga01-gp2-clinical.cjs',
  'scripts/test-vault-ga02-ga07-guardian.cjs',
  'scripts/test-vault-a7-m5-clinical-continuity-360.cjs',
]) {
  equal(list.filter(s => s === file).length, 1, `apenas uma ocorrência: ${file}`);
  ok(fs.existsSync(file), `contrato existe: ${file}`);
}
equal(list.filter(x=>x===CLINIC).length,0,'teste G2 clínico continua dirigido, não cria o 559º contrato');
ok(fs.existsSync(CLINIC),'teste G2 clínico permanece presente para execução dirigida');
function strict(items) {
  if (items.length !== 558) throw Error('contagem V63 divergente');
  if (new Set(items).size !== 558) throw Error('V63 duplicado');
  if (items.filter(x=>x===UX).length !== 1) throw Error('UX não único');
  if (items.filter(x=>x===A11).length !== 1) throw Error('A11 não única');
}
equal(list.filter(x=>x===A11).length,1,'A11 única, preservada no V63');
strict(list);checks++;
assert.throws(()=>strict(list.filter(x=>x!==UX)),/contagem/);checks++;
assert.throws(()=>strict(list.filter(x=>x!==A11)),/contagem/);checks++;
assert.throws(()=>strict([...list.slice(1), UX]),/V63 duplicado|UX não único/);checks++;
assert.throws(()=>strict(list.map(x=>x===UX?'scripts/test-fictitious.cjs':x)),/UX não único/);checks++;
ok(readGate.includes('if (result.status !== 0) process.exit('), 'CI fail-fast permanece bloqueante');
ok(readGate.includes('if (failedContracts.length > 0)') && readGate.includes('process.exit(1)'), 'coleta integral nunca aprova falhas');
ok(readGate.includes('VAULT_V63_COLLECT_ALL') && readGate.includes('V63_FALHA'), 'coleta exaustiva preservada');
ok(readGate.includes('scripts/test-v70-super-integrity-ux-contract.mjs') && readGate.includes('scripts/test-v70-final-completeness-contract.mjs'), 'V70 duplo mantido');
const clinical = read(CLINIC);
ok(clinical.includes("equal(list.length,558,'V63 composto de exatamente 558 contratos')"), 'reconciliação clínica exata 558');
ok(clinical.includes("list.filter(x=>x==='scripts/test-vault-guardian3-ux.cjs').length,1"), 'contrato clínico exige UX exatamente uma vez');
ok(clinical.includes("list.filter(x=>x==='scripts/test-vault-a11-integral-360.cjs').length,1"), 'contrato clínico exige A11 exatamente uma vez');
const a11Source=read(A11);
ok(a11Source.includes('eq(entries.length,558,'), 'A11 dirigida foi reconciliada de 557 para 558');
ok(a11Source.includes('eq(new Set(entries).size,558,'), 'A11 exige contratos distintos');
const ux = read(UX);
ok(ux.includes('GUARDIAN3_UX_CONTRATOS_OK') && ux.includes('toast e haptic após persistência'), 'teste Premium original preservado');
const pkg = JSON.parse(read('package.json'));
equal(pkg.scripts.build, 'npm run check:versions && node node_modules/next/dist/bin/next build', 'Vercel PWA mantém build do Next');
ok(pkg.scripts['build:export'].includes('CAPACITOR_BUILD=1'), 'Android continua usando export nativo');
const nextSource = read('next.config.js');
ok(nextSource.includes('process.env.VERCEL === "1" && !isCapacitorExport'), 'otimização limitada à Vercel PWA');
ok(nextSource.includes('experimental: { cpus: 1 }'), 'apenas um worker de build na Vercel');
ok(nextSource.includes('withSentryConfig(nextConfig') && nextSource.includes('sourcemaps: {') && nextSource.includes('disable: isCapacitorExport'), 'Sentry/sourcemaps não reduzidos');
function evaluateConfig(env) {
  const module = {exports:{}};
  const captured = {};
  vm.runInNewContext(nextSource, {
    module,
    exports:module.exports,
    process:{env},
    require:(name)=>{
      assert.equal(name,'@sentry/nextjs');
      return {withSentryConfig:(config,opts)=>{captured.options=opts;return config;}};
    },
  }, {timeout:2000});
  checks++;
  return {config:module.exports,options:captured.options};
}
const pwa=evaluateConfig({VERCEL:'1'});
equal(pwa.config.experimental.cpus,1,'PWA na Vercel limita paralelismo');
ok(!pwa.config.output, 'PWA não é export estático');
equal(pwa.options.sourcemaps.disable,false,'Sentry PWA preserva sourcemaps');
const android=evaluateConfig({VERCEL:'1',CAPACITOR_BUILD:'1'});
ok(!android.config.experimental, 'Android não recebe ajuste de concorrência PWA');
equal(android.config.output,'export','Android preserva export estático');
equal(android.options.sourcemaps.disable,true,'Android mantém política Sentry existente');
const local=evaluateConfig({});
ok(!local.config.experimental && !local.config.output, 'modo local não é alterado');
console.log(`GUARDIAN4_G4_01_G4_03_OK | ${checks} verificacoes hermeticas | V63=558 | SQL=0 | Vercel READY depende de deploy`);
