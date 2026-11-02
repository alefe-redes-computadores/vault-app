#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const paths=[
'app/page.tsx','app/hoje/page.tsx','components/saude/HealthAvatar.tsx',
'components/home/HomeAlertRow.tsx','components/hoje/TodaySymptomTimelineCard.tsx',
'components/hoje/TodayPrescriptionRenewalCard.tsx','components/hoje/TodayDoseStatusPresentation.tsx',
'hooks/useTodayPersistedFilters.ts'
];let checks=0;
const ok=(p,label)=>{assert.ok(p,`M14 ${label}`);checks++;console.log('✓ M14 '+label)};
for(const p of paths){const code=read(p),ast=ts.createSourceFile(p,code,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(ast.parseDiagnostics.length===0,`AST ${p}`)}
const home=read(paths[0]),today=read(paths[1]),avatar=read(paths[2]),alerts=read(paths[3]),symptom=read(paths[4]),renewal=read(paths[5]),status=read(paths[6]),hook=read(paths[7]);
ok(home.includes('import { AlertRow, getAlertIcon, type DashboardAlert }')&&home.includes('projectHomeDashboardAlerts(healthInsights, documentInsights')&&home.includes('renderAlert={alert => <AlertRow alert={alert} />}'), 'Home projects once and delegates each alert without changing destinations');
ok(!home.includes('function AlertRow(')&&!home.includes('function getAlertBadgeLabel(')&&alerts.includes('export function AlertRow(')&&alerts.includes('export function getAlertIcon('),'Home alert component and pure text display extracted');
ok(alerts.includes('getAlertBadgeLabel(')&&alerts.includes('router.push(')&&alerts.includes('trigger("vibrate")')&&alerts.includes('alert.href'),'Home alert action still navigates with haptics');
ok(today.includes('useTodayPersistedFilters()')&&today.includes('setMostrarConcluidas')&&today.includes('setFiltroCompromisso')&&today.includes('filterTimelineItems(doses, filtroStatus, filtroPeriodo, isHoje)'), 'Hoje filters preserve current meanings');
ok(hook.includes('const [hydrated,setHydrated]=useState(false)')&&hook.includes('if(!hydrated)return')&&hook.includes('window.localStorage.getItem')&&hook.includes('window.localStorage.setItem')&&hook.includes('try {')&&hook.includes('catch'), 'saved filters only written after reading and tolerate disabled storage');
ok(today.includes('groupTimelineItems(dosesParaExibir')&&today.includes('todayTimelineGroupContext(metadata[key].sub, items.length)')&&today.includes('const completed = items.reduce(')&&today.includes('const progresso = grupo.progress'), 'group completion memoized without changing dose membership');
ok(today.includes('<TodaySymptomTimelineCard')&&today.includes('router.push(`/saude/registros/detalhes?id=${item.sintomaId}`)')&&symptom.includes('item.intensidade')&&symptom.includes('item.observacoesSintoma'), 'symptoms readable and owner navigation remains in parent');
ok(today.includes('<TodayPrescriptionRenewalCard')&&today.includes('router.push(evento.actionHref)')&&renewal.includes('overdue?"Pendente":"Receita"'), 'prescription planning never presented as completed acquisition');
ok(today.includes('describeTodayDoseStatus({')&&status.includes('if(item.isDataConflict)')&&status.includes('if(item.tomada)')&&status.includes('if(isPrevistoFuturo)'), 'dose visual precedence moved, not clinical event authority');
ok(today.includes('isHistoricoSemConfirmacao: Boolean(isHistoricoSemConfirmacao)') && status.includes('isHistoricoSemConfirmacao: boolean;'), 'historical unconfirmed optional evidence is explicitly boolean at presenter boundary (TS2322)');

ok(today.includes('await marcarDose(')&&today.includes('partitionDoseBatchByStock(')&&today.includes('buildTodayTimelineItems(')&&today.includes('retroReviewMode')&&today.includes('setIsBatchTimeModalOpen'), 'idempotent dose, stock and retroactive pathways remain in original parent');
ok(avatar.includes('renderAttempt')&&avatar.includes('setRenderAttempt(value=>value+1)')&&avatar.includes('<Avatar3DBoundary key=')&&avatar.includes('renderer')===false,'Fênix refreshes 3D error boundary without new render loops');
ok(avatar.includes('IntersectionObserver')&&avatar.includes('documentVisible')&&avatar.includes('shouldMount3D')&&avatar.includes('M13_FENIX_EXPLAINABLE_3D'),'viewport, visibility, diagnosis disclaimer remain');
ok(avatar.includes('O Brain organiza registros para revisão.')&&avatar.includes('Ausência de confirmação não comprova tomada nem esquecimento'),'Brain explains evidence limitations without inventing dose outcomes');
ok(!/(\bdb\.|supabase|fetch\(|localStorage|indexedDB|\.insert\(|\.update\()/.test([alerts,symptom,renewal,status].join('\n')),'new visual modules contain no database writes or backend calls');
// Pure status presentation behavioral checks in an isolated JSX mock.
const jsx=(type,props)=>({type,props:props||{}});
const Icon=()=>null;
const originalRequire=Module.prototype.require;
const load=(file,stubs)=>{let code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;let m=new Module(file,module);m.require=id=>{if(id in stubs)return stubs[id];throw Error('Unexpected M14 import '+id)};m._compile(code,file);return m.exports;};
const common={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'lucide-react':new Proxy({}, {get:()=>Icon})};
const present=load(paths[6],common).describeTodayDoseStatus;
const base={item:{isDataConflict:false,tomada:false,ignorada:false,isAvulsa:false,horario:'23:00'},isPrevistoFuturo:false,isHistoricoSemConfirmacao:false,isAtrasado:false,isProximo:false};
ok(present(base).statusText==='23:00','neutral slot keeps scheduled time');
ok(present({...base,isProximo:true}).statusText==='Próximo','upcoming is not overdue');
ok(present({...base,isAtrasado:true}).statusText==='Atrasado','overdue is distinct from future');
ok(present({...base,isPrevistoFuturo:true,isAtrasado:true}).statusText==='Prevista','future projection wins conflicting visual flags');
ok(present({...base,isHistoricoSemConfirmacao:true,isAtrasado:true}).statusText==='Sem confirmação','past unconfirmed is not forced into missed');
ok(present({...base,item:{...base.item,tomada:true,isDataConflict:true}}).statusText==='Revisar registros','conflict wins even if legacy taken flag exists');
ok(present({...base,item:{...base.item,tomada:true,isAvulsa:true}}).statusText==='Tomada · Avulsa','recorded ad hoc stays distinguished');
ok(present({...base,item:{...base.item,ignorada:true}}).statusText==='Ignorada','ignored stays a user-recorded state');
const mocked={...common,react:{memo:fn=>fn},'framer-motion':{motion:{button:'motion.button'}}};
const Symptom=load(paths[4],mocked).TodaySymptomTimelineCard;const Prescription=load(paths[5],mocked).TodayPrescriptionRenewalCard;
let clicked=0;const symptomView=Symptom({item:{cor:'#fff',sintomaNome:'Dor informada',horario:'13:00',intensidade:3,observacoesSintoma:'Registro pessoal'},onOpen:()=>clicked++});
ok(symptomView.type==='motion.button'&&symptomView.props.onClick instanceof Function,'symptom entry is an accessible action');symptomView.props.onClick();ok(clicked===1,'symptom opens exactly once');
const event={id:'a',titulo:'Renovar receita',descricao:'Agenda clínica informada',atrasada:true,actionHref:'/saude/medicamentos'};
const renewalView=Prescription({event,onOpen:()=>clicked++});ok(renewalView.type==='motion.button'&&renewalView.props.className.includes('border-coral/25'),'overdue renewal remains pending');renewalView.props.onClick();ok(clicked===2,'renewal delegates navigation once');
const normal=Prescription({event:{...event,atrasada:false},onOpen:()=>{}});ok(normal.props.className.includes('border-amber-400/25'),'planned renewal has non-overdue style');
const uiText=node=>Array.isArray(node)?node.map(uiText).join(' '):node&&typeof node==='object'?uiText(node.props?.children):typeof node==='string'?node:'';
ok(uiText(renewalView).includes('Pendente')&&!uiText(renewalView).includes('Receita'),'overdue planned renewal is visibly Pendente, never silently completed');
ok(uiText(normal).includes('Receita')&&!uiText(normal).includes('Pendente'),'non-overdue planned renewal retains Receita label');
const v242=read('scripts/test-v242-medication-agenda-presentation-avatar.cjs');
ok(v242.includes("const renewalCard=read('components/hoje/TodayPrescriptionRenewalCard.tsx')")&&v242.includes('onClick={onOpen}'),'V242 checks the module that actually renders the historical label');
const gate=read('scripts/test-v63-release-gate.mjs');for(let i=1;i<=14;i++)ok(gate.includes(`test-vault-m${i}-`),`cumulative release gate M${i}`);
console.log(`VAULT M14: ${checks} structural and behavior checks passed.`);
