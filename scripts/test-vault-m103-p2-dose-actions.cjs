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

let handler=null,removeCount=0;
const writes=[],cancelled=[],snoozes=[];const saved=new Set();
const notifications={addListener:async(type,fn)=>{assert.equal(type,'localNotificationActionPerformed');handler=fn;return {remove:async()=>{removeCount++}}}};
const repository={setStatus:async input=>{
  assert(input.onlyIfPending===true,'escrita Android exige slot ainda pendente');
  const key=[input.personId,input.medicamentoId,input.data,input.horario].join('|');
  if(saved.has(key))throw Error('slot ja resolvido');
  saved.add(key);writes.push(input);
}};
const originalError=console.error;console.error=()=>{};
const effects=[];
const mockReact={useEffect:fn=>effects.push(fn)};
const hook=load('hooks/useDoseNotificationActions.ts',{
 'react':mockReact,
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
 await trigger('TOMEI',{data:undefined});
 ok(writes.length===0,'lembrete legado sem data nao escreve');
 await trigger('IGNORAR',{data:'2026-02-30'});
 ok(writes.length===0,'notificacao com data impossivel nao escreve');
 await trigger('TOMEI',{data:local(old),horario:time(old)});
 ok(writes.length===0,'notificacao obsoleta nao escreve');
 await trigger('TOMEI',{data:slot.data,horario:slot.horario});
 ok(writes.length===1&&writes[0].status==='taken'&&writes[0].data===slot.data,'tomada grava somente slot exato');
 ok(cancelled.length===1,'cancelamento de atraso so apos registro confirmado');
 await trigger('IGNORAR');
 ok(writes.length===1&&cancelled.length===1,'acao repetida/conflitante nao reescreve dose resolvida');
 const previous=new Date(now.getTime()-25*60000);
 await trigger('IGNORAR',{data:local(previous),horario:time(previous)});
 ok(writes.length===2&&writes[1].status==='ignored'&&writes[1].onlyIfPending,'ignorar legitimo usa trava de pendencia');
 await trigger('ADIAR');
 ok(snoozes.length===1,'adiar preserva rotina original sem escrita clinica');
 await trigger('ADIAR',{data:undefined});
 ok(snoozes.length===1,'adiamento sem data bloqueado');
 await trigger('OUTRA_ACAO');
 ok(writes.length===2,'acao desconhecida nunca escreve');
 await trigger('TOMEI',{personId:''});
 ok(writes.length===2,'falta de pessoa bloqueia escrita');
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
