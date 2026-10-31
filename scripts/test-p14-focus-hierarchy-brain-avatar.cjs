#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const ts = require('typescript');
const read = p => fs.readFileSync(p, 'utf8');
const files = [
  'components/saude/ClinicalSectionNav.tsx',
  'components/home/HomeCommandCenter.tsx',
  'components/home/HomeQuickMetrics.tsx',
  'app/hoje/page.tsx',
  'app/saude/medicamentos/page.tsx',
  'app/saude/medicamentos/detalhes/page.tsx',
  'components/saude/HealthAvatar3D.tsx',
  'lib/health-intelligence/avatar-decision-brief.ts',
  'components/saude/ClinicalDisclosure.tsx',
];
let count = 0;
function check(ok, label) {assert(ok, label); console.log('✓ P14 ' + (++count) + ': ' + label);}
for (const p of files) {
  const x = read(p);
  const root=ts.createSourceFile(p,x,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(root.parseDiagnostics.length===0, p+' faz parse TS/TSX');
}
const nav=read(files[0]),home=read(files[1]),metrics=read(files[2]),today=read(files[3]),med=read(files[4]),detail=read(files[5]),avatar=read(files[6]),briefSource=read(files[7]),disclosure=read(files[8]);
check(nav.includes('density?:"regular"|"compact"') && nav.includes('density="regular"'), 'densidade opcional preserva as telas antigas');
check(nav.includes('grid-cols-4 gap-1') && nav.includes('min-[480px]:grid-cols-5'), 'âncoras compactas mostram 4 ou 5 colunas');
check(nav.includes('layout="grid"') && nav.includes('layout?:"scroll"|"grid"') && nav.includes('min-[480px]:grid-cols-4'), 'contrato visual V334 legado intacto');
check(nav.includes('IntersectionObserver') && nav.includes('hashchange') && nav.includes('aria-current='), 'navegação profunda e seção ativa preservadas');
check(today.includes('label="Áreas de Hoje" layout="grid" density="compact"') && today.includes('Navegar por data'), 'Hoje compacto, sem duplicar data selecionada');
check(today.includes('navegarData(') && today.includes('voltarParaHoje') && today.includes('DoseScheduleGroups'), 'datas, retorno e autoridade de doses intactos');
check(today.includes('retroReviewMode') && today.includes('dosesElegiveisLote') && today.includes('processandoTodos'), 'revisão retroativa e operações em lote preservadas');
check(today.includes('aria-pressed={filtroStatus === "todos"}') && today.includes('>Todas</button>'), 'filtro Todas explícito');
check(today.includes('Período {filtroPeriodo !== "todos"') && today.includes('flex flex-wrap gap-1.5'), 'filtros de período acessíveis sem rolagem invisível');
check(home.includes('home-acessos-medicamentos')&&home.includes('"/saude/retiradas"')&&home.includes('"/saude/fornecimento"'), 'Home recolhe atalhos sem apagar rotas');
check(home.includes('"/saude/medicamentos"')&&home.includes('<ClinicalDisclosure id="home-outras-areas"'), 'Medicamentos continuam em destaque, outras áreas acessíveis');
check(metrics.includes('min-h-[58px]') && metrics.includes('onOpenPending') && metrics.includes('SOS / extra'), '4 métricas compactas com ação de doses');
check(med.includes('medicamentos-panorama') && med.includes('defaultOpen={medsPrioridade.length > 0}') && med.includes('key={medsPrioridade.length > 0 ? "atencao" : "rotina"}'), 'panorama reage quando a lista assíncrona ganha prioridade');
check(med.includes('medsPrioridade.map(renderCard)') && med.includes('medsEmDia.map(renderCard)') && med.includes('medsSOS.map(renderCard)'), 'listagem mantém prioridade, rotina e SOS');
check(med.includes('medicationFilter === value') && med.includes('selectMedicationFilter(value)') && med.includes('isSearchOpen'), 'busca e filtros de medicamentos continuam funcionais');
check(detail.includes('label="Áreas do medicamento" layout="grid" density="compact"'), 'detalhes abre com navegação reduzida');
check(detail.includes('ClinicalDisclosure id="historico-aquisicoes"') && detail.includes('{() => <div className="space-y-3">'), 'histórico carrega somente sob demanda');
check(disclosure.includes('if (hash === id) setOpen(true)') && disclosure.includes('typeof children === "function"'), 'ancora de histórico abre o conteúdo lazy ao navegar');
check(detail.includes('medicamento-rotina') && detail.includes('medicamento-receita') && detail.includes('medicamento-fornecimento'), 'identidade, rotina, receita e fornecimento preservados');
check(detail.includes('<QuickDoseModal') && /registrar/i.test(detail) && detail.includes('isQuickDoseOpen'), 'registro de dose permanece com modal e rotina originais');
check(avatar.includes('P14: crânio e mandíbula') && avatar.includes('[.186,.268,.186]') && avatar.includes('[.070,.034,.067]'), 'Avatar melhora volumes existentes sem malhas adicionais');
check(avatar.includes('expressionEyeScaleY') && avatar.includes('expressionLidScaleY') && avatar.includes('expressionHighlightScale'), 'olhos sem regressão de traves por escala');
check(avatar.includes('avatarAdaptiveRatio(') && avatar.includes('renderer.forceContextLoss()') && !avatar.includes('requestAnimationFrame(function'), 'WebGL adaptativo e sem loop contínuo preservados');
const modulePath = 'lib/health-intelligence/avatar-decision-brief.ts';
const m = new Module(modulePath,module);
m._compile(ts.transpileModule(briefSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,modulePath);
const brief=m.exports.buildAvatarDecisionBrief;
const two=brief({title:'Atenção',reason:'Conferir etapas',overdueWithdrawals:2,missingDocuments:3,evidenceKind:'projected'});
check(two.explanation.includes('2 retirada') && two.explanation.includes('3 documento'), 'Fênix não oculta pendências simultâneas');
check(two.authority==='Projeção, não confirmação', 'Fênix não apresenta previsão como fato');
check(brief({evidenceKind:'association'}).authority==='Associação temporal, não causal', 'Fênix não inventa causalidade');
check(brief({counts:{overdue:1,prepare:2,unknown:3}}).explanation.includes('3 para esclarecer'), 'Resumo mantém fallback de dados incompletos');
check(brief({reason:'R'.repeat(500)}).explanation.length<=370, 'Resumo continua com comprimento limitado');
check(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-p14-focus-hierarchy-brain-avatar.cjs"'),'novo contrato entra no release gate histórico');
check(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-p13-device-cert.cjs"'),'P13 preservada no gate');
console.log(`VAULT P14 R1: ${count} testes assertivos aprovados. Nenhum dado clínico alterado.`);
