#!/usr/bin/env node
"use strict";
/** UI360 R4: fidelity and non-regression contracts, no clinical writes. */
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let n=0;
const ok=(condition,label)=>{assert.ok(condition,'UI360 R4: '+label);console.log(`✓ R4 ${++n}: ${label}`)};
const paths=[
 'app/page.tsx', 'components/home/HomeActionNowCardP7R3.tsx',
 'components/home/HomeDailyHero.tsx','components/home/HomeQuickMetrics.tsx',
 'app/saude/medicamentos/page.tsx','components/saude/MedicationSheet360R3.tsx',
 'scripts/test-vault-ui360-r2-visual.cjs','scripts/test-vault-ui360-r3.cjs',
];
for(const p of paths){let s=read(p);let ast=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.JS);ok(ast.parseDiagnostics.length===0,`TS/TSX/JS ${p}`)}
const home=read(paths[0]),action=read(paths[1]),hero=read(paths[2]),metrics=read(paths[3]),med=read(paths[4]),sheet=read(paths[5]);
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const first=between(home,'{/* UI360 R4: evento, rotina e quatro contadores dividem uma superfície. */}', '{/* M150 P5 P5:');
ok((first.match(/<HomeActionNowCardP7R3/g)||[]).length===1 && (first.match(/<HomeDailyHero/g)||[]).length===1 && (first.match(/<HomeQuickMetrics/g)||[]).length===1,'Home container único: evento + rotina + indicadores');
ok(first.indexOf('<HomeActionNowCardP7R3')<first.indexOf('<HomeDailyHero') && first.indexOf('<HomeDailyHero')<first.indexOf('indicators={<HomeQuickMetrics'),'hierarquia visual dentro do mesmo cartão');
ok(!home.includes('actionLabel={resumoContextual') && !action.includes('Por que aparece?') && !action.includes('<details'),'sem botão avulso e acordeão anterior');
ok(action.includes('onClick={onAction}') && action.includes('data-vault-ui360-r4-context-kind') && action.includes('aria-label={`${eyebrow}.'),'bloco inteiro acessível e clicável');
for(const k of ['consulta','exame','careflow','dose','receita','retirada','estoque','agenda','rotina'])ok(action.includes(`kind === "${k}"`) || action.includes(`"${k}" |`),`evento ${k} possui identidade visual`);
ok(action.includes('Stethoscope')&&action.includes('FlaskConical')&&action.includes('FileWarning')&&action.includes('Activity')&&action.includes('Package'),'Lucide contextual em vez do Zap genérico');
ok(home.includes('const homeContextKind360')&&home.includes('dosesPendentesAtrasadas.length > 0')&&home.includes('resumoContextual.href')&&home.includes('consultasHoje.length'),'classificação deriva dos registros e destinos canônicos');
ok(hero.includes('aria-label="Progresso da rotina programada"')&&hero.includes('aria-valuenow={safeProgress}')&&hero.includes('Math.min(100'),'progresso mantém limites e sem falsa conclusão');
ok(hero.includes('· contínuos')&&hero.includes('homeRoutineSummaryNote')&&hero.includes('SOS fora da meta'),'escopo clínico sem inventar doses');
ok(!hero.includes('Sua rotina está em andamento')&&!hero.includes('<CalendarDays')&&!hero.includes('mt-1 block font-display text-xl'),'sem título/explicação/ícone inflado');
ok(metrics.includes('label: "Agenda"')&&metrics.includes('label: "Atrasadas"')&&metrics.includes('"Concluídas"')&&metrics.includes('label: "SOS / extra"')&&metrics.includes('grid grid-cols-4'),'quatro indicadores abertos em grade');
ok(home.includes('<CareFlowSummaryM2 />')&&home.includes('contextualWithdrawalHrefM2')&&home.includes('retiradasAgendaM147.slice(0, 3)'),'CareFlow M2 e retirada reconciliada preservados');
ok(med.includes('data-vault-med360-header')&&med.includes('data-vault-med360-entry="name"')&&med.includes('data-vault-med360-entry="menu"'),'nome e menu abrem gaveta única');
ok(med.includes('railSize="label"')&&med.includes('medicationRegulatoryShortLabel')&&!med.includes('<Info size={13} className="shrink-0 text-void"/>'),'tarja regulatória vertical limpa');
ok(!med.includes('data-vault-ui360-r2-med-evidence')&&sheet.includes('value.catalogManufacturer')&&med.includes('<MedicationProvenanceLineM150P3'),'Conforto sem botão fabricante redundante; proveniência preservada');
ok(med.includes('data-vault-compact-medication-meta className="sr-only"')&&!med.includes('cardTreatments.length > 2 && compactCards'),'Compacto sem botão duplicado ou acessibilidade invisivelmente clicável');
ok(med.includes('data-vault-med360-treatment-tags')&&med.includes('cardTreatments.slice(0,compactCards ? 2 : 3)')&&med.includes('safeTreatmentColorP7(t.cor)'),'tratamentos 2/3 e cores reais');
ok(med.includes('data-vault-med360-microbanner')&&med.includes('openMedicationSheet360(stockReview ? "estoque" : prescriptionReview360 ? "receita" : "estoque")'),'microaviso abre contexto correto');
ok(med.includes('navigationP6.kind === "completed" ? null')&&med.includes('withdrawalConflictForMedicationM2'),'retirada concluída ou conflituosa não vira ação fictícia');
ok(med.includes('actionLayoutM150P3.primary')&&med.includes('setQuickDoseMedId(med.id!)')&&med.includes('MedicationRestockAction'),'CTAs clínicos originais preservados');
ok((med.match(/id="medicamentos-panorama"/g)||[]).length===1&&med.indexOf('id="medicamentos-panorama"')<med.indexOf('</BottomSheet>'),'panorama e ferramentas movidos para a gaveta de filtros');
ok(med.includes('MedicationListGroupNavigation')&&med.includes('Ocorrências, ciclos e vacinas')&&med.includes('Ajuda sobre medicamentos'),'ferramentas de apoio mantidas acessíveis');
for(const tab of ['ficha','rotina','estoque','receita','acoes'])ok(sheet.includes(`tab==="${tab}"`),`aba 360 ${tab}`);
ok(sheet.includes('label="Fabricante"')&&sheet.includes('label="Via de uso"')&&sheet.includes('label="Apresentação"')&&sheet.includes('label="Origem"'),'Ficha 2x2 fiel ao desenho');
ok(sheet.includes('Fabricante no catálogo')&&sheet.includes('value.officialPresentations')&&sheet.includes('value.regulatory.source')&&sheet.includes('value.regulatory.verified'),'dados do catálogo e origem distintos');
ok(sheet.includes('Manter meu cadastro')&&sheet.includes('Aplicar no editor')&&sheet.includes('não altera nenhum campo'),'revisão humana explícita; nenhuma escrita automática');
ok(sheet.includes('safe-area-inset-bottom')&&sheet.includes('max-h-[min(89dvh,790px)]')&&sheet.includes('Escape')&&sheet.includes('original?.focus()'),'Android Safe Area, viewport e retorno de foco');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-ui360-r4-final.cjs'),'R4 é parte do gate real');
console.log(`VAULT_UI360_R4_VISUAL_CONTRACT_OK: ${n} garantias`);
