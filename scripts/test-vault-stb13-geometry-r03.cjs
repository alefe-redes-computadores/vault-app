'use strict';
// Exercise the real hook with deterministic DOM/RAF doubles; full Chromium matrix is separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function run(){
 const read=p=>fs.readFileSync(p,'utf8');
 const providers=read('components/Providers.tsx'),css=read('app/globals.css');
 assert.equal((providers.match(/<VaultAdaptiveFooterR03\s*\/>/g)||[]).length,1,'single mounted geometry authority');
 assert(providers.includes('min-h-screen pb-24 vault-app-shell-r03'));
 assert(css.includes('VAULT_R4_RESPIRO_GLOBAL')&&css.includes('padding-bottom: calc(8rem + env(safe-area-inset-bottom'),'legacy fallback preserved');
 assert(css.includes('var(--vault-footer-obstruction-r03)')&&css.includes('data-vault-footer-r03="ready"'));
 for(const p of ['app/page.tsx','components/vital/VitalScreen.tsx'])assert(read(p).includes('vault-adaptive-tail'),p);
 let nav=null,fab=null,tail=true,mutation,resize,cleanup,frames=new Map(),id=0,clock=0,props=new Map(),attrs=new Map(),events=new Map(),height=720,width=390,sets=0;
 class Element {
  constructor(kind,parent=null){this.kind=kind;this.parentElement=parent;this.css={visibility:'visible',display:'block',opacity:'1'};this.r={top:0,bottom:720,left:0,right:390,width:390,height:720};}
  contains(x){while(x){if(x===this)return true;x=x.parentElement;}return false;}
  querySelector(s){if(s==='nav.vault-bottom-nav')return nav;if(s==='button.absolute')return fab;if(s==='.vault-adaptive-tail')return tail?main:null;return null;}
  matches(s){return s.includes(this.kind==='nav'?'nav.vault-bottom-nav':this.kind==='fab'?'nav.vault-bottom-nav button':this.kind==='main'?'.vault-adaptive-tail':'!none');}
  closest(s){return this.kind==='nav'||this.kind==='fab'?nav:null;}
  getBoundingClientRect(){return this.r;}
  getAttribute(k){return k==='style'?[...props].map(([a,b])=>`${a}: ${b};`).join(' '):attrs.get(k)??null;}
  setAttribute(k,v){attrs.set(k,v);}
  hasAttribute(k){return attrs.has(k);}
  removeAttribute(k){attrs.delete(k);}
 }
 const html=new Element('html'),body=new Element('body',html),shell=new Element('shell',body),main=new Element('main',shell);
 Object.defineProperties(html,{clientHeight:{get:()=>height},clientWidth:{get:()=>width}});
 shell.style={getPropertyValue:k=>props.get(k)||'',setProperty(k,v){sets++;props.set(k,v);},removeProperty:k=>props.delete(k)};
 const document={documentElement:html,body,querySelector:s=>s==='.vault-app-shell-r03'?shell:null,addEventListener:(n,fn)=>events.set(n,fn),removeEventListener:n=>events.delete(n)};
 const listeners=new Map(),window={addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k),visualViewport:{addEventListener:(k,v)=>listeners.set('vv-'+k,v),removeEventListener:k=>listeners.delete('vv-'+k)}};
 class MutationObserver{constructor(fn){mutation=fn}observe(){}disconnect(){mutation=null}}
 class ResizeObserver{constructor(fn){resize=fn}observe(){}disconnect(){}}
 const m={exports:{}},source=ts.transpileModule(read('components/VaultAdaptiveFooterR03.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});assert(!source.diagnostics.length);
 vm.runInNewContext(source.outputText,{exports:m.exports,module:m,require:id=>{assert.equal(id,'react');return {useEffect:fn=>{cleanup=fn()}}},Element,document,window,MutationObserver,ResizeObserver,getComputedStyle:n=>n.css,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:i=>frames.delete(i),performance:{now:()=>clock}},{timeout:5000});
 const step=()=>{clock+=16;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(clock));};
 const rect=(n,t,b)=>{n.r={top:t,bottom:b,left:0,right:390,width:390,height:b-t}};
 const mod=(n,oldValue='')=>mutation([{type:'attributes',attributeName:'class',target:n,oldValue}]);
 const child=(target,addedNodes=[],removedNodes=[])=>mutation([{type:'childList',target,addedNodes,removedNodes}]);
 const reserve=()=>props.get('--vault-footer-obstruction-r03');
 let n=0;const check=(label,expected,ready=true)=>{step();assert.equal(reserve(),`${expected}px`,label);assert.equal(attrs.get('data-vault-footer-r03')==='ready',ready,label);n++;};
 m.exports.VaultAdaptiveFooterR03();check('no nav',0);
 nav=new Element('nav',shell);rect(nav,656,720);child(shell,[nav]);check('mount nav',64);
 fab=new Element('fab',nav);rect(fab,600,656);child(nav,[fab]);check('mount fab',120);
 fab.css.visibility='hidden';mod(fab);check('visibility hidden',64);
 fab.css.visibility='visible';mod(fab);check('visible',120);
 nav.css.opacity='0';mod(nav);check('ancestor opacity zero',0);
 nav.css.opacity='1';mod(nav);check('opacity restored',120);
 rect(nav,680,744);rect(fab,624,680);mod(nav);check('transform partial',96);
 events.get('transitionrun')({target:nav,type:'transitionrun',propertyName:'transform'});rect(nav,900,964);rect(fab,844,900);check('transition offscreen',0);assert(frames.size>0);
 events.get('transitionend')({target:nav,type:'transitionend',propertyName:'transform'});check('transition end',0);assert.equal(frames.size,0);
 rect(nav,656,720);rect(fab,600,656);mod(nav);check('restored',120);
 const removed=fab;fab=null;child(nav,[],[removed]);check('unmount fab',64);
 height=400;rect(nav,336,400);listeners.get('vv-resize')();check('keyboard layout resize',64);
 const old=nav;nav=null;child(shell,[],[old]);check('unmount nav',0);
 tail=false;mod(main,'vault-adaptive-tail');check('legacy route fallback',0,false);
 tail=true;mod(main);check('marked route',0);
 const before=sets;mutation([{type:'attributes',attributeName:'style',target:shell,oldValue:''}]);assert.equal(frames.size,0);assert.equal(sets,before);n++;
 child(main,[new Element('clinical-card',main)]);assert.equal(frames.size,0);n++;
 cleanup();assert.equal(frames.size,0);assert.equal(reserve(),undefined);assert.equal(attrs.has('data-vault-footer-r03'),false);assert.equal(events.size,0);assert.equal(listeners.size,0);n++;
 console.log(`STB13_GEOMETRY_BEHAVIOR_PASS=${n} (DOM doubles; browser/Android QA separate)`);
 return n;
}
module.exports=run;
if(require.main===module)run();
