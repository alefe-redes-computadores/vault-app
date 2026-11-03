/** M45: contextual presentation, safe dismissals, no new clinical authority. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let checks = 0;
function ok(label, fn) { fn(); checks++; console.log(`M45 OK ${checks}: ${label}`); }
const model = read('lib/health-intelligence/contextual-presentation.ts');
const contextual = read('components/vault-intelligence/ContextualHealthIntelligence.tsx');
const command = read('components/saude/CareCommandStrip.tsx');
const next = read('components/health-intelligence/BrainNextStep.tsx');
const evidence = read('components/health-intelligence/VaultBrainEvidence.tsx');
const plan = read('components/health-intelligence/BrainCarePlan.tsx');
const today = read('components/hoje/TodayActionCenter.tsx');
const css = read('app/globals.css');
const files = [
  'lib/health-intelligence/contextual-presentation.ts',
  'components/vault-intelligence/ContextualHealthIntelligence.tsx',
  'components/saude/CareCommandStrip.tsx',
  'components/health-intelligence/BrainNextStep.tsx',
  'components/health-intelligence/VaultBrainEvidence.tsx',
  'components/health-intelligence/BrainCarePlan.tsx',
  'components/hoje/TodayActionCenter.tsx',
];
const ts = require('typescript');
ok('Sintaxe TS/TSX real em todos os arquivos', () => {
  for (const file of files) {
    const parser = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.deepEqual(parser.parseDiagnostics.map(d => `${file}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`), []);
  }
});
ok('Não cria assistente, provider nem motor novo', () => {
  assert.doesNotMatch(model + contextual + command + evidence, /(?:db\.[A-Za-z_]+\.(?:put|add|delete)|doseLogsRepository\.|supabase\.from|updateMedicamento\()/);
  assert.match(contextual, /useHealthIntelligence/);
  assert.match(command, /CareCommandSnapshot/);
});
ok('Conta e pessoa são necessárias à memória contextual', () => assert.match(contextual, /careCommand\?\.plan\.ownerKey/));
ok('Dispensa nunca esconde alerta protegido', () => assert.match(model, /isProtectedContextualInsight/));
ok('Mudança de evidência torna uma observação novamente visível', () => assert.match(model, /insight\.evidencias/));
ok('Memória curta em sessionStorage e sem texto clínico', () => {
  assert.match(model, /window\.sessionStorage/);
  assert.doesNotMatch(model, /localStorage/);
  assert.match(model, /const TTL = 24/);
});
ok('Rotação não diminui prioridade de alerta crítico', () => assert.match(model, /healthSeverityRank/));
ok('Restauração e dispensa acessíveis e presentes na entidade', () => {
  assert.match(contextual, /Dispensar esta observação/);
  assert.match(contextual, /Restaurar observações dispensadas/);
  assert.match(contextual, /snap-mandatory/);
  assert.match(contextual, /activeIndex/);
});
ok('Troca de entidade/conta fecha detalhe anterior', () => assert.match(contextual, /setSelected\(null\)/));
ok('Central recebe link direto para insight real', () => assert.match(contextual, /\?healthInsight=/));
ok('Evidência é compartilhada entre as ações operacionais', () => {
  assert.match(command, /VaultBrainEvidence/);
  assert.match(next, /VaultBrainEvidence/);
  assert.match(evidence, /item\.evidence\.slice/);
});
ok('Incerteza de projeção e ausência de registro explícitas', () => {
  assert.match(evidence, /previsão não representa/);
  assert.match(evidence, /Ausência de registro não comprova/);
  assert.match(evidence, /Confiança/);
});
ok('Plano recolhe os quatro indicadores antes da prioridade', () => {
  assert.match(plan, /Ver distribuição das etapas/);
  assert.match(plan, /plan\.counts\[lane\]/);
});
ok('Hoje preserva fallback quando decisão não acionável', () => {
  assert.match(today, /!actionable && brainFallback/);
  assert.match(today, /CareCommandStrip/);
});
ok('Animação discreta e acessível', () => {
  assert.match(css, /vault-brain-enter/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css.split('M45 · VAULT Brain')[1], /infinite/);
});

function evaluate(file, mocks) {
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (name in mocks) return mocks[name];
    throw Error('Import não mapeado: ' + name);
  }, module, module.exports);
  return module.exports;
}
const priority = {
  healthSeverityRank: (i) => i.gravidadeSeguranca === 'critica' ? 4 : i.gravidadeSeguranca === 'importante' ? 3 : i.urgencia === 'alta' ? 2 : 1,
};
priority.compareHealthPriority = (a,b) => priority.healthSeverityRank(b) - priority.healthSeverityRank(a) || a.id.localeCompare(b.id);
const m = evaluate('lib/health-intelligence/contextual-presentation.ts', { './priority': priority });
const at = Date.UTC(2026,10,3);
const base = { id:'s', kind:'observation', categoria:'medicamento', urgencia:'media', confianca:'media', amostra:8, titulo:'Teste', mensagem:'Teste', evidencias:['Dado A'] };
const high = { ...base, id:'critical', kind:'alert', urgencia:'alta', gravidadeSeguranca:'critica' };
const important = { ...base, id:'important', gravidadeSeguranca:'importante' };
ok('Runtime: owner ou entidade ausentes não criam chave', () => {
  assert.equal(m.contextualMemoryKey('', 'medicamento','id'), null);
  assert.equal(m.contextualMemoryKey('owner','medicamento', null), null);
  assert.notEqual(m.contextualMemoryKey('user:a','medicamento','id'), m.contextualMemoryKey('user:b','medicamento','id'));
  assert.notEqual(m.contextualMemoryKey('user:a','medicamento','id'), m.contextualMemoryKey('user:a','retirada','id'));
});
ok('Runtime: chave e JSON não armazenam nomes da pessoa', () => {
  const key = m.contextualMemoryKey('pessoa@nome','medicamento','id sensível');
  assert.ok(!key.includes('pessoa') && !key.includes('id sensível'));
});
ok('Runtime: mesmo fato dispensa, evidência mudada volta', () => {
  const state = m.dismissContextualInsight(m.emptyContextualMemory(at), base);
  assert.equal(m.visibleContextualInsights([base], state).length,0);
  assert.equal(m.visibleContextualInsights([{...base,evidencias:['Dado B']}], state).length,1);
});
ok('Runtime: urgência importante e crítica nunca são ocultadas', () => {
  const state = m.emptyContextualMemory(at);
  assert.deepEqual(m.dismissContextualInsight(state,high),state);
  assert.deepEqual(m.dismissContextualInsight(state,important),state);
  assert.equal(m.visibleContextualInsights([high,important],{...state, hidden: [m.contextualFingerprint(high),m.contextualFingerprint(important)]}).length,2);
});
ok('Runtime: crítico não perde posição após várias visitas', () => {
  const items = m.visibleContextualInsights([base,high],m.emptyContextualMemory(at));
  assert.equal(items[0].id,'critical');
  for(const visits of [0,1,2,3,50]) assert.equal(m.contextualStartIndex(items,visits),0);
});
ok('Runtime: rotação acontece só entre equivalentes', () => {
  const a={...base,id:'a'}, b={...base,id:'b'};
  const items=m.visibleContextualInsights([b,a],m.emptyContextualMemory(at));
  assert.equal(m.contextualStartIndex(items,0),0);
  assert.equal(m.contextualStartIndex(items,1),1);
  assert.equal(m.contextualStartIndex(items,2),0);
});
ok('Runtime: armazenamento inválido/expirado não bloqueia observações', () => {
  assert.equal(m.parseContextualMemory('invalid',at).hidden.length,0);
  assert.equal(m.parseContextualMemory(JSON.stringify({...m.emptyContextualMemory(at),until:at-1,hidden:['x']}),at).hidden.length,0);
  assert.equal(m.parseContextualMemory('{"version":1,"hidden":["unsafe"],"visits":-4,"until":10}',at).hidden.length,0);
});
ok('Runtime: TTL, limite de histórico e restauração', () => {
  const state = m.emptyContextualMemory(at);
  assert.equal(state.until-at,24*60*60*1000);
  let next = state;
  for(let n=0;n<50;n++) next=m.dismissContextualInsight(next,{...base,id:'f'+n});
  assert.ok(next.hidden.length<=36);
  assert.equal(m.resetContextualDismissals(next).hidden.length,0);
});
console.log(`M45: ${checks} verificações aprovadas.`);
