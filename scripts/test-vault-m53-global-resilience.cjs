#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const read = p => fs.readFileSync(p,'utf8');
let checks=0;
const ok=(x,desc)=>{assert.ok(x,'M53: '+desc);checks++;console.log('✓ M53 '+desc);};
const files=[
 'components/BottomNav.tsx','components/ToastProvider.tsx','components/Toast.tsx',
 'components/ErrorBoundary.tsx','components/SyncStatusIndicator.tsx','components/GlobalSyncIssueAlert.tsx',
 'lib/ui/toast-lifecycle.ts'
];
for(const file of files){
 const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(parsed.parseDiagnostics.length===0,'TS/TSX parse '+file);
}
const compile=p=>ts.transpileModule(read(p),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function load(path,mocks={}){
 const mod=new Module(path,module);
 mod.require=id=>{
  if(Object.prototype.hasOwnProperty.call(mocks,id))return mocks[id];
  throw new Error('M53 unexpected import '+id+' from '+path);
 };
 mod._compile(compile(path),path);
 return mod.exports;
}
const life=load('lib/ui/toast-lifecycle.ts').resolveToastDuration;
for(const [before,was,after,explicit,want] of [
 ['loading',0,'success',undefined,3000],['loading',0,'error',undefined,4000],
 ['loading',0,'info',undefined,3000],['loading',0,'loading',undefined,0],
 ['info',3000,'info',undefined,3000],['error',4000,'error',undefined,4000],
 ['success',3000,'loading',undefined,0],['success',3000,'error',undefined,3000],
 ['info',0,'success',undefined,3000],['error',0,'error',undefined,0],
 ['loading',0,'success',800,800],['loading',0,'error',6000,6000],
 ['success',3000,'loading',700,700],['loading',0,'success',-3,3000],
 ['loading',0,'error',Infinity,3000],['success',undefined,'success',undefined,3000],
 ])ok(life(before,was,after,explicit)===want,`toast lifecycle ${before}/${String(was)} -> ${after}/${String(explicit)} = ${want}`);
const nav=read(files[0]),provider=read(files[1]),toast=read(files[2]),boundary=read(files[3]),indicator=read(files[4]),alert=read(files[5]),gate=read('scripts/test-v63-release-gate.mjs');
for(const [source,needle,desc] of [
 [nav,'document.addEventListener("keydown", onKeyDown)','compose Escape listener installed only while open'],
 [nav,'document.removeEventListener("keydown", onKeyDown)','compose Escape listener cleaned'],
 [nav,'cancelAnimationFrame(frame)','compose autofocus frame cleaned'],
 [nav,'composeButtonRef.current?.focus()','compose Escape restores trigger focus'],
 [nav,'aria-modal="true"','compose action sheet has modal semantics'],
 [nav,'aria-expanded={composeOptions.length > 1 ? isComposeMenuOpen : undefined}','compose announces expanded state'],
 [nav,'event.key !== "Tab"','compose Tab stays inside dialog'],
 [nav,'env(safe-area-inset-bottom,0px)','compose respects Android bottom safe-area'],
 [nav,'setIsComposeMenuOpen(false);\n      return;','same tab click closes compose overlay'],
 [toast,'exitTimerRef.current !== null','toast owns animation completion timer'],
 [toast,'clearTimeout(exitTimerRef.current)','toast clears timers on unmount'],
 [toast,'type === "loading" || duration <= 0','indefinite toast cannot vanish instantly'],
 [toast,'role={type === "error" ? "alert" : "status"}','terminal toast announced as alert'],
 [provider,'resolveToastDuration(toast.type, toast.duration, data.type ?? toast.type, data.duration)','updates use lifecycle policy'],
 [boundary,'retry = () =>','error boundary supports non-reload retry'],
 [boundary,'this.setState({ hasError: false, error: null, errorInfo: null })','retry clears captured error'],
 [boundary,'window.location.reload()','full reload remains available as last resort'],
 [indicator,'!online && (failedCount > 0 || queueUnavailable || syncRuntime.phase === "error")','offline never masks sync failure'],
 [indicator,'Offline · revisar','offline incident is clearly actionable'],
 [alert,'pathname === "/diagnostico" || pathname === "/recuperacao"','global alert does not cover diagnosis/recovery'],
 [alert,'router.push("/diagnostico")','global alert retains canonical destination'],
 [gate,'scripts/test-vault-m52-sync-resilience.cjs','previous sync regression suite remains registered'],
 [gate,'scripts/test-vault-m53-global-resilience.cjs','M53 suite in release gate'],
 ]) ok(source.includes(needle),desc);
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}}),Fragment:'fragment'};
const Icon=function Icon(){return null};
const iconStub=new Proxy({},{get:()=>Icon});
const motionStub={motion:new Proxy({}, {get:(_t,key)=>'motion.'+String(key)}),AnimatePresence:Icon};
const flatten=(node)=>{
 if(Array.isArray(node))return node.flatMap(flatten);
 if(!node||typeof node!=='object')return [];
 return [node,...flatten(node.props?.children)];
};
const fakeReact={useState:v=>[v,()=>{}],useEffect:()=>{},useCallback:fn=>fn,useRef:v=>({current:v})};
let pushed=[],nowOnline=false,runtime={phase:'idle',error:null,lastSyncedAt:null},queue={failed:0,pending:0,total:0,unavailable:false};
const routing={useRouter:()=>({push:path=>pushed.push(path)}),usePathname:()=>'/hoje'};
const indicatorModule=load('components/SyncStatusIndicator.tsx',{
 react:fakeReact,'react/jsx-runtime':jsx,'next/navigation':routing,
 'lucide-react':iconStub,'@/hooks/useSyncQueueSummary':{useSyncQueueSummary:()=>queue},
 '@/lib/sync/runtime-status':{useVaultSyncRuntime:()=>runtime},
});
const previousNavigator=global.navigator;
try{
 Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:false}});
 let view=indicatorModule.SyncStatusIndicator({});
 ok(flatten(view).some(x=>x.props?.children==='Offline'),'normal offline remains informational');
 queue={failed:2,pending:1,total:3,unavailable:false};
 view=indicatorModule.SyncStatusIndicator({});
 const issue=flatten(view).find(x=>x.type==='button');
 ok(issue&&flatten(view).some(x=>x.props?.children==='Offline · revisar'),'failed queue visible even while offline');
 issue.props.onClick();
 ok(pushed.at(-1)==='/diagnostico','offline issue navigates to diagnostic');
 let custom=0;
 indicatorModule.SyncStatusIndicator({onOpenDiagnostics:()=>custom++}).props.onClick();
 ok(custom===1,'offline issue honors caller-owned diagnostic action');
 queue={failed:0,pending:0,total:0,unavailable:true};
 view=indicatorModule.SyncStatusIndicator({});
 ok(view.type==='button','unknown IndexedDB queue remains actionable offline');
 queue={failed:0,pending:0,total:0,unavailable:false};runtime={phase:'error',error:'pull failed',lastSyncedAt:null};
 view=indicatorModule.SyncStatusIndicator({});
 ok(view.type==='button','cloud error remains actionable offline');
} finally { if(previousNavigator===undefined)delete global.navigator;else Object.defineProperty(global,'navigator',{configurable:true,value:previousNavigator}); }
let currentPath='/hoje';
const alertModule=load('components/GlobalSyncIssueAlert.tsx',{
 'next/navigation':{useRouter:()=>({push:p=>pushed.push(p)}),usePathname:()=>currentPath},
 'react/jsx-runtime':jsx,'lucide-react':iconStub,
 '@/lib/sync/runtime-status':{useVaultSyncRuntime:()=>runtime},
 '@/hooks/useSyncQueueSummary':{useSyncQueueSummary:()=>queue},
});
queue={failed:1,pending:0,total:1,unavailable:false};
for(const path of ['/diagnostico','/recuperacao']){
 currentPath=path;ok(alertModule.GlobalSyncIssueAlert()===null,'do not obscure incident workflow '+path);
}
currentPath='/hoje';const activeAlert=alertModule.GlobalSyncIssueAlert();
ok(activeAlert?.type==='button','active failure shown on normal clinical pages');
activeAlert.props.onClick();ok(pushed.at(-1)==='/diagnostico','alert opens canonical diagnostic');
queue={failed:0,pending:0,total:0,unavailable:false};runtime={phase:'idle',error:null,lastSyncedAt:null};
ok(alertModule.GlobalSyncIssueAlert()===null,'healthy sync stays quiet');
const reactBoundary={Component:class{constructor(props){this.props=props;} setState(update){this.state={...this.state,...update};}}};
const Boundary=load('components/ErrorBoundary.tsx',{react:reactBoundary,'react/jsx-runtime':jsx,'lucide-react':iconStub}).ErrorBoundary;
const eb=new Boundary({children:'normal'});
ok(eb.render()==='normal','healthy child unaffected');
const err=new Error('failed render');
eb.state={...eb.state,...Boundary.getDerivedStateFromError(err)};
ok(eb.render()?.type==='div','failure renders recoverable boundary');
const retryNode=flatten(eb.render()).find(x=>x.type==='button'&&flatten(x).some(y=>y.props?.children==='Tentar novamente'));
// Button label includes an icon plus a text segment, so also verify the clear-state callback directly.
ok(typeof eb.retry==='function','retry is a real boundary operation');
eb.retry();
ok(eb.state.hasError===false&&eb.state.error===null&&eb.render()==='normal','retry restores children without reloading');
for(const code of [toast,provider,alert,indicator,nav,boundary])ok(!/\bdb\.\w+\.(?:add|delete|update|put|clear|bulkDelete|bulkPut)\(/.test(code),'modified UI contains no database writes');
console.log(`VAULT M53: ${checks} global resilience checks passed`);
