/** M2 contract + pure behavior regressions. Clinical records below are SYNTHETIC. */
'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path'),Module=require('module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const must=(cond,msg)=>assert.ok(cond,`M2: ${msg}`);
const domainSource=read('lib/clinical-exams-m2/domain.ts');
const compiled=ts.transpileModule(domainSource,{fileName:'domain.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
for(const d of compiled.diagnostics||[])if(d.category===ts.DiagnosticCategory.Error)throw Error(ts.flattenDiagnosticMessageText(d.messageText,'\n'));
const moduleObj=new Module(path.join(process.cwd(),'m2-domain.cjs'),module);moduleObj.filename=path.join(process.cwd(),'m2-domain.cjs');moduleObj.paths=module.paths;moduleObj._compile(compiled.outputText,moduleObj.filename);
const {projectExamWorkspaceM2,planExamRemindersM2,localCivilToIsoM2,prepSourceNoteM2}=moduleObj.exports;
const uid='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222';
const iso='2026-12-05T10:30:00.000Z',now='2026-11-20T00:00:00.000Z';
const base=(id)=>({id,user_id:uid,person_id:pid,deleted_at:null,created_at:now,updated_at:now});
const order={...base('order1'),order_kind:'medical_request',title:'Pedido pré-operatório'};
const items=Array.from({length:15},(_,i)=>({...base('item'+i),order_id:'order1',name:'Exame '+i,status:'pending'}));
for(let i=0;i<13;i++)items[i].status='scheduled';
const sessions=[{...base('sessionA'),order_id:'order1',scheduled_at:iso,status:'scheduled',timezone_name:'America/Sao_Paulo',laboratory_name:'Laboratório A',prep_minutes:null,prep_instructions:null,prep_confirmed_by_user:false,prep_reminder_opt_in:false,appointment_reminder_opt_in:true,result_reminder_opt_in:true,expected_result_at:'2026-12-09T13:00:00Z'},
 {...base('sessionB'),order_id:'order1',scheduled_at:'2026-12-10T18:00:00.000Z',status:'scheduled',timezone_name:'America/Sao_Paulo',laboratory_name:'Clínica B',prep_minutes:null,prep_instructions:null,prep_confirmed_by_user:false,prep_reminder_opt_in:false,appointment_reminder_opt_in:true,result_reminder_opt_in:false,expected_result_at:null}];
const links=Array.from({length:13},(_,i)=>({...base('link'+i),order_id:'order1',session_id:i<12?'sessionA':'sessionB',exam_order_item_id:'item'+i,status:'scheduled'}));
const make=()=>projectExamWorkspaceM2([order],[...items],sessions,links,uid,pid);
let rows=make();assert.equal(rows.length,1);assert.equal(rows[0].items.length,15);assert.equal(rows[0].sessions[0].links.length,12);
assert.equal(rows[0].sessions[1].links.length,1);assert.equal(rows[0].pending,2);assert.equal(rows[0].scheduled,13);
let notices=planExamRemindersM2(rows,Date.parse(now));assert.equal(notices.filter(x=>x.kind==='session').length,2);
assert.equal(notices.filter(x=>x.kind==='prep').length,0);
assert.equal(notices.filter(x=>x.kind==='result').length,0); // Pending result cannot be inferred from future scheduled date
items[0].status='collected';links[0].status='collected';rows=make();notices=planExamRemindersM2(rows,Date.parse(now));
assert.equal(notices.filter(x=>x.kind==='result').length,1);assert.equal(notices.filter(x=>x.kind==='session').length,2);
items[0].status='result_received';rows=make();assert.equal(planExamRemindersM2(rows,Date.parse(now)).filter(x=>x.kind==='result').length,0);
sessions[0].status='cancelled';rows=make();assert.equal(planExamRemindersM2(rows,Date.parse(now)).filter(x=>x.sessionId==='sessionA').length,0);
const foreign=[{...order,person_id:'foreign'}];assert.equal(projectExamWorkspaceM2(foreign,items,sessions,links,uid,pid).length,0);
assert.equal(projectExamWorkspaceM2([order],items,sessions,links,uid,'foreign').length,0);
assert.ok(localCivilToIsoM2('2026-11-20T07:30').endsWith('Z'));
assert.throws(()=>localCivilToIsoM2('2026-02-31T07:30'));
assert.throws(()=>prepSourceNoteM2('guess','test'));
assert.match(prepSourceNoteM2('laboratorio','conferido'),/Fonte declarada do preparo: laboratório/);
const repo=read('lib/clinical-exams-m2/repository.ts'),nav=read('app/saude/exames/page.tsx'),care=read('app/saude/careflow/exames/page.tsx');
const oldNew=read('app/saude/exames/novo/page.tsx'),home=read('app/page.tsx'),today=read('app/hoje/page.tsx'),notifs=read('lib/clinical-exams-m2/notifications.ts');
const rec=read('components/HealthReminderReconciler.tsx');
for(const m of ['recordExamSessionProgressM2','cancelExamSessionM2','rescheduleExamSessionM2','recordExamResultM2','linkExamReviewConsultationM2'])must(repo.includes(m),'transição '+m);
must(repo.includes("db.transaction('rw'")&&repo.includes('enfileirarOperacao')&&!repo.includes("db.exames.add"),'transação local + fila, sem escrita legada');
must(care.includes('await createExamOrderM1('),'cutover CareFlow para autoridade canônica');
must(oldNew.includes('NovoExamePage')&&oldNew.includes('Novos exames devem ser registrados no Pedido 360'),'rota legada bloqueada para novos writes');
must(nav.includes('CanonicalExamOrdersM2')&&nav.includes('/saude/exames/pedidos?novo=1'),'Exames tem entrada única');
must(home.includes('<ExamAgendaM2 compact />')&&today.includes('<ExamAgendaM2 day={dataSelecionada} />'),'Hoje/Home projetam sessões');
must(rec.includes('reconcileExamSessionNotificationsM2')&&rec.includes('examWorkspacesM2'),'reconciliador nativo integra autoridade M2');
must(notifs.includes('checkExactNotificationSetting')&&notifs.includes('changeExactNotificationSetting'),'API Capacitor v6');
must(notifs.includes('M2_NOTICE_MARKER')&&notifs.includes('reconcileVaultNotificationSet'),'reconciliar somente namespace M2');
must(!repo.includes('db.exam_sessions.delete')&&!repo.includes('db.exam_session_items.delete'),'sem exclusão física');
const ordersPage=read('app/saude/exames/pedidos/page.tsx');
must(ordersPage.includes('CustomDatePicker') && ordersPage.includes('HealthTimePicker') && ordersPage.includes('HealthRelationPicker'),
  'data/hora e escolhas usam controles acessíveis compartilhados do Vault');
must(!/<input\b[^>]*type\s*=\s*["\'](?:date|time|datetime-local)["\']/.test(ordersPage) && !/<select\b/.test(ordersPage),
  'sem campos nativos visíveis de calendário, horário ou seleção');
must(ordersPage.includes('Data escolhida, mas horário ainda não confirmado.') &&
  ordersPage.includes('Escolha a data e o horário completo confirmados pelo laboratório.'),
  'horário civil não pode ser preenchido automaticamente quando só a data foi declarada');
const gate=read('scripts/test-v63-release-gate.mjs');assert.equal(gate.split('scripts/test-vault-m2-exams-360.cjs').length-1,1);
console.log('VAULT_M2_CONTRATOS_OK | 12+1+2 | resultado factual | notificações por sessão | ciclo transacional | cutover | projeção Home/Hoje');
