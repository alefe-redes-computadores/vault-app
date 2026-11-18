/* VAULT M3 P2: contratos e cenários de comportamento — sem ler/escrever dados clínicos reais. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
let checks=0;const check=(truth,label)=>{assert.ok(truth,'M3 P2: '+label);checks++};
const read=x=>fs.readFileSync(path.resolve(x),'utf8');
function load(file,alias={}){
 const source=read(file),res=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const mod={exports:{}},context={module:mod,exports:mod.exports,require:id=>{if(id in alias)return alias[id];throw Error('Import inesperado na lógica pura: '+id);},console,Date,Set,Map,TextEncoder,globalThis:{crypto:require('node:crypto').webcrypto}};
 vm.runInNewContext(res.outputText,context,{filename:file,timeout:2500});return mod.exports;
}
(async()=>{
 const model=load('lib/m3/policy-record-p2.ts');
 const baseline={userId:'U1',personId:'P1',kind:'consulta',id:'e1'};
 check(model.eventScopeP2(baseline),'escopo completo obrigatório');
 check(!model.eventScopeP2({...baseline,personId:''}),'sem pessoa não cria política');
 check(!model.eventScopeP2({...baseline,userId:''}),'sem conta não cria política');
 const a=await model.deterministicPolicyIdP2('U1','P1','consulta','e1');
 const b=await model.deterministicPolicyIdP2('U1','P1','consulta','e1');
 check(a===b&&/^[0-9a-f-]{36}$/.test(a),'ID determinístico entre aparelhos e offline');
 check(a!==await model.deterministicPolicyIdP2('U1','P2','consulta','e1'),'nenhum reuso entre pessoas');
 check(a!==await model.deterministicPolicyIdP2('U2','P1','consulta','e1'),'nenhum reuso entre contas');
 check(a!==await model.deterministicPolicyIdP2('U1','P1','exame','e1'),'kind preserva identidade');
 const good=model.normalizePolicyP2({enabled:true,offsets:[60,1440,60],custom_at:null});
 check(good.offsets.join(',')==='1440,60','sem duplicatas, ordem estável');
 check(model.normalizePolicyP2({enabled:false,offsets:[],custom_at:null}).enabled===false,'desligar é um estado real');
 for(const offsets of [[999],[1440,60,30,15,0],[-1]]){
  let failed=false;try{model.normalizePolicyP2({enabled:true,offsets,custom_at:null});}catch{failed=true;}check(failed,'antecedência fora de contrato é bloqueada');
 }
 check(!model.validLocalDateTimeP2('2026-02-30T09:00'),'data inválida não entra na agenda');
 check(!model.validLocalDateTimeP2('2026-11-17T25:00'),'hora impossível não entra na agenda');
 check(model.validLocalDateTimeP2('2026-11-17T08:00'),'data local válida');
 const quiet=model.validQuietP2({enabled:true,start:'22:00',end:'08:00',kinds:['consulta','checkin']});
 check(model.quietEventP2(new Date(2026,10,20,23), 'consulta',quiet),'silêncio noturno');
 check(model.quietEventP2(new Date(2026,10,21,7), 'checkin',quiet),'silêncio após meia-noite');
 check(!model.quietEventP2(new Date(2026,10,21,9), 'consulta',quiet),'fim do silêncio');
 check(!model.quietEventP2(new Date(2026,10,21,23), 'exame',quiet),'categoria não selecionada não é silenciada');
 const row={id:a,user_id:'U1',person_id:'P1',event_kind:'consulta',event_id:'e1',enabled:true,offsets:[60],custom_at:null,created_at:'2026-11-10T00:00:00Z',updated_at:'2026-11-10T00:00:00Z',synced:true};
 check(Boolean(model.scopePolicyForEventP2([row],'U1','P1','consulta','e1')),'escopo exato');
 check(model.scopePolicyForEventP2([row],'U2','P1','consulta','e1')===null,'bloqueio outra conta');
 check(model.scopePolicyForEventP2([row],'U1','P2','consulta','e1')===null,'bloqueio outra pessoa');
 const plans=model.planInstantsP2({eventAt:new Date(2026,10,23,9),now:new Date(2026,10,20,9),fallbackOffsets:[1440,60],policy:null,quiet:{...quiet,enabled:false},kind:'consulta'});
 check(plans.length===2&&plans[0].offsetMinutes===1440,'agenda conforme antecedência canônica');
 check(model.planInstantsP2({eventAt:new Date(2026,10,23,9),now:new Date(2026,10,20,9),fallbackOffsets:[1440],policy:{enabled:false,offsets:null,custom_at:null},quiet:{...quiet,enabled:false},kind:'consulta'}).length===0,'OFF cancela sem perder evento');
 const custom=model.planInstantsP2({eventAt:new Date(2026,10,23,9),now:new Date(2026,10,20,9),fallbackOffsets:[0],policy:{enabled:true,offsets:[0],custom_at:'2026-11-22T08:00'},quiet:{...quiet,enabled:false},kind:'consulta'});
 check(custom.length===2&&custom.some(p=>p.offsetMinutes===-1),'alarmes personalizados e presets coabitam');
 const second=model.planInstantsP2({eventAt:new Date(2026,10,23,9),now:new Date(2026,10,20,9),fallbackOffsets:[60],policy:{enabled:true,offsets:[60],custom_at:'2026-11-23T08:00'},quiet:{...quiet,enabled:false},kind:'consulta'});
 check(second.length===1,'custom coincide com preset, não duplica');
 const checkins=load('lib/m3/checkins-p2.ts',{'./policy-record-p2':model});
 const optin={...row,event_kind:'checkin',event_id:'q1',consent_at:'2026-11-17T10:00:00Z',checkin_answers:{},enabled:true};
 check(checkins.checkinInvitationsP2({appointmentId:'q1',consultDate:'2026-11-16',status:'agendada',policy:optin,now:new Date('2026-11-17T11:00:00Z')}).length===0,'consulta pendente nunca gera pós-consulta');
 check(checkins.checkinInvitationsP2({appointmentId:'q1',consultDate:'2026-10-01',status:'realizada',policy:optin,now:new Date('2026-11-17T11:00:00Z')}).length===0,'sem disparos históricos retroativos');
 const future=checkins.checkinInvitationsP2({appointmentId:'q1',consultDate:'2026-11-17',status:'realizada',policy:optin,now:new Date('2026-11-17T11:00:00Z')});
 check(future.length===3&&future.map(x=>x.day).join(',')==='1,3,10','D+1 D+3 D+10 finitos');
 check(checkins.checkinInvitationsP2({appointmentId:'q1',consultDate:'2026-11-17',status:'realizada',policy:{...optin,enabled:false},now:new Date('2026-11-17T11:00:00Z')}).length===0,'consentimento desativado cancela');
 const answered={...optin,checkin_answers:{1:{answer:'reconheci',at:'2026-11-18T10:00:00Z'}}};
 check(checkins.checkinInvitationsP2({appointmentId:'q1',consultDate:'2026-11-17',status:'realizada',policy:answered,now:new Date('2026-11-17T11:00:00Z')}).length===2,'resposta encerra só aquele dia');
 check(checkins.dailyCheckinBudgetP2([...future,...future]).length===3,'budget no máximo 1 convite por dia');
 check(checkins.checkinCanAnswerP2({consultDate:'2026-11-17',status:'realizada',consentAt:optin.consent_at,day:1,now:new Date(2026,10,18,20)}),'resposta disponível após envio do D+1');
 check(!checkins.checkinCanAnswerP2({consultDate:'2026-11-17',status:'realizada',consentAt:optin.consent_at,day:3,now:new Date(2026,10,18,20)}),'não responde antes da data D+3');
 check(!checkins.checkinCanAnswerP2({consultDate:'2026-11-17',status:'realizada',consentAt:optin.consent_at,day:1,now:new Date(2026,10,21,20)}),'janela finita, sem aviso atrasado infinito');
 check(!checkins.checkinCanAnswerP2({consultDate:'2026-11-17',status:'realizada',consentAt:optin.consent_at,day:1,now:new Date(2026,10,18,20),previous:{answer:'dispensar',at:'2026-11-18T19:00:00Z'}}),'resposta dispensada não reaparece');

 const brain=load('lib/m3/brain-facts-p2.ts');
 const input={userId:'u1',personId:'p1',consultas:[{id:'c1',user_id:'u1',person_id:'p1',data:'2026-11-15',status:'realizada',motivo:'Consulta'}, {id:'secret',user_id:'u2',person_id:'p1',data:'2026-11-16',status:'realizada'}],cirurgias:[],exames:[],doses:[{id:'d1',user_id:'u1',person_id:'p1',data:'2026-11-17',horario:'08:00',tomado_em:'2026-11-17T08:00:00Z'}],registros:[],careflow:[]};
 const facts=brain.buildBrainFactsP2(input,10);check(facts.length===2,'Brain só usa fatos da conta e pessoa');
 check(facts.some(f=>f.kind==='dose_tomada'&&f.provenance.includes('DoseLog')),'dose somente quando explicitamente confirmada');
 check(facts.every(f=>!f.title.includes('secret')),'nenhum vazamento de outra conta');
 for(const file of ['components/notifications/EventPoliciesP2.tsx','app/saude/careflow/linha-do-tempo/page.tsx','lib/repositories/notificationPoliciesP2.ts']){
  const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(source.parseDiagnostics.length===0,`AST válida ${file}`);
 }
 const eventUi=read('components/notifications/EventPoliciesP2.tsx');
 check(eventUi.includes('HealthRelationPicker')&&eventUi.includes('CustomDatePicker')&&eventUi.includes('HealthTimePicker'),'interface usa seleção, calendário e relógio próprios do VAULT');
 check(!/<select\b/.test(eventUi)&&!/<input\b[^>]*type\s*=\s*[\"'](?:date|time|datetime-local)[\"']/.test(eventUi),'interface não recorre a controles nativos visíveis');
 check(eventUi.includes('setSpecialDraft')&&eventUi.includes('Salvar aviso especial'),'data/hora especial só sincroniza após confirmação explícita');
 check(read('lib/repositories/notificationPoliciesP2.ts').includes("consultation.status!=='realizada'"),'check-in exige conclusão canônica antes de responder');
 const sqlite=read('supabase/migrations/20261117221000_vault_notification_policies_p2.sql');
 check(sqlite.includes('enable row level security')&&sqlite.includes('auth.uid()')&&sqlite.includes('person_id'),'RLS owner/person no DDL');
 const scheduler=read('lib/health-reminders/event-scheduler.ts');
 check(scheduler.includes('reconcileVaultNotificationSet(notifications, owns)'),'o reconciliador nativo único continua autoridade');
 check(scheduler.includes('scopePolicyForEventP2')&&scheduler.includes('planInstantsP2'),'políticas de compromisso integradas');
 const receipt=read('components/HealthReminderReconciler.tsx');check(receipt.includes('item.realizada_em || item.renovacao_realizada_id'),'retirada concluída não vira aviso pendente');
 check(receipt.includes('checkinInvitationsP2')&&receipt.includes('dailyCheckinBudgetP2'),'check-in exige convite explícito e limite diário');
 const db=read('lib/db/index.ts'),queue=read('hooks/useSyncQueue.ts'),pull=read('lib/sync/pull.ts');
 check(db.includes('this.version(48)')&&db.includes('notification_policies_p2'),'Dexie evolui aditivamente');
 check(queue.includes('syncNotificationPolicyP2')&&queue.includes("'notification_policies_p2'"),'fila offline e push existente');
 check(read('lib/repositories/notificationPoliciesP2.ts').includes('assertEventForOwner'),'validação canônica do dono do compromisso antes da escrita');
 check(receipt.includes('ownerCheckinGroups'),'budget aplicado por pessoa, não conta inteira');
 check(pull.includes('remoteTable:"notification_policies_p2"'),'pull existente integra políticas');
 check(read('scripts/test-v63-release-gate.mjs').includes('scripts/test-vault-ci360-m3-p2.cjs'),'teste P2 faz parte do gate V63');
 console.log(`VAULT M3 P2: ${checks} garantias comportamentais, privacidade e integração OK`);
})().catch(err=>{console.error(err);process.exitCode=1});
