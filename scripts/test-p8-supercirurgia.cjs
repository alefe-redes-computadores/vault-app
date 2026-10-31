#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const read=file=>fs.readFileSync(file,'utf8');
function loadPure(path){const m=new Module(path,module);m._compile(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);return m.exports;}
const {summarizePendingTimeGroups}=loadPure('lib/health-intelligence/pending-dose-brief.ts');
const dose=(id,time='23:00',date='2026-10-30',extra={})=>({medicamentoId:id,nome:id,data:date,horario:time,diaLabel:'Hoje',stockUnavailable:false,...extra});
const evidence=summarizePendingTimeGroups([dose('sos-a'),dose('sos-b'),dose('sos-a'),dose('sos-c','22:00'),dose('outro','23:00','2026-10-29',{diaLabel:'Ontem'}),dose('broken','25:00')]);
assert.equal(evidence.length,3,'3 horários de dias distintos preservados');
const same=evidence.find(x=>x.day==='2026-10-30'&&x.time==='23:00');
assert.equal(same.medications,2,'dois SOS às 23:00 preservados sem duplicar mesmo medicamento');
assert.deepEqual(same.medicationNames,['sos-a','sos-b']);
assert.equal(summarizePendingTimeGroups([dose('sos-a','23:00','2026-10-30',{stockUnavailable:true}),dose('sos-b')])[0].withoutRecordedStock,1,'estoque incerto descrito sem escrita');
assert.equal(summarizePendingTimeGroups([]).length,0,'nenhuma dose inventada');
const {resolveDoseNotificationDestination:resolve}=loadPure('lib/notification-dose-navigation.ts');
assert.equal(resolve('dose_reminder_group'),'/hoje?focus=doses','contrato P7 padrão preservado');
assert.equal(resolve('dose_planned','23:00'),'/hoje?focus=doses&time=23%3A00','toque abre grupo exato');
assert.equal(resolve('dose_reminder_group','08:30'),'/hoje?focus=doses&time=08%3A30','horários independentes');
assert.equal(resolve('dose_reminder','javascript:alert(1)'),'/hoje?focus=doses','metadado inválido não injeta rota');
assert.equal(resolve('dose_overdue','23:00'),'/?open=pending-doses','dose atrasada mantém revisão modal');
assert.equal(resolve('health_event','23:00'),null,'outros eventos mantêm seus destinos próprios');
const group=read('components/saude/DoseScheduleGroups.tsx');
const today=read('app/hoje/page.tsx');
const home=read('app/page.tsx');
const modal=read('components/PendingDosesModal.tsx');
const provider=read('components/Providers.tsx');
const projection=read('lib/home/pending-dose-projection.ts');
const avatar=read('components/saude/HealthAvatar3D.tsx');
const actionCenter=read('components/hoje/TodayActionCenter.tsx');
assert(group.includes('useEffect')&&group.includes('focusTime')&&group.includes('group.slots[0]?.horario === focusTime'),'Hoje expande apenas grupo com hora correspondente');
assert(today.includes('focusTime={focusDoseTime}')&&today.includes('focusDoseQueue'),'Hoje passa horário seguro');
assert(provider.includes('resolveDoseNotificationDestination(data.type, data.horario)'),'cold-start entrega horário do evento');
// P8-R2: TS2339 regression - both the shape and the runtime normalizer must
// carry the validated time (a typed field alone would compile but drop it).
const providerAst=ts.createSourceFile('components/Providers.tsx',provider,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const notificationData=providerAst.statements.find(node => ts.isInterfaceDeclaration(node) && node.name.text === 'NotificationActionData');
assert(notificationData && notificationData.members.some(member => ts.isPropertySignature(member) && member.name?.getText(providerAst) === 'horario'), 'TS2339: NotificationActionData declares horario');
const normalizer=providerAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'getNotificationActionData');
assert(normalizer && /typeof record\.horario === "string"/.test(normalizer.getText(providerAst)) && /\.test\(record\.horario\)/.test(normalizer.getText(providerAst)), 'Time metadata is validated and retained at runtime');
assert(provider.includes('resolveDoseNotificationDestination(data.type, data.horario)'), 'time metadata reaches routing');

assert(modal.includes('summarizePendingTimeGroups(doses)')&&modal.includes('Medicamentos com o mesmo horário pendente'),'modal apresenta evidência de horários compartilhados');
assert(home.includes('"/hoje?focus=doses"'),'expansão da Home alcança a agenda de doses');
assert(projection.includes('seenExplicitLogIds')&&projection.includes('const seen = new Set')&&projection.includes('log.dose_kind !== "planned"'),'projeção mantém identidade e contrato V347');
assert(avatar.includes('P8: pele e olhos menos plastificados')&&avatar.includes('avatarAdaptiveRatio(')&&avatar.includes('renderer.forceContextLoss()'),'Avatar tem acabamento e mantém o orçamento GPU');
assert(actionCenter.includes('Abrir horários e revisar cada medicamento'),'ação esclarece ausência de baixa automática');
for(const path of ['lib/home/pending-dose-projection.ts','lib/notification-dose-navigation.ts','components/Providers.tsx','app/hoje/page.tsx','components/saude/DoseScheduleGroups.tsx','components/PendingDosesModal.tsx','app/page.tsx','components/hoje/TodayActionCenter.tsx','components/saude/HealthAvatar3D.tsx','lib/health-intelligence/pending-dose-brief.ts']) {
 const src=read(path),parsed=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,`${path}: análise sintática TS/TSX`);
}
console.log('✓ P8: evidência 23h, horário de notificação, duas SOS, segurança de dados, Brain, Hoje e Avatar — OK');
