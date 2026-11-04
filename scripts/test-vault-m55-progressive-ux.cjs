#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
let checks=0;
function ok(condition,desc){assert.ok(condition,'M55: '+desc);checks++;}
const paths=[
 'hooks/useProgressiveReveal.ts','components/hoje/TodayRemindersPanel.tsx',
 'components/hoje/TodayUnscheduledRoutine.tsx','components/saude/UpcomingDoseAgenda.tsx',
 'components/home/HomeAgendaBreakdown.tsx','components/saude/MedicationPortfolioOverview.tsx',
 'components/hoje/TodayDoseGroupHeading.tsx','components/home/HomeQuickMetrics.tsx'
];
const content=Object.fromEntries(paths.map(p=>[p,fs.readFileSync(p,'utf8')]));
for(const path of paths){
 const sf=ts.createSourceFile(path,content[path],ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(sf.parseDiagnostics.length===0,'TypeScript parses '+path);
}
const has=(p,s,desc)=>ok(content[p].includes(s),desc);
const hook=content['hooks/useProgressiveReveal.ts'];
for(const [s,desc] of [
 ['state.identity === identity && state.first === first','pagination state reset immediately on owner/scope change or compact switch'],
 ['Math.max(0, Math.floor(total))','negative counts cannot leak into view'],
 ['Math.min(count, limit)','view never exceeds real list length'],
 ['Math.min(remaining, page)','next label is bounded by available records'],
 ['Math.min(count, visible + page)','user reveals only one bounded page'],
 ['const collapse =','user can collapse the view'],
 ])ok(hook.includes(s),desc);
has('components/hoje/TodayRemindersPanel.tsx','reminders.slice(0, reveal.visible)','reminder rows mounted only when revealed');
has('components/hoje/TodayRemindersPanel.tsx','isSafeLocalActionHref(reminder.target_route)','reminder routes still validated');
has('components/hoje/TodayRemindersPanel.tsx','disabled={!isSafeLocalActionHref(reminder.target_route)}','unsafe reminders remain disabled');
has('components/hoje/TodayRemindersPanel.tsx','aria-controls="today-reminders-list"','reminder pagination has accessible target');
has('components/hoje/TodayRemindersPanel.tsx','role="status"','hidden reminders announced without claiming dose completion');
has('components/hoje/TodayRemindersPanel.tsx','Lembretes não confirmam dose tomada, aquisição ou retirada.','no reminder clinical authority');
has('components/hoje/TodayUnscheduledRoutine.tsx','actionable.slice(0, reveal.visible)','unscheduled links mounted progressively');
has('components/hoje/TodayUnscheduledRoutine.tsx','medications.length','unscheduled count remains global');
has('components/hoje/TodayUnscheduledRoutine.tsx','Rotinas ativas sem horário válido não entram nas doses pendentes','missing hours not misclassified as missed doses');
has('components/hoje/TodayUnscheduledRoutine.tsx','Identificador indisponível','cannot navigate without valid ID');
has('components/saude/UpcomingDoseAgenda.tsx','const visible = all.slice(0, reveal.visible)','future agenda bounded');
has('components/saude/UpcomingDoseAgenda.tsx','{agenda.today.length + agenda.future.length}','future agenda retains total count');
has('components/saude/UpcomingDoseAgenda.tsx','Dose futura é planejamento','future is never taken or overdue');
has('components/saude/UpcomingDoseAgenda.tsx','all.map(item => item.key)','future list reset on changed slots');
has('components/home/HomeAgendaBreakdown.tsx','const detailsRef = useDismissibleDetails();','Home agenda closes outside and Escape');
has('components/home/HomeAgendaBreakdown.tsx','if (detailsRef.current) detailsRef.current.open = false;','Home agenda closes before navigation');
has('components/home/HomeAgendaBreakdown.tsx','homeAgendaUrgency(total, overdueWithdrawals)','Home agenda authority preserved');
has('components/saude/MedicationPortfolioOverview.tsx','const detailsRef = useDismissibleDetails();','medication disclosure closes outside and Escape');
has('components/saude/MedicationPortfolioOverview.tsx','medicationPortfolioCoherence(portfolio)','medication data quality preserved');
has('components/saude/MedicationPortfolioOverview.tsx','<MedicationScopeReconciliation','medication scope warning preserved');
has('components/hoje/TodayDoseGroupHeading.tsx','aria-valuemax={safeTotal > 0 ? safeTotal : 1}','empty group has valid progress range');
has('components/hoje/TodayDoseGroupHeading.tsx','aria-valuenow={safeCompleted}','group aria progress cannot exceed total');
has('components/home/HomeQuickMetrics.tsx','title={label}','small screen metrics retain full visible label by title');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
ok(gate.includes('scripts/test-vault-m55-progressive-ux.cjs'),'M55 registered in canonical release gate');
for(const prev of ['m54-dialog-guard','m53-global-resilience','m52-sync-resilience','m51-care-journey','m50-documents-workspace','m49-list-navigation']){
 ok(gate.includes(prev),'previous contract '+prev+' preserved');
}
// Exercise the *compiled hook* with a minimal real useState state model.
const compile=(p)=>ts.transpileModule(content[p],{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function load(path,imports){const m=new Module(path,module);m.require=id=>{if(id in imports)return imports[id];throw Error('Unexpected M55 import '+id+' in '+path)};m._compile(compile(path),path);return m.exports}
const state={slots:[],cursor:0};
const react={useState(initial){const i=state.cursor++;if(!(i in state.slots))state.slots[i]=typeof initial==='function'?initial():initial;return [state.slots[i],v=>{state.slots[i]=typeof v==='function'?v(state.slots[i]):v}]},useMemo:fn=>fn(),memo:fn=>fn};
const {useProgressiveReveal}=load('hooks/useProgressiveReveal.ts',{react});
function render(identity,total,first=3,step=4){state.cursor=0;return useProgressiveReveal(identity,total,first,step)}
let page=render('owner-a|day-one',15);
ok(page.visible===3&&page.remaining===12&&page.nextCount===4&&!page.expanded,'initial view shows only three of 15');
page.showMore();page=render('owner-a|day-one',15);
ok(page.visible===7&&page.remaining===8&&page.expanded,'first action exposes exactly four more');
page.showMore();page=render('owner-a|day-one',15);
ok(page.visible===11&&page.remaining===4,'second action increments in bounded steps');
page.showMore();page=render('owner-a|day-one',15);
ok(page.visible===15&&page.remaining===0&&page.nextCount===0,'last step includes all without overflow');
page.collapse();page=render('owner-a|day-one',15);
ok(page.visible===3&&!page.expanded,'collapse returns to compact default');
page.showMore();page=render('owner-b|day-one',15);
ok(page.visible===3&&!page.expanded,'person change instantly resets viewport');
page=render('owner-a|day-two',15);
ok(page.visible===3,'day change does not reveal old owner slots');
page=render('owner-a|day-one',2);
ok(page.visible===2&&page.remaining===0,'small list mounts all records');
page=render('owner-a|day-one',0);
ok(page.visible===0&&page.remaining===0,'empty list has no missing data');
page=render('owner-a|day-one',-10);
ok(page.visible===0&&page.remaining===0,'negative total cannot create negative state');
page=render('owner-a|day-one',NaN);
ok(page.visible===0&&page.remaining===0,'NaN total treated as empty display');
page=render('owner-a|day-one',6,2,3);
ok(page.visible===2&&page.nextCount===3,'compact mode respects its own first/step');
page.showMore();page=render('owner-a|day-one',6,2,3);
ok(page.visible===5&&page.remaining===1&&page.nextCount===1,'compact mode handles final partial page');
page.showMore();page=render('owner-a|day-one',6,2,3);
ok(page.visible===6&&page.remaining===0,'compact mode ends on exact count');
page=render('owner-a|day-one',3,2,3);
ok(page.visible===3&&page.remaining===0,'shrinking list never shows stale items');
// Render the real reminder and unscheduled components using their compiled JSX,
// the actual pagination hook, and safe local navigation mock. No persistence.
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}}),Fragment:'fragment'};
const icon=new Proxy({},{get:()=>function Icon(){return null}});
const flatten=(v)=>{if(Array.isArray(v))return v.flatMap(flatten);if(v==null||typeof v!=='object')return [];return [v,...flatten(v.props?.children)]};
const imports={react,'react/jsx-runtime':jsx,'lucide-react':icon,'@/hooks/useProgressiveReveal':{useProgressiveReveal}};
function resetHooks(){state.slots.length=0;state.cursor=0}
const reminders=load('components/hoje/TodayRemindersPanel.tsx',{...imports,'@/lib/navigation/safe-action-href':{isSafeLocalActionHref:p=>p.startsWith('/')}}).TodayRemindersPanel;
const items=Array.from({length:12},(_,i)=>({id:'r'+i,title:'Lembrete '+i,time:'10:00',target_route:i===4?'https://bad.example':'/hoje'}));
let pushed=[];resetHooks();let tree=reminders({reminders:items,onNavigate:p=>pushed.push(p)});
function reminderButtons(root){return flatten(root).filter(x=>x.type==='button'&&String(x.props['aria-label']||'').includes('Lembrete'))}
ok(reminderButtons(tree).length===3,'real reminder component initially mounts three rows');
ok(flatten(tree).some(x=>x.props['aria-label']==='12 lembrete(s) programado(s)'),'reminder count still reports all 12');
const more=flatten(tree).find(x=>x.props?.['aria-controls']==='today-reminders-list'&&x.props?.onClick);
ok(Boolean(more),'real reminder component exposes load-more control');
more.props.onClick();state.cursor=0;tree=reminders({reminders:items,onNavigate:p=>pushed.push(p)});
ok(reminderButtons(tree).length===7,'real reminder component incrementally mounts seven rows');
const bad=reminderButtons(tree).find(x=>x.props.disabled);
ok(Boolean(bad),'unsafe reminder remains disabled after pagination');
bad.props.onClick();ok(pushed.length===0,'unsafe reminder never navigates');
reminderButtons(tree)[0].props.onClick();ok(pushed.length===1&&pushed[0]==='/hoje','safe reminder navigates to caller-owned action');
state.cursor=0;tree=reminders({reminders:items.map((r,i)=>({...r,id:'another-'+i})),onNavigate:p=>pushed.push(p)});
ok(reminderButtons(tree).length===3,'real reminder component resets on changed record identities');
const unscheduled=load('components/hoje/TodayUnscheduledRoutine.tsx',imports).TodayUnscheduledRoutine;
resetHooks();const meds=Array.from({length:9},(_,i)=>({id:'m'+i,nome:'Remédio '+i}));
let edited=[];let medTree=unscheduled({medications:meds,onEdit:id=>edited.push(id)});
const medButtons=v=>flatten(v).filter(x=>x.type==='button'&&flatten(x).some(y=>y.props?.children==='Remédio 0'));
ok(flatten(medTree).filter(x=>x.type==='button'&&String(x.props.className||'').includes('bg-void/30')).length===3,'unscheduled component initially mounts three edit actions');
const medMore=flatten(medTree).find(x=>x.props['aria-controls']==='today-unscheduled-medications'&&x.props?.onClick);
ok(Boolean(medMore),'unscheduled list supports progressive load');
medMore.props.onClick();state.cursor=0;medTree=unscheduled({medications:meds,onEdit:id=>edited.push(id)});
ok(flatten(medTree).filter(x=>x.type==='button'&&String(x.props.className||'').includes('bg-void/30')).length===7,'unscheduled list mounts four more after action');
const medAction=flatten(medTree).find(x=>x.type==='button'&&String(x.props.className||'').includes('bg-void/30'));
medAction.props.onClick();ok(edited[0]==='m0','unscheduled edit action navigates with original medication ID');
state.cursor=0;medTree=unscheduled({medications:[{nome:'Sem ID'}],onEdit:id=>edited.push(id)});
ok(flatten(medTree).filter(x=>x.type==='button'&&String(x.props.className||'').includes('bg-void/30')).length===0,'missing medication IDs never create invalid edit targets');
// No clinical mutations introduced by visual-only release.
for(const p of paths.slice(1)){
 ok(!/\b(?:db\.|supabase\.|syncQueue\.)/.test(content[p]),'visual file avoids database access: '+p);
}
console.log('M55 PROGRESSIVE UX: '+checks+' verificações aprovadas.');
