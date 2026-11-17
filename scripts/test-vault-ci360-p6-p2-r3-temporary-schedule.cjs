'use strict';
/** P6 P2 R3: hermetic native schedule regression, no actual device/DB/user data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,'CI360 R3: '+message);console.log('✓ R3 '+(++checks)+': '+message);};
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const scheduledSource=read('lib/dose-notifications.ts');
const overdueSource=read('lib/overdue-dose-notifications.ts');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(scheduledSource.includes('med.tipo_uso!=="temporario"'),'repetições removidas apenas do caminho canônico de horários');
ok(overdueSource.includes('med.tipo_uso!=="temporario"'),'repetições removidas também dos reforços de atraso');
ok(scheduledSource.includes('log.dose_kind !== "planned"')&&overdueSource.includes('log.dose_kind!=="planned"'),'DoseLogs finitos continuam sendo lidos pelos dois motores');
ok(gate.includes('"scripts/test-vault-ci360-p6-p2-r3-temporary-schedule.cjs"'),'teste registrado no V63');
for(const file of ['lib/dose-notifications.ts','lib/overdue-dose-notifications.ts']) {
  const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  ok(tree.parseDiagnostics.length===0,`${file}: sintaxe TypeScript íntegra`);
}

let native=true,enabled=true;
let pendingOverdue=[];
let desiredScheduled=[];
const notificationApi={
  getPending:async()=>({notifications:pendingOverdue.map(x=>({...x}))}),
  cancel:async({notifications})=>{const ids=new Set(notifications.map(x=>x.id));pendingOverdue=pendingOverdue.filter(x=>!ids.has(x.id));},
  schedule:async({notifications})=>{for(const n of notifications){pendingOverdue=pendingOverdue.filter(x=>x.id!==n.id);pendingOverdue.push(n);}},
  checkPermissions:async()=>({display:'granted'}),registerActionTypes:async()=>{},
};
const mocks={
  '@capacitor/local-notifications':{LocalNotifications:notificationApi},
  '@/lib/native-runtime':{isVaultNative:()=>native},
  '@/lib/medication-availability':{hasKnownEmptyMedicationStock:med=>med.estoque_quantidade===0},
  '@/lib/notification-reconciliation':{
    reconcileVaultNotificationSet:async wanted=>{desiredScheduled=wanted;return {desired:wanted.length};},
    VAULT_NOTIFICATION_FINGERPRINT:'_vault_hash',vaultNotificationFingerprint:parts=>JSON.stringify(parts),
  },
  '@/lib/notification-brain':{getVaultNotificationBrainSettings:()=>({stockReviewTime:'10:00',doseOverdueOffsets:[30]})},
  '@/lib/notification-preferences':{isVaultNotificationCategoryEnabled:()=>enabled},
  '@/lib/notifications':{ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>enabled,requestNotificationPermissions:async()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault-test'},
  '@/lib/dose-slot-authority':{
    buildDoseSlotIndex:logs=>logs,
    resolveDoseSlot:(logs,id,data,hour)=>logs.find(x=>x.medicamento_id===id&&x.data===data&&x.horario===hour)||null,
    doseSlotIsResolved:log=>Boolean(log&&(log.tomado_em||log.ignorado_em)),
  },
  '@/lib/dose-alert-policy-m99':{getVaultDoseAlertMode:()=>"suave",doseAlertOffsetsForMode:()=>[30]},
  '@/lib/dose-alert-pause-m99p2':{getVaultDosePauseUntil:()=>null,shouldKeepOverdueReinforcement:(at,now)=>at.getTime()>now.getTime(),getVaultDoseSlotSnoozeUntilM99P3:()=>null},
};
function load(relative){
  const filename=path.join(root,relative),moduleRef=new Module(filename,module);
  moduleRef.filename=filename;moduleRef.paths=Module._nodeModulePaths(path.dirname(filename));
  moduleRef.require=name=>{if(Object.prototype.hasOwnProperty.call(mocks,name))return mocks[name];throw Error('Import inesperado em teste hermético: '+name)};
  const source=read(relative);
  const result=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,relative);
  moduleRef._compile(result.outputText,filename);
  return moduleRef.exports;
}
const scheduled=load('lib/dose-notifications.ts');
const overdue=load('lib/overdue-dose-notifications.ts');
const now=new Date(2026,10,17,8,0,0);
const med=(id,kind='temporario',person='p')=>({id,user_id:'u',person_id:person,nome:id,status:'ativo',tipo_uso:kind,estoque_quantidade:25,estoque_horarios:['09:00'],dosagem:'10mg'});
const temporary=med('curso');
const continuous=med('continuo','continuo');
const explicit=(date='2026-11-18',extra={})=>({id:`planned-${date}`,user_id:'u',person_id:'p',medicamento_id:'curso',data:date,horario:'09:00',dose_kind:'planned',motivo:'Tratamento temporário · 2026-11-18 · 1 dia(s)',...extra});
const recheck=async (medications,logs)=>{
  const input={personId:'p',medicamentos:medications,logs,now};
  await scheduled.reconcileScheduledDoseNotifications(input);
  await overdue.reconcileOverdueDoseNotifications(input);
};
const includes=(items,id,date)=>items.some(n=>(n.extra?.medicamentoId===id||(n.extra?.medicamentoIds||[]).includes(id))&&(!date||n.extra?.data===date));
(async()=>{
  await recheck([temporary],[]);
  ok(desiredScheduled.length===0,'temporário com estoque_horarios legado não produz recorrência sem curso');
  ok(pendingOverdue.length===0,'temporário sem agenda explícita não produz cobrança de atraso');

  await recheck([temporary],[explicit()]);
  ok(desiredScheduled.length===1&&includes(desiredScheduled,'curso','2026-11-18'),'curso explícito mantém exatamente o aviso da data prescrita');
  ok(pendingOverdue.length===1&&includes(pendingOverdue,'curso','2026-11-18'),'reforço de curso segue apenas slot planejado');
  ok(!includes(desiredScheduled,'curso','2026-11-19')&&!includes(pendingOverdue,'curso','2026-11-19'),'nenhuma recorrência após o último dia');

  await recheck([temporary],[explicit('2026-11-18',{tomado_em:'2026-11-18T09:00:00-03:00'})]);
  ok(desiredScheduled.length===0&&pendingOverdue.length===0,'tomada confirmada cancela aviso e reforço do slot, sem alterar evento');
  await recheck([temporary],[explicit('2026-11-18',{ignorado_em:'2026-11-18T10:00:00-03:00'})]);
  ok(desiredScheduled.length===0&&pendingOverdue.length===0,'ignorada explicitamente também resolve aviso, sem inferir tomada');

  await recheck([temporary],[explicit()]);
  await recheck([temporary],[]);
  ok(desiredScheduled.length===0&&pendingOverdue.length===0,'remover plano futuro desfaz alarmes antigos sem tocar em estoque ou histórico');

  await recheck([continuous],[]);
  ok(desiredScheduled.length===7,'medicamento contínuo mantém sete dias de horários canônicos');
  ok(pendingOverdue.length===7,'contínuo mantém reforços de atraso existentes');
  await recheck([temporary,continuous],[explicit()]);
  ok(includes(desiredScheduled,'curso','2026-11-18')&&includes(desiredScheduled,'continuo','2026-11-18'),'curso real pode coexistir com contínuo no mesmo horário');
  ok(!includes(desiredScheduled,'curso','2026-11-19'),'coexistência não transforma temporário em diário infinito');

  await recheck([temporary],[{...explicit(),person_id:'other'}]);
  ok(desiredScheduled.length===0&&pendingOverdue.length===0,'pessoa diferente não agenda o evento');
  native=false;
  await scheduled.reconcileScheduledDoseNotifications({personId:'p',medicamentos:[temporary],logs:[explicit()],now});
  ok(desiredScheduled.length===0,'modo PWA não aciona agendamento nativo (estado da prova permanece vazio)');
  native=true;
  console.log(`CI360 P6 P2 R3: ${checks} garantias reais de calendário Android sem IO clínico.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
