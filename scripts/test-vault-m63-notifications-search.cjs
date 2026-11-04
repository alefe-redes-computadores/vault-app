#!/usr/bin/env node
"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
let checks=0;
const check=(value,reason)=>{assert.ok(value,`M63: ${reason}`);checks++};
function load(file,overrides={}){
 const abs=path.resolve(file),src=fs.readFileSync(file,'utf8');
 const program=ts.createSourceFile(abs,src,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(program.parseDiagnostics.length===0,`sintaxe TS de ${file}`);
 const output=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 const m=new Module(abs,module);
 m.require=id=>Object.prototype.hasOwnProperty.call(overrides,id)?overrides[id]:require(id);
 m._compile(output.outputText,abs);
 return m.exports;
}
const grouping=load('lib/health-reminders/event-grouping.ts');
const navigation=load('lib/health-reminders/event-navigation.ts',{'./event-grouping':grouping});
const date=new Date(2026,10,6,9,0,0),at=new Date(2026,10,5,9,0,0);
const evt=(id,person='p1',day='2026-11-06',kind='retirada',user='u1')=>({id,userId:user,personId:person,kind,date:day,title:'Retirada '+id});
const r=(event,offsetMinutes=1440,notifyAt=at)=>({event,offsetMinutes,notifyAt});
const groups=grouping.groupWithdrawalReminders([r(evt('a')),r(evt('b')),r(evt('a')),r(evt('c','p2')),r(evt('d','p1','2026-11-07')),r(evt('e','p1','2026-11-06','consulta')),r(evt('f','p1','2026-11-06','retirada','u2')),r(evt('g'),60)]);
check(groups.length===6,'agrupar somente retirada mesmo dia, pessoa, conta, offset e disparo');
check(groups.find(g=>g.members.length===2)?.members.map(x=>x.event.id).join(',')==='a,b','grupo deduplica e ordena IDs');
check(groups.some(g=>g.members[0].event.id==='c'&&g.members[0].event.personId==='p2'),'pessoa diferente isolada');
check(groups.some(g=>g.members[0].event.id==='d'),'outro dia preservado');
check(groups.some(g=>g.members[0].event.kind==='consulta'),'consulta permanece individual');
check(groups.some(g=>g.members[0].event.userId==='u2'),'conta diferente isolada');
check(grouping.groupWithdrawalReminders([r(evt('a')),r(evt('b'),1440,new Date(at.getTime()+60000))]).length===2,'instantes diferentes não se agrupam');
check(grouping.withdrawalGroupHref('2026-11-06')==='/saude/retiradas?data=2026-11-06','link para o dia agrupado');
check(grouping.withdrawalGroupHref('evil')==='/saude/retiradas','data inválida não é propagada');
check(grouping.withdrawalReminderText(3,2880).includes('2 dias'),'antecedência dois dias verdadeira');
check(grouping.withdrawalReminderText(3,1440).includes('amanhã'),'antecedência de um dia');
check(grouping.withdrawalReminderText(3,0).includes('hoje'),'antecedência zero');
check(!grouping.withdrawalReminderText(3,2880).includes('amanhã'),'2 dias não vira amanhã');
check(navigation.resolveHealthEventDestination({eventKind:'retirada',eventIds:['a','b'],eventDate:'2026-11-06'})==='/saude/retiradas?data=2026-11-06','grupo abre dia exato');
check(navigation.resolveHealthEventDestination({eventKind:'retirada',eventId:'a b'})==='/saude/retiradas/detalhes?id=a%20b','individual abre detalhe com ID codificado');
check(navigation.resolveHealthEventDestination({eventKind:'exame',eventId:'e-1'})==='/saude/exames/detalhes?id=e-1','exame preserva destino individual');
check(navigation.resolveHealthEventDestination({eventKind:'other',eventId:'x'})===null,'tipo desconhecido não navega');
check(navigation.isSafeVaultNotificationRoute('/saude/retiradas')&&!navigation.isSafeVaultNotificationRoute('//evil.com')&&!navigation.isSafeVaultNotificationRoute('/\\evil'),'rota nativa sanitizada');
const scheduler=fs.readFileSync('lib/health-reminders/event-scheduler.ts','utf8');
// V286 uses an isolated CommonJS Module whose fallback require() resolves from
// scripts/, not from the original TS source. It must never load a NEW relative module.
check(!/from\s+["']\.\/event-grouping["']/.test(scheduler), 'V286: agendador sem import relativo do agrupador');
const translatedScheduler=ts.transpileModule(scheduler,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
check(!translatedScheduler.includes('require("./event-grouping")'), 'V286: CommonJS emit sem require do agrupador');
check(scheduler.includes('VAULT_EVENT_MULTI_REMINDER_V52')&&scheduler.includes('settings.eventOffsets[event.kind]'),'múltiplos offsets legados preservados');
check(scheduler.includes('groupWithdrawalReminders(candidates)')&&scheduler.includes('withdrawalReminderText(eventIds.length, offsetMinutes)'),'agenda agrupada usa motor testado');
check(scheduler.includes('offsetMinutes === 1440')&&scheduler.includes('formatReminderOffset(offsetMinutes)'), 'texto correto para mais de um dia');
check(scheduler.includes('offsetMinutes >= 0 && offsetMinutes < 1440'), 'V204: lembrete sem horário com antecedência menor que um dia diz hoje');

check(scheduler.includes('notifyAt.getTime()')&&scheduler.includes('vaultNotificationFingerprint'),'fingerprint inclui instante exato');
check(scheduler.includes('MAX_EVENT_PENDING')&&scheduler.includes('reconcileVaultNotificationSet(notifications, owns)'),'limite e reconciliação canônica mantidos');
const provider=fs.readFileSync('components/Providers.tsx','utf8');
check(!provider.includes('"Notificação clicada:"'),'payload de pessoa não vai para console');
check(provider.includes('const person = await db.persons.get(data.personId)')&&provider.includes('person.user_id !== user.id'),'navegação valida propriedade da pessoa');
check(provider.includes('data.userId !== user.id'),'payload de outra conta rejeitado');
check(provider.includes('resolveHealthEventDestination(data)'),'notificação usa rota exata do evento');
check(provider.includes('isSafeVaultNotificationRoute(destination)'),'destino interno validado');
check(provider.includes('resolveDoseNotificationDestination(data.type, data.horario)'),'notificação de dose mantém destino legado');
const oldNav=fs.readFileSync('lib/notification-dose-navigation.ts','utf8');
check(oldNav.includes('"/?open=pending-doses"'),'compatibilidade de atraso e Home mantida sem fila especulativa');
const withdrawal=fs.readFileSync('app/saude/retiradas/page.tsx','utf8');
check(withdrawal.includes('retirada.data !== notificationDate')&&withdrawal.includes('Ver todas'),'retiradas exibem filtro do dia e desfazem filtro');
const insight=fs.readFileSync('app/inteligencia/page.tsx','utf8');
check(insight.includes('expiredInsightNotice')&&insight.includes('não está mais disponível'),'insight resolvido não abre tela silenciosa');
const local=load('lib/local-search.ts');
const restock=load('lib/health-intelligence/medication-restock-navigation.ts');
const brain=load('lib/health-intelligence/vault-brain-commands.ts',{
 '@/lib/local-search':local,
 '@/lib/health-intelligence/medication-restock-navigation':restock,
});
const owner={userId:'u1',personId:'p1',medications:[],documents:[],treatments:[],appointments:[],exams:[],renewals:[],withdrawals:[],surgeries:[],doctors:[],pharmacies:[],hospitals:[],careLocations:[],supplyProcesses:[]};
const fill={...owner,withdrawals:[{id:'ret1',user_id:'u1',person_id:'p1',medicamento_nome:'Fenergan',data:'2026-11-06',status:'agendada',tipo:'sus'},{id:'foreign',user_id:'u1',person_id:'p2',medicamento_nome:'Segredo',data:'2026-11-06',status:'agendada'}],
 surgeries:[{id:'s1',user_id:'u1',person_id:'p1',procedimento:'Reconstrução',data:'2026-11-10',status:'agendada'}],
 supplyProcesses:[{id:'p1',user_id:'u1',person_id:'p1',titulo:'Fornecimento Venvanse',protocolo:'123ABC',origem:'estadual_ceaf',status:'ativo'},{id:'p2',user_id:'u2',person_id:'p1',titulo:'Fornecimento secreto',status:'ativo'}],
 doctors:[{id:'d1',user_id:'u1',nome:'Dra Alice',especialidade:'Psiquiatria'},{id:'d2',user_id:'u2',nome:'Dra Privada'}],
 pharmacies:[{id:'f1',user_id:'u1',nome:'Farmácia Centro'}],
 hospitals:[{id:'h1',user_id:'u1',nome:'Hospital Central'}],
 careLocations:[{id:'l1',user_id:'u1',nome:'UBS Oliveira'}],
 documents:[{id:'doc1',user_id:'u1',person_id:'p1',title:'Receita',description:'x'.repeat(230)+' observacao profunda '+ 'y'.repeat(4),type:'documento',category_id:'saude'}]
};
const search=q=>brain.searchVaultBrainCommands(q,fill);
check(search('retirada fenergan').some(x=>x.href.includes('ret1')),'busca acha retirada individual');
check(search('cirurgia reconstrução').some(x=>x.href.includes('s1')),'busca acha cirurgia individual');
check(search('fornecimento venvanse').some(x=>x.href.includes('id=p1')),'busca abre fornecimento exato');
check(search('protocolo 123ABC').some(x=>x.href.includes('id=p1')),'busca processo pelo protocolo');
check(search('psiquiatria').some(x=>x.href.includes('id=d1')),'busca médico por especialidade');
check(search('farmácia centro').some(x=>x.href.includes('id=f1')),'busca farmácia cadastrada');
check(search('hospital central').some(x=>x.href.includes('id=h1')),'busca hospital');
check(search('ubs oliveira').some(x=>x.href.includes('id=l1')),'busca posto');
check(search('observacao profunda').some(x=>x.href.includes('doc1')),'encontra palavra depois de 160 caracteres');
check(!search('segredo').some(x=>x.href.includes('foreign')),'outro paciente não aparece');
check(!search('dra privada').some(x=>x.href.includes('d2')),'outra conta não aparece nos fornecedores globais');
check(!search('fornecimento secreto').some(x=>x.href.includes('id=p2')),'outro dono não aparece no fornecimento');
check(brain.searchVaultBrainCommands('retirada fenergan',{...fill,personId:null}).length===0,'sem pessoa nenhuma busca clínica é exposta');
check(search('ajuda').some(x=>x.href==='/ajuda'),'M61 ajuda preservada');
check(search('repor fenergan').some(x=>x.href==='/saude/medicamentos'),'reposição sem medicamento cadastrado oferece lista, não grava nada');
check(fs.readFileSync('app/page.tsx','utf8').includes('supplyProcesses: supplyOverview?.data?.processos'),'Home injeta fornecimentos já owner-scoped');
check(fs.readFileSync('components/health-intelligence/VaultBrainCommand.tsx','utf8').includes('data.supplyProcesses'),'busca reativa a processos');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
check(gate.includes('scripts/test-vault-m63-notifications-search.cjs')&&gate.includes('scripts/test-vault-m62-retro-batch.cjs'),'M63 e M62 integrados ao release gate');
for (const p of ['lib/health-reminders/event-scheduler.ts','components/Providers.tsx','app/saude/retiradas/page.tsx','app/inteligencia/page.tsx','app/page.tsx','components/health-intelligence/VaultBrainCommand.tsx','lib/health-intelligence/vault-brain-commands.ts']) {
 const src=fs.readFileSync(p,'utf8');
 const parsed=ts.createSourceFile(p,src,ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(parsed.parseDiagnostics.length===0,`TS/TSX parse do arquivo integrado: ${p}`);
}
// Execute a purchase reminder through the exact V286 CommonJS-style harness.
const scheduled=[];
const mockSettings={eventOffsets:{consulta:[60],exame:[60],retirada:[60],compra:[1440,0]},dateOnlyEventTime:'09:00',plannedPurchaseTime:'12:00'};
const testedScheduler=load('lib/health-reminders/event-scheduler.ts', {
  '@/lib/notification-preferences':{isVaultNotificationCategoryEnabled:c=>c==='renovacoes'},
  '@capacitor/local-notifications':{LocalNotifications:{checkPermissions:async()=>({display:'granted'})}},
  '@/lib/notification-brain':{formatReminderOffset:n=>n?`${n} min antes`:'na hora',getVaultNotificationBrainSettings:()=>mockSettings},
  '@/lib/native-runtime':{isVaultNative:()=>true},
  '@/lib/notifications':{ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault'},
  '@/lib/notification-reconciliation':{VAULT_NOTIFICATION_FINGERPRINT:'fp',vaultNotificationFingerprint:p=>p.join('|'),reconcileVaultNotificationSet:async n=>{scheduled.splice(0,scheduled.length,...n)}},
});
(async()=>{
  const count=await testedScheduler.reconcileHealthEventNotifications([{id:'buy',userId:'u',personId:'p',kind:'compra',title:'Compra futura',date:'2099-12-31',status:'agendada',targetRoute:'/saude/renovacao/detalhes?id=buy'}]);
  check(count===2&&scheduled.length===2,'V286: dois lembretes da compra continuam agendados');
  check(scheduled.every(n=>n.extra.eventKind==='compra'&&n.extra.targetRoute.includes('id=buy')),'V286: compra mantém evento e destino');
  check(scheduled.every(n=>n.title==='Compra planejada'),'V286: título da compra futura não muda');
  // V204 — Real scheduler + mocked reminder settings, not only string inspection.
  // The legacy contract requires one reminder for tomorrow (24h) and one for
  // today (60 min) on a date-only withdrawal. Two days may NEVER say tomorrow.
  const saved = [];
  const v204 = load('lib/health-reminders/event-scheduler.ts', {
    '@/lib/notification-preferences': { isVaultNotificationCategoryEnabled:()=>true },
    '@capacitor/local-notifications': {LocalNotifications:{checkPermissions:async()=>({display:'granted'})}},
    '@/lib/notification-brain': { formatReminderOffset:n=>n===2880?'2 dias antes':`${n} minutos antes`,getVaultNotificationBrainSettings:()=>({eventOffsets:{consulta:[60],exame:[60],retirada:[1440,60,2880],compra:[1440,0]},dateOnlyEventTime:'09:00',plannedPurchaseTime:'12:00'}) },
    '@/lib/native-runtime': {isVaultNative:()=>true},
    '@/lib/notifications': {ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault'},
    '@/lib/notification-reconciliation': {VAULT_NOTIFICATION_FINGERPRINT:'fingerprint',vaultNotificationFingerprint:parts=>parts.join('|'),reconcileVaultNotificationSet:async notifications=>{saved.splice(0,saved.length,...notifications)}},
  });
  const at=Date.now();
  const future=new Date(at+12*86400000);
  const yyyy=future.getFullYear(),mm=String(future.getMonth()+1).padStart(2,'0'),dd=String(future.getDate()).padStart(2,'0');
  const withdrawal={id:'ret-v204',userId:'u1',personId:'p1',kind:'retirada',title:'Farmácia cadastrada',date:`${yyyy}-${mm}-${dd}`,status:'agendada',targetRoute:'/saude/retiradas/detalhes?id=ret-v204'};
  const total=await v204.reconcileHealthEventNotifications([withdrawal]);
  check(total===3&&saved.length===3, 'V204: três notificações reais sem horário com antecedências de 2 dias, 1 dia e 1 hora');
  check(saved.every(item=>item.title==='Retirada'&&item.extra.eventKind==='retirada'), 'V204: título e identidade de retirada preservados');
  const msg=offset=>saved.find(item=>item.extra.offsetMinutes===offset)?.body||'';
  check(msg(1440).includes('prevista para amanhã'), 'V204: 24h antes indica amanhã');
  check(msg(60).includes('prevista para hoje'), 'V204: 1h antes indica hoje');
  check(msg(2880).includes('prevista em 2 dias')&&!msg(2880).includes('amanhã'), 'M63: dois dias não significam amanhã');
  const cancelled=await v204.reconcileHealthEventNotifications([{...withdrawal,status:'cancelada'}]);
  check(cancelled===0&&saved.length===0,'V204: cancelar retirada remove lembretes pendentes');
  console.log(`VAULT M63 R3: ${checks} verificações de agrupamento, rotas, proprietário, Brain, V204 e V286 aprovadas.`);
})().catch(err=>{console.error(err);process.exitCode=1});
