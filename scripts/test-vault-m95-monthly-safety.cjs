"use strict";
// M95 hermetic: no Supabase, network, native notifications or clinical writes.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
let checks=0;
function ok(value,label){assert.ok(value,`M95: ${label}`);console.log(`✓ M95 ${++checks}: ${label}`);}
const read=p=>fs.readFileSync(p,"utf8");
function transpile(p){
 const output=ts.transpileModule(read(p),{fileName:p,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 ok(!output.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error),`${p}: TS/TSX sem erro sintático`);
 return output.outputText;
}
function loadPure(p,dependencies={}){
 const target={exports:{}};
 new Function("module","exports","require",transpile(p))(target,target.exports, id=>{if(Object.prototype.hasOwnProperty.call(dependencies,id))return dependencies[id];throw new Error("Importação inesperada em teste hermético: "+id);});
 return target.exports;
}
const safety=loadPure('lib/clinical-safety-episodes.ts');
const presentation=loadPure('lib/clinical-month-presentation.ts');
const monthly=loadPure('lib/clinical-month-report.ts',{'@/lib/clinical-safety-episodes':safety,'@/lib/clinical-month-presentation':presentation});
const dose={id:'d1',user_id:'u1',person_id:'p1',medicamento_id:'m1',data:'2026-11-03',horario:'23:00',tomado_em:'2026-11-04T02:11:00.000Z',quantidade:40,dose_kind:'sos',motivo:'Conforme anotação da pessoa'};
const alert={key:'k1',person_id:'p1',insight_id:'quantidade-confirmada-m1-d1',state:'resolved',first_detected_at:'2026-11-04T02:12:00.000Z',last_detected_at:'2026-11-04T02:12:00.000Z',feedback:'already_knew',feedback_updated_at:'2026-11-05T01:01:00.000Z',snapshot:{kind:'alert',entidade_tipo:'medicamento',entidade_id:'m1',titulo:'Quantidade confirmada fora do padrão',mensagem:'Comparação interna; não determina dose segura.',gravidade_seguranca:'importante',evidencias:['Quantidade registrada: 40 gotas','Referência interna: 5 gotas','Horário salvo: 2026-11-04T02:11:00.000Z']}};
const log2={...dose,id:'d2',quantidade:5,data:'2026-11-04',dose_kind:'scheduled',tomado_em:'2026-11-04T10:30:00.000Z'};
const log3={...dose,id:'d3',quantidade:undefined,data:'2026-11-05',dose_kind:'scheduled',tomado_em:undefined,ignorado_em:'2026-11-05T22:00:00.000Z',motivo:'Não realizado'};
const drug={id:'m1',user_id:'u1',person_id:'p1',nome:'Medicamento demonstrativo'};
const record={id:'r1',user_id:'u1',person_id:'p1',data:'2026-11-03',categoria:'sintoma',tipo:'sintoma',nome:'Dor relatada',observacoes:'Registrada pela pessoa'};
const calc=(extra={})=>monthly.buildClinicalMonthReport({monthKey:'2026-11',userId:'u1',personId:'p1',doseLogs:[dose,log2,log3],medications:[drug],healthRecords:[record],brainLedger:[alert],...extra});
let one=calc();
ok(one.monthKey==='2026-11'&&one.summary.taken===2&&one.summary.ignored===1,'contabiliza apenas tomada e ignorada explícitas');
ok(one.summary.sos===1&&one.summary.extra===0,'origem SOS preservada');
ok(one.alerts.length===1&&one.alerts[0].doseId==='d1','alerta persistido vinculado apenas à dose real');
ok(one.alerts[0].referenceQuantity===5&&one.alerts[0].quantity===40,'valores distintos retidos como evidência não prescritiva');
ok(one.alerts[0].reviewedAt&&one.alerts[0].feedback==='already_knew','conferência histórica preservada sem confirmar segurança');
ok(one.doses.find(d=>d.id==='d1').scheduledTime==='23:00'&&one.doses.find(d=>d.id==='d1').confirmedAt===dose.tomado_em,'horário previsto separado de horário confirmado');
ok(one.records.length===1&&one.records[0].title==='Dor relatada','registros de saúde registrados compõem mês');
let more=calc({brainLedger:[alert,{...alert,insight_id:'insight-other',first_detected_at:'2026-11-06T12:00:00.000Z',snapshot:{...alert.snapshot,titulo:'Outro sinal observado'}}]});
ok(more.brainInsights.length===1 && more.brainInsights[0].title==='Outro sinal observado','outros insights persistidos entram no mês de detecção, sem confundir data da dose');
ok(calc({brainLedger:[]}).alerts.length===0,'sem snapshot armazenado não inventa alerta retrospectivo');
ok(calc({brainLedger:[{...alert,person_id:'p2'}]}).alerts.length===0,'alerta de outra pessoa bloqueado');
ok(calc({brainLedger:[{...alert,insight_id:'quantidade-confirmada-m1-d2'}]}).alerts.length===0,'evidência com quantidade divergente não associa');
ok(calc({doseLogs:[{...dose,user_id:'u2'}],healthRecords:[{...record,user_id:'u2'}]}).doses.length===0,'isolamento de conta nos dados de saúde');
ok(calc({doseLogs:[{...dose,person_id:'p2'}],healthRecords:[{...record,person_id:'p2'}]}).doses.length===0,'isolamento de pessoa nos dados de saúde');
ok(calc({doseLogs:[{...dose,data:'2026-11-31'}]}).doses.length===0,'datas inválidas não são normalizadas silenciosamente');
ok(calc({doseLogs:[{...dose,horario:'99:99'}]}).doses[0].scheduledTime===null,'horários inválidos nunca são fabricados');
assert.throws(()=>monthly.buildClinicalMonthReport({...{monthKey:'2026-13',userId:'u1',personId:'p1',doseLogs:[],medications:[],healthRecords:[],brainLedger:[]}}));
ok(true,'mês impossível é rejeitado');
const s=read('lib/health-intelligence/brain-v5.ts');
ok(s.includes('historicalDoseEpisodes')&&s.includes('x.insight_id.startsWith("quantidade-confirmada-")'),'história confirmada não descartada pelo limite geral');
const repo=read('lib/repositories/brainV5AlertLedger.ts');
ok(repo.includes('reconcileDoseSafetyEpisodes(')&&repo.includes('complete: false')&&repo.includes('activeKeys.has(item.key)'),'reconcilia família de dose sem resolver outras famílias Brain');
const reconciler=read('components/health-intelligence/DoseSafetyEpisodeReconciler.tsx');transpile('components/health-intelligence/DoseSafetyEpisodeReconciler.tsx');
ok(reconciler.includes('health.context?.personId !== activePersonId')&&reconciler.includes('!user?.id')&&reconciler.includes('health.isLoading'),'observador protege conta/pessoa e carregamento');
ok(read('components/Providers.tsx').includes('<DoseSafetyEpisodeReconciler />'),'observador global instalado sob o provider Brain');
const pdf=read('lib/clinical-month-pdf.ts');transpile('lib/clinical-month-pdf.ts');
ok(pdf.includes('await deliverPdf(')&&pdf.includes('pdf.addPage()')&&pdf.includes('report.alerts')&&pdf.includes('report.brainInsights'),'exportador nativo/web existente e paginação preservados');
ok(pdf.includes('Registro real:')&&pdf.includes('Não informado')&&pdf.includes('não reconstitui falsamente'),'PDF não inventa horas ou retrospectos');
ok(read('lib/pdfExport.ts').includes('export async function deliverPdf('),'M93 reutilizada para salvar/compartilhar PDF');
const line=read('app/saude/registros/page.tsx');transpile('app/saude/registros/page.tsx');
ok(line.includes('buildClinicalMonthReport')&&line.includes('exportClinicalMonthPdf')&&line.includes('safetyByDoseId'),'linha de cuidado exporta mês e indica alerta por dose');
const pulse=read('hooks/useBrainV5Pulse.ts');
transpile('hooks/useBrainV5Pulse.ts');
ok(
 pulse.includes('return {records,counters:brainV5Counters(records)') &&
 pulse.includes('brain_v5_alert_ledger!.filter(x=>x.person_id===activePersonId)') &&
 pulse.includes('brainV5Journeys(records)'),
 'hook leve expõe registros ativos e resolvidos, isolados por pessoa'
);
const hist=read('app/saude/medicamentos/historico/page.tsx');transpile('app/saude/medicamentos/historico/page.tsx');
ok(hist.includes('hasSafety={safetyDates.has(day.date)}')&&hist.includes('Alertas preservados neste dia'),'calendário e histórico individual mostram alerta preservado');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-vault-m95-monthly-safety.cjs"'),'contrato M95 presente no gate');
ok(gate.indexOf('test-vault-m92-medication-premium-2')<gate.indexOf('test-vault-m93-home-brain-documents')&&gate.indexOf('test-vault-m93-home-brain-documents')<gate.indexOf('test-vault-m94-notifications-update')&&gate.indexOf('test-vault-m94-notifications-update')<gate.indexOf('test-vault-m95-monthly-safety'),'ordem legada M92 M93 M94 preservada');
ok(!reconciler.includes('LocalNotifications.schedule')&&!pdf.includes('supabase'), 'M95 sem push ou envio remoto no PDF');
console.log(`VAULT M95: ${checks} garantias de sintaxe, isolamento e comportamento aprovadas.`);
