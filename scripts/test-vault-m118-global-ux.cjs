'use strict';
/** M118 hermetic behavioral + source contracts; does not open real clinical data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const checks=[];
const ok=(title,condition)=>{assert.ok(condition,title);checks.push(title)};

const nav=read('lib/navigation/bottom-nav-compose.ts');
const bar=read('components/BottomNav.tsx');
const listRoutes=['/saude/registros','/saude/tratamentos','/saude/retiradas','/saude/renovacao','/saude/fornecimento'];
for(const route of listRoutes)ok(`FAB canônico preservado para ${route}`,nav.includes(`normalizedPathname === "${route}"`));
ok('BottomNav continua contextual, com alvo acessível',bar.includes('getComposeOptions(')&&bar.includes('composeOptions.length'));

for(const [file,label] of [
  ['app/saude/registros/page.tsx','Novo registro'],
  ['app/saude/tratamentos/page.tsx','Novo'],
  ['app/saude/retiradas/page.tsx','Agendar nova retirada'],
  ['app/saude/renovacao/page.tsx','Registrar aquisição de medicamento'],
]) {
 const s=read(file);
 ok(`sem CTA de criação genérico no cabeçalho: ${file}`,!s.includes('rightAction={<button')&&!s.includes('          rightAction={'));
}
const records=read('app/saude/registros/page.tsx');
ok('atalhos específicos continuam',records.includes('"Humor", "humor"')&&records.includes('"Sintoma", "sintoma"'));
ok('mês pt-BR preserva de minúsculo',records.includes('month.label.charAt(0).toLocaleUpperCase("pt-BR")')&&!records.includes('bg-surface text-sm font-semibold capitalize'));

const supply=read('app/saude/fornecimento/page.tsx');
ok('fornecimento mantém entidade canônica, sem botão genérico duplicado',!supply.includes('>Novo fornecimento</button>')&&supply.includes('setCreating(true)'));
const health=read('app/saude/minha-saude/page.tsx');
ok('cinco áreas de Minha Saúde visíveis',health.includes('priorityCount={5}')&&!health.includes('Mais áreas · 1'));
ok('três painéis clínicos continuam acessíveis', ['minha-saude-panorama','minha-saude-mapa-cuidado','minha-saude-relacoes'].every(x=>health.includes(x)));
ok('Avatar preservado',health.includes('id="meu-avatar"')&&health.includes('<HealthBody'));

const home=read('app/page.tsx');const homeCenter=read('components/home/HomeCommandCenter.tsx');
const toggle=read('components/home/HomeEssentialToggleM118.tsx');
ok('Modo Essencial visível na primeira dobra, reutilizando a autoridade existente',home.indexOf('<HomeEssentialToggleM118 />')<home.indexOf('id="home-agora"')&&toggle.includes('vault:home:essential:v1'));
ok('um único controle de Modo Essencial',!homeCenter.includes('onClick={toggleEssential}')&&homeCenter.includes('vault:home:essential-changed'));

const plan=read('app/saude/plano-seguranca/page.tsx');
ok('progresso do plano inclui contatos',plan.includes('const totalParts = sections.length + 1')&&plan.includes('aria-valuemax={totalParts}')&&plan.includes('completed / totalParts'));

const insight=read('components/health-intelligence/HealthInsightExplanationSheet.tsx');
const risk=read('lib/health-intelligence/medication-longitudinal-risk.ts');
const hist=read('app/saude/medicamentos/historico/page.tsx');
ok('Brain aponta corretamente histórico para verificação',insight.includes('Revisar registros de doses')&&insight.includes('somente você pode confirmar uma correção'));
ok('link de padrão longitudinal revisa 28 dias',risk.includes('historico?id=${m.id}&review=28'));
ok('histórico lê apenas tomadas registradas e respeita pessoa ativa',hist.includes('row.person_id === activePersonId')&&hist.includes('!log.tomado_em')&&hist.includes('reviewDays'));
ok('seleção de dia sem alteração de dose no painel de revisão',hist.includes('setMonthKey(day.date.slice(0,7));setSelectedDate(day.date)'));

const diary=read('app/saude/diario/page.tsx');
ok('diário opt-in e privada sem novo banco',diary.includes('privateActivityReviewsM118(entries)')&&diary.includes('const text=["O que me ajudou')&&diary.includes('Confirme o salvamento'));
const moduleSource=read('lib/private-activity-review-m118.ts');
const js=ts.transpileModule(moduleSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal((js.diagnostics||[]).length,0,'TypeScript helper');
const mod={exports:{}}; new Function('module','exports',js.outputText)(mod,mod.exports);
const parse=mod.exports.privateActivityReviewsM118;
const example={id:'test001',text:'O que me ajudou (se eu quiser contar):\nSituação ou atividade: conversa\nComo me senti antes: cansado\nComo me senti depois: mais calmo\nO que percebi: consegui descansar'};
assert.deepEqual(parse([example]),[{id:'test001',activity:'conversa',before:'cansado',after:'mais calmo'}]);
ok('diário não interpreta texto sem seleção explícita',parse([{id:'t',text:'conversa\nComo me senti antes: triste\nComo me senti depois: melhor'}]).length===0);
ok('diário não inventa comparação quando falta depois',parse([{id:'t',text:'O que me ajudou (se eu quiser contar):\nSituação ou atividade: caminhei\nComo me senti antes: tenso'}]).length===0);

const gate=read('scripts/test-v63-release-gate.mjs');
ok('contratos M118 entram no gate de release',gate.includes('scripts/test-vault-m117-update-ux.cjs')&&gate.includes('scripts/test-vault-m118-global-ux.cjs'));
console.log(`M118: ${checks.length} verificações PASS. Zero gravações clínicas, zero rede, zero notificações.`);
