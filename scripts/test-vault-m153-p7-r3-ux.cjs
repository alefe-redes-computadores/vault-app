#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
 'app/page.tsx','app/saude/medicamentos/page.tsx','app/ajuda/page.tsx',
 'components/home/HomeDailyHero.tsx','components/home/HomeActionNowCardP7R3.tsx',
 'components/saude/MedicationContextSheetP7R3.tsx','components/saude/MedicationFilterBar.tsx',
 'components/saude/MedicationProvenanceLineM150P3.tsx','components/BottomNav.tsx',
 'lib/home/routine-narrative-p7r3.ts',
];
let n=0;
const ok=(x,m)=>{assert.ok(x,'P7 R3: '+m);n++;console.log('✓ P7 R3 '+m);};
for(const p of paths){const t=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(!t.parseDiagnostics.length,'parse '+p);}
const home=read(paths[0]),med=read(paths[1]),help=read(paths[2]),hero=read(paths[3]),action=read(paths[4]),sheet=read(paths[5]);
ok(home.includes('HomeActionNowCardP7R3') && home.includes('routineContextP7R3') && home.includes('resumoContextual.description'),'separacao contexto imediato e rotina');
ok(home.includes('retiradasAgendaM147.slice(0, 3)') && home.includes('MedicationFormatIcon formato={medicamentoLigado.formato}') && home.includes('event?.medicamento_id'), 'retiradas e alertas usam id e avatar');
ok(home.includes('user?.id,activePersonId') && home.includes('med.user_id!==user?.id'), 'alerta nao cruza titularidade');
ok(hero.includes('{title}')&&hero.includes('{description}')&&hero.includes('role="progressbar"')&&!hero.includes('contextLabel &&'),'rotina contextual sem pill proxima');
ok(action.includes('onClick={onAction}')&&!action.includes('Conferir próximo passo'),'acao imediata nao e generica');
ok(med.includes('data-vault-r3-flat-filters') || read('components/saude/MedicationFilterBar.tsx').includes('data-vault-r3-flat-filters'),'filtro plano');
ok(!med.includes('className="max-h-[calc(100dvh-max(2rem,env(safe-area-inset-top))') && !med.includes('safe-area-inset-top'),'V31: pagina sem area superior propria');
ok(read('app/globals.css').includes('.vault-r3-dialog-top-inset')&&read('app/globals.css').includes('safe-area-inset-top'),'safe area modal preservada no CSS');
ok(med.includes('railSize="label"')&&med.includes('Abrir classificação:')&&med.includes('setSelectedRegulatory(regulatoryProfile)')&&med.includes('[writing-mode:vertical-rl]'),'tarja textual acessível sem ícone redundante');
ok(med.includes('onContext={openMedicationContextP7R3}')&&med.includes('data-vault-med360-treatment-tags')&&!med.includes('openMedicationContextP7R3("treatment")')&&!med.includes('openMedicationContextP7R3("regime")'),'badges com contexto vivo');
ok(sheet.includes('role="dialog"')&&sheet.includes('onClose')&&sheet.includes('document.addEventListener("keydown"'),'sheet acessivel e somente leitura');
ok(med.indexOf('id="medicamentos-panorama"')>med.indexOf('<BottomSheet isOpen={visualFilterSheetOpenR1}') && med.indexOf('id="medicamentos-panorama"')<med.indexOf('</BottomSheet>'),'panorama realocado para filtros, acessível sem rodapé');
ok(help.includes('returnTo')&&help.includes('router.push(returnTo)')&&read('components/BottomNav.tsx').includes('"/ajuda"'),'Ajuda preserva retorno e barra');
ok(med.includes('data-vault-executive-density={compactCards?"compact":"comfort"}')&&med.includes('min-h-[116px]')&&med.includes('grid-cols-[minmax(0,1fr)_88px]')&&med.includes('data-vault-r4-main-action')&&!med.includes('!actionLayoutM150P3.primary && <ChevronRight'),'CTA lateral fixa de R4 sem perder minima nem detalhe');
ok(med.includes('tone="amber"')&&med.includes('border-sky-400/35')&&med.includes('border-amber-400/35'),'acoes semanticamente diferentes');
ok(!read('components/saude/MedicationRestockAction.tsx').includes('createMedication('),'nada de estoque ficticio na UI');
ok(med.includes('cardTreatments.slice(0,compactCards ? 2 : 3)') && med.includes('getVaultTreatmentIcon(t.nome)') && !med.includes('cardTreatments.map(t=>`${t.nome} (${t.status})`'), 'etiquetas individuais usam vínculos reais sem status inferido');
const recovery=read('scripts/test-vault-m153-p6-visual-recovery.cjs');
ok(recovery.includes('openMedicationContextP7R3')&&recovery.includes('routineContextP7R3')&&recovery.includes('medicamentoLigado'), 'regressao P6 preserva semantica da nova UI');
const mod=new Module(paths[9],module);
mod._compile(ts.transpileModule(read(paths[9]),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,paths[9]);
const narrative=mod.exports.routineNarrativeP7R3;
ok(narrative({scheduled:0,completed:0,overdue:0,localHour:8}).tone==='neutral','0/0 nao vira concluido');
ok(narrative({scheduled:5,completed:4,overdue:0,localHour:15}).title.includes('andamento'),'4/5 contextual');
ok(narrative({scheduled:5,completed:5,overdue:0,localHour:23}).tone==='positive','conclusao factual');
ok(narrative({scheduled:5,completed:2,overdue:1,localHour:21}).tone==='attention','atraso comprovado distinto');
ok(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-m153-p7-r3-ux.cjs'),'regressao incluida no V63');
console.log('P7 R3:',n,'contratos UI/seguranca aprovados');
