#!/usr/bin/env node
'use strict';
/** M103 P2: actual notification action hook with faked Android, no health data or network. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
let n=0;
const ok=(value,name)=>{assert.ok(value,`M103 P2: ${name}`);n++};
const read=file=>fs.readFileSync(file,'utf8');
function load(file,imports={}){
 const source=read(file);
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(!tree.parseDiagnostics.length,`sintaxe ${file}`);
 const built=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
 ok(!(built.diagnostics||[]).some(x=>x.category===ts.DiagnosticCategory.Error),`transpilacao ${file}`);
 const module={exports:{}};
 new Function('module','exports','require',built.outputText)(module,module.exports,id=>{
   if(Object.prototype.hasOwnProperty.call(imports,id))return imports[id];
   throw Error(`M103 P2 import imprevisto ${id} em ${file}`);
 });
 return module.exports;
}
const policy=load('lib/dose-action-safety-m103.ts');
const predicate=policy.canApplyNativeDoseActionM103;
const local=(at)=>`${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`;
const time=at=>`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`;
const now=new Date();
const recent=new Date(now.getTime()-15*60000);
const slot={data:local(recent),horario:time(recent),personId:'p1',medicamentoId:'m1'};
const old=new Date(now.getTime()-3*86400000);
const future=new Date(now.getTime()+30*60000);
ok(predicate(slot,now),'slot recente e completo e elegivel');
ok(!predicate({...slot,data:undefined},now),'sem data exata nao marca');
ok(!predicate({...slot,horario:undefined},now),'sem horario exato nao marca');
ok(!predicate({...slot,data:'2026-02-30'},now),'dia inexistente nunca e aceito');
ok(!predicate({...slot,data:'2026-13-01'},now),'mes invalido nunca e aceito');
ok(!predicate({...slot,data:'2026-11-31'},now),'dia de novembro invalido');
ok(!predicate({...slot,horario:'24:00'},now),'hora invalida');
ok(!predicate({...slot,horario:'09:60'},now),'minuto invalido');
ok(!predicate({...slot,personId:''},now),'sem pessoa nunca marca');
ok(!predicate({...slot,personId:'x'.repeat(161)},now),'identidade exagerada rejeitada');
ok(!predicate({...slot,medicamentoId:''},now),'sem medicamento nao marca');
ok(!predicate({...slot,data:local(old),horario:time(old)},now),'notificacao com mais de 48h exige revisao manual');
ok(!predicate({...slot,data:local(future),horario:time(future)},now),'slot 30min futuro nao confirma automaticamente');
ok(!predicate(slot,new Date(NaN)),'relogio invalido rejeitado');
ok(!predicate({...slot,data:'2025-02-29'},new Date(2025,1,28,12)),'ano nao bissexto');
ok(predicate({...slot,data:'2028-02-29',horario:'12:00'},new Date(2028,1,29,12,10)),'ano bissexto valido');
const hourAhead=new Date(now.getTime()+5*60000);
ok(predicate({...slot,data:local(hourAhead),horario:time(hourAhead)},now),'proximo horario com tolerancia de 10min');
const hourAheadFar=new Date(now.getTime()+11*60000);
ok(!predicate({...slot,data:local(hourAheadFar),horario:time(hourAheadFar)},now),'nao antecipa acima de 10min');

// Execute the real pure contracts with a closed relative-module loader.
const path=require('node:path');const pureCache=new Map();
function pure(name){const file='lib/dose-premium/'+name+'.ts';if(pureCache.has(file))return pureCache.get(file);const src=read(file);const imports={};for(const m of src.matchAll(/from ['"](\.\/[a-z-]+)['"]/g))imports[m[1]]=pure(path.basename(m[1]));const out=load(file,imports);pureCache.set(file,out);return out;}
const nativeReview=pure('native-review'),homeReview=pure('home-review');
let handler=null,removeCount=0,active='p1',uid='u1';
const writes=[],cancelled=[],snoozes=[],routes=[],toasts=[],saved=[];
const notifications={addListener:async(type,fn)=>{assert.equal(type,'localNotificationActionPerformed');handler=fn;return {remove:async()=>{removeCount++}}}};
const repository={getAll:async(person,day,owner)=>saved.filter(x=>x.person_id===person&&x.data===day&&x.user_id===owner),setStatus:async input=>{
  assert(input.onlyIfPending===true,'escrita Android exige slot ainda pendente');assert.equal(input.expected,null);assert.equal(input.adjustStock,false);
  saved.push({id:'saved-'+saved.length,user_id:uid,person_id:input.personId,medicamento_id:input.medicamentoId,data:input.data,horario:input.horario,dose_kind:'scheduled',ignorado_em:now.toISOString()});writes.push(input);
}};
const originalError=console.error;console.error=()=>{};
const effects=[];
const mockReact={useEffect:fn=>effects.push(fn),useRef:current=>({current})};
const previous=new Date(now.getTime()-25*60000);
// For deterministic test coverage, the notification may be from yesterday at midnight.
// The explicit pending record provides historical scope for that case; absent old rows stay read-only.
const med={id:'m1',user_id:'u1',person_id:'p1',tipo_uso:'continuo',estoque_horarios:[slot.horario,time(previous)]};
const hook=load('hooks/useDoseNotificationActions.ts',{
 'react':mockReact,
 'next/navigation':{useRouter:()=>({push:href=>routes.push(href)})},
 '@/hooks/useActivePersonId':{useActivePersonId:()=>({activePersonId:active,changePerson:async p=>{active=p}})},
 '@/components/ToastProvider':{useToast:()=>({showToast:(...args)=>toasts.push(args)})},
 '@/lib/db':{db:{persons:{get:async id=>id==='p1'?{id,user_id:'u1'}:null},medicamentos:{get:async id=>id==='m1'?med:null}}},
 '@/lib/supabase/local-auth':{getLocalFirstAuthUser:async()=>({data:{user:{id:uid}},error:null})},
 '@/lib/dose-premium/native-review':nativeReview,
 '@/lib/dose-premium/home-review':homeReview,
 '@/lib/notification-navigation':{runAfterVaultBiometricUnlock:fn=>fn()},
 '@capacitor/core':{Capacitor:{}},
 '@capacitor/local-notifications':{LocalNotifications:notifications},
 '@/lib/native-runtime':{isVaultNative:()=>true},
 '@/lib/repositories/doseLogs':{doseLogsRepository:repository},
 '@/lib/overdue-dose-notifications':{cancelOverdueDoseNotification:async input=>cancelled.push(input)},
 '@/lib/dose-snooze-m99p3':{snoozeDoseReminderM99P3:async input=>{snoozes.push(input);return true}},
 '@/lib/dose-action-safety-m103':policy,
 '@/lib/health-utils':{getLocalTodayISO:()=>local(now),addDaysToLocalDate:(date)=>date},
});
hook.useDoseNotificationActions();
ok(effects.length===1,'somente listener ja existente e registrado');
const cleanup=effects[0]();
const extra={type:'dose_reminder',personId:'p1',medicamentoId:'m1',horario:slot.horario,data:slot.data};
const trigger=async(actionId,changes={})=>{assert(handler);await handler({actionId,notification:{extra:{...extra,...changes}}})};
(async()=>{
 await trigger('TOMEI',{data:undefined});ok(writes.length===0&&routes.length===0,'lembrete legado sem data nao escreve nem navega');
 await trigger('IGNORAR',{data:'2026-02-30'});ok(writes.length===0,'notificacao com data impossivel nao escreve');
 await trigger('TOMEI',{data:local(old),horario:time(old)});ok(writes.length===0&&routes.length===0,'notificacao obsoleta nao escreve');
 await trigger('TOMEI');ok(writes.length===0&&routes.length===1&&cancelled.length===0,'Tomei abre revisao sem inventar quantidade e sem cancelar alerta');
 const url=new URL(routes[0],'https://test.invalid');const token=url.searchParams.get('native_review');const scope={user_id:'u1',person_id:'p1'};
 const intent=nativeReview.readNativeDoseReview(token,scope,slot.data);ok(intent?.medicationId==='m1'&&intent.hour===slot.horario,'handoff conserva slot exato');
 ok(!routes[0].includes('p1')&&!routes[0].includes('u1')&&!routes[0].includes('m1'),'URL sem identidades clinicas');
 ok(!nativeReview.readNativeDoseReview(token,{...scope,person_id:'p2'},slot.data),'handoff nao atravessa pessoas');
 ok(!nativeReview.readNativeDoseReview(token,scope,slot.data,Date.now()+301000),'handoff expira');
 const item={medicamentoId:'m1',horario:slot.horario,tomada:false,ignorada:false};const absent={state:'absent',records:[]};
 ok(nativeReview.findNativeReviewItem(intent,[item],absent)===item,'slot real atual elegivel');
 ok(!nativeReview.findNativeReviewItem(intent,[{...item,doseKind:'sos',isAvulsa:true}],absent),'SOS nao substitui rotina');
 ok(!nativeReview.findNativeReviewItem(intent,[item,item],absent),'duplicidade bloqueia');
 ok(!nativeReview.findNativeReviewItem(intent,[item],{state:'taken',records:[{id:'r'}]}),'fato resolvido bloqueia');
 const planned={...item,doseKind:'planned',logId:'r',isAvulsa:true};ok(nativeReview.findNativeReviewItem(intent,[item,planned],{state:'pending',records:[{id:'r',dose_kind:'planned'}]})===planned,'planejada exige ID exato');
 nativeReview.discardNativeDoseReview(token);ok(!nativeReview.readNativeDoseReview(token,scope,slot.data),'consumo revoga token');
 uid='u2';await trigger('TOMEI');ok(routes.length===1,'titular diferente nao navega');uid='u1';
 await trigger('TOMEI',{personId:'p2'});ok(routes.length===1,'pessoa divergente nao navega');
 await trigger('IGNORAR',{data:local(future),horario:time(future)});ok(writes.length===0,'futuro nao registra fato ignorado');
 if(slot.data===local(now)){await trigger('IGNORAR');ok(writes.length===1&&writes[0].status==='ignored'&&writes[0].data===slot.data&&cancelled.length===1,'ignorar legitimo grava slot exato e cancela so apos escrita');await trigger('IGNORAR');ok(writes.length===1&&cancelled.length===1,'acao repetida nao reescreve');}else{await trigger('IGNORAR');ok(writes.length===0,'slot historico ausente nao e inventado');ok(cancelled.length===0,'alerta nao cancelado sem escrita');}
 const before=writes.length;med.estoque_horarios=[];await trigger('IGNORAR',{data:local(previous),horario:time(previous)});ok(writes.length===before,'agenda removida nao cria fato ignorado');
 await trigger('ADIAR');ok(snoozes.length===1,'adiar preserva rotina original sem escrita clinica');
 await trigger('ADIAR',{data:undefined});ok(snoozes.length===1,'adiamento sem data bloqueado');
 await trigger('OUTRA_ACAO');ok(writes.length===before,'acao desconhecida nunca escreve');
 await trigger('TOMEI',{personId:''});ok(writes.length===before,'falta de pessoa bloqueia escrita');
 cleanup();await Promise.resolve();await Promise.resolve();
 ok(removeCount===1,'listener nativo removido no cleanup');
 const native=read('components/saude/NativeDoseAgendaInspection.tsx');
 const panel=read('components/notifications/VaultDoseAlertPanelM99.tsx');
 ok(native.includes('ownerRef.current===selectedPerson')&&native.includes('requestRef.current===request'),'consulta detalhada descarta resposta atrasada de outra pessoa');
 ok(native.includes('if(current())setLoading(false)'),'consulta nao libera estado de outra requisicao');
 ok(native.includes('Agendado não significa entregue'),'diagnostico diferencia agendado de entregue');
 ok(!native.includes('setStatus(')&&!native.includes('LocalNotifications.schedule('),'inspecao nao altera dose nem agenda');
 ok(panel.includes('activePersonRef.current===person')&&panel.includes('refreshRef.current===request'),'painel do Android rejeita retorno fora de ordem');
 ok(panel.includes('setFeedback("")')&&panel.includes('setDiag({ display: "unavailable"'),'painel invalida informacao anterior ao trocar de pessoa');
 ok(panel.includes('if(current())setDiag({ display: "error"'),'erro tardio nao substitui resultado mais recente');
 ok(panel.includes('Agendar não comprova entrega'),'painel de teste nao promete entrega');
 const repo=read('lib/repositories/doseLogs.ts');
 ok(repo.includes('onlyIfPending = false')&&repo.includes('if(onlyIfPending && existing?.tomado_em)'),'trava atomica existente preservada');
 const v51=read('hooks/useDoseNotificationActions.ts');
 ok(v51.includes('VAULT_NOTIFICATION_EXACT_SLOT_V51')&&v51.includes('exactNotificationDate ??'),'contrato historico do slot mantido');
 const gate=read('scripts/test-v63-release-gate.mjs');
 ok(gate.includes('"scripts/test-vault-m103-p2-dose-actions.cjs"')&&gate.includes('"scripts/test-vault-m103-p1-privacy-recovery.cjs"'),'gate cumulativo M103 P1/P2 mantido');
 console.error=originalError;
 console.log(`VAULT M103 P2: ${n} verificacoes hermeticas aprovadas.`);
})().catch(e=>{console.error=originalError;console.error(e);process.exitCode=1});
