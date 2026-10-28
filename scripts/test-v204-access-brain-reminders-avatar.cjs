const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const read=file=>fs.readFileSync(file,'utf8');
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));m.require=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);m._compile(ts.transpileModule(read(filename),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}

const action=load('lib/medication-access-action.ts').medicationAccessAction;
const insight=motivo=>({deveRenovar:true,motivo,urgencia:'media',mensagem:'',diasAteRenovacao:null,diasRestantesEstoque:null});
assert.match(action(insight('receita'),'m','/').href,/nova-receita/);
assert.match(action(insight('sus'),'m','/').href,/retiradas\/nova/);
assert.match(action(insight('estoque'),'m','/',{tipoAquisicao:'sus'}).href,/retiradas\/nova/);
assert.match(action(insight('estoque'),'m','/',{tipoAquisicao:'gratuito'}).href,/renovacao\/nova/,'gratuito is not automatically SUS');
assert.match(action(insight('estoque'),'m','/',{tipoUso:'sos'}).href,/retiradas\/nova/,'V214: SOS stock planning uses a future commitment without inflating stock');
assert.match(action(insight('estoque'),'m','/',{tipoUso:'continuo'}).href,/renovacao\/nova/);
assert.equal(action({...insight('estoque'),deveRenovar:false},'m','/'),null);

const details=read('app/saude/medicamentos/detalhes/page.tsx');
assert(details.includes('medicationAccessAction('));
assert(!details.includes('? `/saude/documentos/novo?medicamento_id=${id}`'));
assert(!details.includes('? "Adicionar nova receita"'));
const home=read('app/page.tsx'),care=read('lib/health-intelligence/medication-care-opportunities.ts');
assert(home.includes('primaryMedicationCareOpportunity.actionHref'));
assert(home.includes('primaryMedicationCareOpportunity.actionLabel'));
assert(care.includes('actionLabel:')&&care.includes('careDecision.actionLabel'));
assert(care.includes('medicationAccessAction('),'legacy access routing remains available as compatibility input');
assert(care.includes('const today = getLocalTodayISO()'));

const alerts=read('components/MedicamentosNotifications.tsx');
assert(alerts.includes('const addAlert = (item: any)'));
assert(alerts.includes('const alertIndex = new Map<string, number>()'),'one indexed contextual card per medication');
assert(alerts.includes('router.push(alerta.href'));
assert(alerts.includes('Acesso e medicamentos'));

const scheduler=read('lib/health-reminders/event-scheduler.ts');
assert(scheduler.includes('settings.dateOnlyEventTime'),'date-only withdrawal uses the configurable operational time');
assert(scheduler.includes('(event.kind === "retirada" || event.kind === "compra") && !event.time'));
assert(scheduler.includes('Retirada')&&scheduler.includes('prevista para hoje'));
assert(scheduler.includes('notifyAt.getTime()'),'rescheduling must change notification fingerprint');

const avatar=read('components/saude/HealthAvatar3D.tsx');
assert(avatar.includes('V204: o plano central'));
assert(avatar.includes('const noseContour=mesh(taperedBox('));
assert(!avatar.includes('const noseContour=oval(materials.skin'));
assert(!avatar.includes('requestAnimationFrame(animate)'));

for(const file of ['app/saude/medicamentos/detalhes/page.tsx','components/MedicamentosNotifications.tsx','components/saude/HealthAvatar3D.tsx']){
  const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length,0,`syntax error: ${file}`);
}

let reconciled=[];
function loadScheduler(){
  const filename=path.resolve('lib/health-reminders/event-scheduler.ts'),m=new Module(filename,module);
  m.paths=Module._nodeModulePaths(path.dirname(filename));
  m.require=name=>{
    if(name==='@/lib/notification-preferences')return {isVaultNotificationCategoryEnabled:()=>true};
    if(name==='@capacitor/local-notifications')return {LocalNotifications:{checkPermissions:async()=>({display:'granted'})}};
    if(name==='@/lib/notification-brain')return {formatReminderOffset:value=>`${value} minutos antes`,getVaultNotificationBrainSettings:()=>({eventOffsets:{consulta:[60],exame:[60],retirada:[1440,60],compra:[1440,0]},dateOnlyEventTime:'09:00',stockReviewTime:'10:00',plannedPurchaseTime:'12:00'})};
    if(name==='@/lib/native-runtime')return {isVaultNative:()=>true};
    if(name==='@/lib/notifications')return {ensureVaultNotificationChannel:async()=>{},isNotificationPreferenceEnabled:()=>true,VAULT_NOTIFICATION_CHANNEL_ID:'vault'};
    if(name==='@/lib/notification-reconciliation')return {VAULT_NOTIFICATION_FINGERPRINT:'fingerprint',vaultNotificationFingerprint:parts=>parts.join('|'),reconcileVaultNotificationSet:async notifications=>{reconciled=notifications}};
    return require(name);
  };
  m._compile(ts.transpileModule(read(filename),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
  return m.exports;
}

(async()=>{
  const reconcile=loadScheduler().reconcileHealthEventNotifications;
  const base={id:'r',userId:'u',personId:'p',kind:'retirada',title:'Fenergan',date:'2099-12-31',status:'agendada',targetRoute:'/saude/retiradas/detalhes?id=r'};
  assert.equal(await reconcile(base?[base]:[]),2);
  assert.equal(reconciled.length,2);
  assert(reconciled.every(item=>item.title==='Retirada'));
  assert(reconciled.some(item=>item.body.includes('prevista para amanhã')));
  assert(reconciled.some(item=>item.body.includes('prevista para hoje')));
  assert(reconciled.every(item=>item.extra.fingerprint.includes('r')));
  assert.equal(await reconcile([{...base,status:'cancelada'}]),0);
  assert.equal(reconciled.length,0,'cancelled withdrawal removes owned pending reminders');
  console.log('V204 OK: contextual access, Brain action, deduplicated alerts, date-only withdrawal reminders and planar avatar nose');
})().catch(error=>{console.error(error);process.exitCode=1});
