#!/usr/bin/env node
"use strict";
// M148 P2: real code and pure view-model contracts; no private data reads.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const files=[
  'app/saude/medicamentos/detalhes/page.tsx',
  'components/saude/MedicationDetailCareHubM148.tsx',
  'lib/health-intelligence/medication-detail-hub-m148.ts',
  'scripts/test-v63-release-gate.mjs',
];
let n=0;
function ok(value,msg){assert.ok(value,'M148 P2: '+msg);n++}
for(const p of files.slice(0,3)){
  const source=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(source.parseDiagnostics.map(d=>d.messageText),[],p+' invalid TS/TSX');n++;
}
const detail=read(files[0]);const hub=read(files[1]);const model=read(files[2]);const gate=read(files[3]);
ok(detail.includes('VAULT_M148_P2_RELATIONAL_HUB')&&detail.includes('<MedicationDetailCareHubM148'),'one contextual hub');
ok((detail.match(/<MedicationDetailCareHubM148/g)||[]).length===1,'no duplicate hub');
ok(detail.indexOf('VAULT_V320_QUICK_DOSE_TOP')<detail.indexOf('VAULT_M148_P2_RELATIONAL_HUB')&&detail.indexOf('VAULT_M148_P2_RELATIONAL_HUB')<detail.indexOf('VAULT_V320_FINANCE_PROGRESSIVE'),'real action first, progressive history after');
ok(detail.includes('<MedicationDetailNavigation hasRoutine={hasRoutineSection}')&&detail.includes('Explorar todas as áreas do medicamento'),'legacy navigation retained under expandable grouping');
for(const anchor of ['medicamento-agora','medicamento-rotina','medicamento-receita','medicamento-fornecimento','historico-aquisicoes','pharmalens-v7'])ok(detail.includes(anchor),'existing anchor '+anchor);
ok(hub.includes('id: "medicamento-fornecimento"')&&hub.includes('id: "medicamento-receita"')&&hub.includes('hasRoutine ? "medicamento-rotina" : "medicamento-agora"'),'three destinations real, no dead anchor');
ok(detail.includes('window.dispatchEvent(new Event("hashchange"))')&&detail.includes('window.location.hash = sectionId'),'ClinicalDisclosure deep link reveals on first and repeated clicks');
ok(detail.includes('onOpenOccurrences={() => router.push(`/saude/central-m144?return_to=${encodeURIComponent('),'occurrence return_to preserved');
ok((detail.match(/VAULT_M144_DETAIL_ENTRY/g)||[]).length===1,'one M144 entry, contextual');
ok(!detail.includes('mx-4 mt-4 rounded-2xl border border-emerald-300/15 bg-surface/70 p-3'),'old orphan footer removed');
ok(detail.includes('med.status !== "descontinuado" || isSOS')&&detail.includes('med.status === "descontinuado" && isSOS')&&detail.includes('Registrar uso já ocorrido')&&detail.includes('bg-surface/70 text-ink-secondary'),'V94.1 allows factual SOS recording while M147 visually demotes the action');
ok((detail.match(/abrirQuickDose\s*\n\s*\}/g)||[]).length===1,'one canonical QuickDose handler for all SOS records');
ok(detail.includes('isSOS ? "Registrar uso SOS" : isTemporary ? "Registrar dose do período" : "Registrar dose"'),'active dose labels preserved');
ok(detail.includes('!isPrescriptionOnly(event) && !isFutureAcquisition(event, diaFinanceiro)'),'future acquisitions and prescriptions not manufacturer evidence');
ok(detail.includes('event.user_id === med.user_id')&&detail.includes('event.person_id === med.person_id'),'person/owner authority preserved');
ok(detail.includes('readManufacturerMetadata(latestConfirmedAcquisitionM148.observacoes).manufacturer'),'manufacturer from last confirmed acquisition only');
ok(hub.includes('Etiqueta declarada no cadastro')&&hub.includes('Fabricante da última aquisição realizada')&&hub.includes('não comprova qual embalagem está em uso'),'manufacturer declarations not conflated');
ok(hub.includes('ManufacturerBadge manufacturer={view.manufacturer.label}')&&hub.includes('ManufacturerBadge manufacturer={view.manufacturer.latestAcquisition}'),'canonical badge reused');
ok(hub.includes('Ocorrências, ciclos e vacinas')&&hub.includes('onOpenOccurrences'),'contextual occurrence action retained');
ok(model.includes('input.hasKnownStock ? "Saldo cadastrado; conferir posição atual" : "Saldo não informado"'),'no inferred stock');
ok(model.includes('!isFutureAcquisition')===false&&model.includes('Aquisição')===false,'pure read-only presenter does not select or write clinical events');
const forbidden=[
  'db.', 'supabase.', 'updateMedicamento(', 'createRegistro(', 'remove(',
  'doseLogs.push', 'estoque_quantidade =', 'Math.max(0,s.plannedAcquisitions',
];
for(const part of forbidden)ok(!hub.includes(part)&&!model.includes(part),'no clinical mutation '+part);
const mocks={'@/lib/health-intelligence/medication-workspace':{}};
const code=ts.transpileModule(model,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m=new Module(files[2],module);m.require=x=>{if(x in mocks)return mocks[x];throw Error('unexpected import: '+x)};m._compile(code,files[2]);
const build=m.exports.buildMedicationDetailHubM148;
const snapshot={prescriptions:1,completedAcquisitions:2,plannedAcquisitions:1,pendingWithdrawals:1,overdueWithdrawals:0,latestPrescriptionDate:'2026-11-01',latestAcquisitionDate:'2026-11-09',nextPlannedAcquisitionDate:'2026-12-10',nextWithdrawalDate:'2026-11-17'};
const s=build({snapshot,suspended:false,sos:false,temporary:false,treatmentCount:1,hasKnownStock:false,labelManufacturer:' EMS ',latestAcquisitionManufacturer:'Medley'});
ok(s.treatment.summary==='Uso contínuo'&&s.treatment.detail==='1 tratamento vinculado','treatment and regimen separate');
ok(s.supply.summary==='1 retirada agendada em aberto'&&s.supply.detail.includes('1 aquisição planejada · não realizada')&&s.supply.detail.includes('Saldo não informado'),'planned not credited to stock');
ok(s.documents.summary==='1 receita registrada'&&s.documents.detail==='2 aquisições realizadas','recipes and purchases counted separately');
ok(s.manufacturer.label==='EMS'&&s.manufacturer.latestAcquisition==='Medley'&&s.manufacturer.latestAcquisitionDate==='2026-11-09','manufacturer events remain separate');
const unknown=build({snapshot:{...snapshot,completedAcquisitions:1,latestAcquisitionDate:'2026-11-09',overdueWithdrawals:1},suspended:true,sos:true,temporary:false,treatmentCount:0,hasKnownStock:false,labelManufacturer:'EMS',latestAcquisitionManufacturer:null});
ok(unknown.treatment.summary==='Tratamento suspenso'&&!unknown.treatment.summary.includes('usar'),'suspended SOS is not a suggested dose');
ok(unknown.supply.summary==='1 retirada com data vencida'&&unknown.supply.pendingWithdrawals===1,'overdue scheduling remains unconfirmed');
ok(unknown.manufacturer.latestAcquisition===null&&unknown.manufacturer.label==='EMS','label never backfills unknown acquisition manufacturer');
const empty=build({snapshot:{...snapshot,plannedAcquisitions:0,pendingWithdrawals:0,overdueWithdrawals:0,prescriptions:0,completedAcquisitions:0,latestAcquisitionDate:null},suspended:false,sos:false,temporary:true,treatmentCount:0,hasKnownStock:true});
ok(empty.treatment.summary==='Uso por período'&&empty.supply.detail.includes('Saldo cadastrado; conferir posição atual')&&empty.manufacturer.hasCompletedAcquisition===false,'no fake purchases from stock');
const other=read('components/saude/ClinicalDisclosure.tsx');
ok(other.includes('window.addEventListener("hashchange", revealHash)')&&other.includes('vault:reveal-clinical-section'),'deep-link disclosure is functional');
const m148p1=read('scripts/test-vault-m148-p1.cjs');
ok(m148p1.includes('min-h-10')&&m148p1.includes('min-h-[64px]'),'P1 regression remains enforced');
const start=gate.indexOf('const contracts = [');ok(start>=0,'release gate stable');
for(const x of ['scripts/test-vault-m92-medication-premium-2.cjs','scripts/test-vault-m94-notifications-update.cjs','scripts/test-vault-m147-p0.cjs','scripts/test-vault-m147-p1.cjs','scripts/test-vault-m148-p1.cjs'])ok(gate.includes(x),'preserved suite '+x);
ok(gate.split('"scripts/test-vault-m148-p2.cjs"').length===2,'P2 once in gate');
console.log(`VAULT M148 P2: ${n} contratos de relações, segurança e apresentação OK`);
