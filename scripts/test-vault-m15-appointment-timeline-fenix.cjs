#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let total=0;
const ok=(v,message)=>{assert.ok(v,'M15: '+message);total++;};
const doseCard=read("components/hoje/TodayDoseTimelineCard.tsx");
const files=['app/hoje/page.tsx','components/hoje/TodayAppointmentCard.tsx','components/hoje/TodayDoseGroupHeading.tsx','components/home/HomeAlertRow.tsx','components/saude/HealthAvatar.tsx','lib/today/appointment-card-presentation.ts','lib/today/timeline-empty-copy.ts','lib/health-profile/avatar-visibility-policy.ts'];
for(const file of files){const sf=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(sf.parseDiagnostics.length===0,'TS/TSX syntax '+file);}
const today=read(files[0]),card=read(files[1]),group=read(files[2]),home=read(files[3]),fenix=read(files[4]),pure=read(files[5]),empty=read(files[6]),policy=read(files[7]);
ok(today.includes('<TodayAppointmentCard')&&today.includes('onOpen={() => navegarCompromisso(item)}')&&today.includes('medicamentosById.get(item.medicamento_id)'),'appointment navigation and owner-scoped medication reuse');
ok(!today.includes('const compromissoCancelado =')&&card.includes('WithdrawalPreparationView')&&pure.includes('item.status === "cancelada"'),'appointment presentation extracted; canonical statuses remain');
ok(today.includes('Compromissos do Dia')&&today.includes('compromissosFiltrados.length')&&today.includes('navegarCompromisso ='),'agenda and navigation remain on the Today page');
ok(today.includes('<TodayDoseGroupHeading')&&today.includes('const progresso = grupo.progress')&&group.includes('role="progressbar"'),'dose group shows existing memoized authority');
ok(today.includes('setMostrarConcluidas')&&today.includes('<TodayFilterPanel')&&
   today.includes('showResolved={mostrarConcluidas}')&&
   today.includes('onShowResolved={(value) => { trigger("vibrate"); setMostrarConcluidas(value); }}')&&
   today.includes('visibleTimelineItems(dosesFiltradas, { isToday: isHoje, status: filtroStatus, showResolved: mostrarConcluidas })')&&
   today.includes('const hasFiltrosAtivos ='),'historical toggle and filters retained');
ok(today.includes('emptyTimelineCopy.title')&&today.includes('emptyTimelineCopy.description')&&empty.includes('Nenhum slot para revisar neste dia'),'empty UI never erases scheduled slots');
ok(today.includes('await marcarDose(')&&today.includes('partitionDoseBatchByStock(')&&today.includes('buildTodayTimelineItems(')&&today.includes('setIsBatchTimeModalOpen'),'canonical dose batch/stock/actions untouched');
ok(doseCard.includes('describeTodayDoseStatus({')&&doseCard.includes('isHistoricoSemConfirmacao: Boolean(isHistoricoSemConfirmacao)'),'V242 and M14 historical-not-confirmed typings conserved');
ok(home.includes('getAlertBadgeLabel(')&&home.includes('router.push(')&&home.includes('trigger("vibrate")')&&home.includes('focus-visible:outline')&&home.includes('aria-label='),'Home alert remains reachable and accessible');
const v196=read('scripts/test-v196-progressive-shell-avatar.cjs');
ok(v196.includes('const appointmentCard = read("components/hoje/TodayAppointmentCard.tsx")') &&
   v196.includes('assert(today.includes("<TodayAppointmentCard")') &&
   v196.includes('assert(appointmentCard.includes("rounded-[20px] border p-3.5")') &&
   v196.includes('appointmentCard.includes("onClick={onOpen}")') &&
   card.includes('rounded-[20px] border p-3.5') &&
   card.includes('motion-reduce:transform-none'),
   'V196 validates both rendered Today appointment component and unchanged responsive touch target');

ok(fenix.includes('canMountAvatar3D({ready,expanded,mode,documentVisible,unavailable,size,previewVisible})')&&fenix.includes("const shouldMount3D=ready&&expanded&&mode==='3d'&&documentVisible&&!unavailable&&")&&fenix.includes("size==='expanded'||previewVisible")&&fenix.includes('renderAttempt')&&fenix.includes('IntersectionObserver'),'Fenix 3D keeps both inline V202/V325/V330/V333 fail-safe and pure policy, viewport, foreground and retry');
ok(fenix.includes('O Brain organiza registros para revisão.')&&fenix.includes('Ausência de confirmação não comprova tomada nem esquecimento')&&fenix.includes('Projeção não significa registro realizado.'),'Brain uncertainty is explicit, no clinical inference');
ok(!/\b(fetch\(|supabase|\bdb\.|localStorage|\.put\(|\.add\(|\.update\()/.test([card,group,pure,empty,policy].join('\n')),'new modules are purely visual with no database or API access');
// Load TS/TSX modules without app runtime; test clinical state priority in isolation.
const jsx=(type,props)=>({type,props:props||{}}), Icon=()=>null;
const ui={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':new Proxy({}, {get:()=>Icon}),react:{memo:fn=>fn},'framer-motion':{motion:{button:'motion.button'}}};
const agenda={isOverdueWithdrawal:(row,now)=>row.status==='agendada'&&row.data<now&&/^\d{4}-\d{2}-\d{2}$/.test(row.data||'')&&/^\d{4}-\d{2}-\d{2}$/.test(now||''),withdrawalDaysOverdue:(day,now)=>Math.max(0,Math.round((Date.parse(now+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000))};
function load(file,imports={}){const compiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const m=new Module(file,module);m.require=id=>{if(id in imports)return imports[id];throw Error('M15 unexpected import '+id+' in '+file)};m._compile(compiled,file);return m.exports;}
const pres=load(files[5],{'@/lib/withdrawal-agenda':agenda}).presentTodayAppointment;
const base={id:'w1',tipo:'retirada',data:'2026-10-21',status:'agendada',medicamento_nome:'A',horario:'09:00'};
ok(pres(base,'2026-11-02','Hoje').label==='Retirada pendente','overdue scheduled withdrawal stays pending');
ok(pres(base,'2026-11-02','Hoje').badge==='Atrasada · 12d','overdue counts days as calendar dates');
ok(!pres({...base,status:'realizada'},'2026-11-02','Hoje').overdue&&pres({...base,status:'realizada'},'2026-11-02','Hoje').badge==='Concluído','completed withdrawal never shown overdue');
ok(!pres({...base,status:'cancelada'},'2026-11-02','Hoje').overdue&&pres({...base,status:'cancelada'},'2026-11-02','Hoje').badge==='Encerrado','cancelled withdrawal never shown overdue');
ok(!pres({...base,status:'nao_realizada'},'2026-11-02','Hoje').overdue,'unperformed-and-closed never masquerades as pending');
ok(pres({...base,tipo:'consulta',status:'agendada'},'2026-11-02','Hoje').label==='Consulta agendada','visit not conflated with withdrawal');
ok(pres({...base,tipo:'cirurgia'},'2026-11-02','Hoje').label==='Procedimento cirúrgico','surgery keeps own classification');
ok(pres({...base,tipo:'exame'},'2026-11-02','Hoje').label==='Realização de exame','examination keeps own classification');
const Copy=load(files[6]).todayTimelineEmptyCopy;
ok(Copy({hasFilters:true,retroReview:false,isToday:true,isPast:false,selectedDateDescription:''}).title==='Nada com esses filtros','active filter empty is not no-data');
ok(Copy({hasFilters:false,retroReview:true,isToday:false,isPast:true,selectedDateDescription:''}).title==='Nenhum slot para revisar neste dia','retro review empty is not confirmed');
ok(Copy({hasFilters:false,retroReview:false,isToday:false,isPast:true,selectedDateDescription:'ontem'}).description.includes('previsões conhecidas'),'historical no-data not reported as skipped');
const can=load(files[7]).canMountAvatar3D,settings={ready:true,expanded:true,mode:'3d',documentVisible:true,unavailable:false,size:'expanded',previewVisible:false};
ok(can(settings)&&can({...settings,size:'compact',previewVisible:true}),'intentional visible 3D previews allowed');
ok(!can({...settings,size:'compact',previewVisible:false})&&!can({...settings,documentVisible:false}),'offscreen or background GPU prevented');
ok(!can({...settings,mode:'illustration'})&&!can({...settings,unavailable:true})&&!can({...settings,ready:false}),'illustration/error/unhydrated states block WebGL');
let pressed=0;
const Appointment=load(files[1],{...ui,'@/components/saude/MedicationFormatIcon':{MedicationFormatIcon:Icon},'@/components/saude/WithdrawalPreparationSummary':{WithdrawalPreparationView:Icon},'@/lib/today/appointment-card-presentation':{presentTodayAppointment:pres}}).TodayAppointmentCard;
const view=Appointment({item:base,medication:{},today:'2026-11-02',dayLabel:'Hoje',overview:null,onOpen:()=>pressed++});
ok(view.type==='motion.button'&&view.props.ariaLabel===undefined&&typeof view.props['aria-label']==='string'&&view.props['aria-label'].includes('Retirada pendente'),'appointment card narrates state to screen reader');
view.props.onClick();ok(pressed===1,'appointment navigation delegated once');
const Group=load(files[2],ui).TodayDoseGroupHeading;
const g=Group({icon:Icon,label:'Atrasadas',description:'Registros em aberto',completed:1,total:4,progress:25});
ok(g.props.children!==undefined,'memoized group heading stays renderable');
const gate=read('scripts/test-v63-release-gate.mjs');for(let m=1;m<=15;m++)ok(gate.includes(`test-vault-m${m}-`),'gate cumulativo M'+m);
console.log(`VAULT M15: ${total} structural/behavioral checks passed`);
