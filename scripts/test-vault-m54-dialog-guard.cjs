#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
let checks = 0;
function ok(value, description) { assert.ok(value, 'M54: ' + description); checks++; }
const paths = [
  'hooks/useModalGuard.ts', 'components/ui/BottomSheet.tsx', 'components/SelectionModal.tsx',
  'components/ConfirmationModal.tsx', 'components/saude/SeletorCidModal.tsx',
  'components/UploadGaleriaModal.tsx', 'components/saude/ModalAlertaReceita.tsx',
];
const contents = Object.fromEntries(paths.map(p => [p, fs.readFileSync(p,'utf8')]));
for (const p of paths) {
  const sf = ts.createSourceFile(p, contents[p], ts.ScriptTarget.Latest, true, p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(sf.parseDiagnostics.length === 0, 'TypeScript parses ' + p);
}
const has = (path,needle,description) => ok(contents[path].includes(needle),description);
for (const p of paths.slice(1)) has(p,'useModalGuard','shared keyboard and scroll guard in '+p);
has('components/ui/BottomSheet.tsx','role="dialog"','bottom sheet dialog role preserved');
has('components/ui/BottomSheet.tsx','aria-modal="true"','bottom sheet accessible modal');
has('components/SelectionModal.tsx','ref={dialogRef}','selection dialog owns focus target');
has('components/SelectionModal.tsx','!isSubmittingQuick','selection cannot dismiss pending quick-create');
has('components/SelectionModal.tsx','!isSubmittingQuick && event.target === event.currentTarget','backdrop cannot dismiss pending quick-create');
has('components/SelectionModal.tsx','max-h-[min(90dvh,800px)]','selection viewport-aware height');
has('components/ConfirmationModal.tsx','canDismiss: !isLoading','confirmation loading cannot dismiss');
has('components/ConfirmationModal.tsx','event.target === event.currentTarget','confirmation backdrop cannot close on content');
has('components/saude/SeletorCidModal.tsx','aria-label="Selecionar CID"','CID picker accessible label');
has('components/saude/SeletorCidModal.tsx','overflow-y-auto overscroll-contain','CID picker scroll region');
has('components/UploadGaleriaModal.tsx','canDismiss: !isUploading','upload cannot be dismissed while saving');
has('components/UploadGaleriaModal.tsx','resetState();\n      onClose();','completed upload closes even while isUploading state was true');
has('components/UploadGaleriaModal.tsx','aria-label="Adicionar à Galeria"','gallery accessible role');
has('components/UploadGaleriaModal.tsx','max-h-[90dvh]','gallery respects viewport');
has('components/saude/ModalAlertaReceita.tsx','canDismiss: false','regulatory warning is not dismissible');
has('components/saude/ModalAlertaReceita.tsx','role="alertdialog"','regulatory warning remains explicit alert');
ok(!contents['components/ui/BottomSheet.tsx'].includes('previousOverflow'), 'bottom sheet cannot override shared body scroll lock');
ok(!contents['components/ConfirmationModal.tsx'].includes('window.addEventListener('), 'confirmation cannot register duplicate Escape listener');

// Pure behavioral harness runs the actual compiled hook with a mocked DOM and React dispatcher.
const effects=[];
const mockReact={useRef:initial=>({current:initial}),useEffect:fn=>effects.push(fn)};
const js=ts.transpileModule(contents['hooks/useModalGuard.ts'],{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const mod=new Module('/vault/hooks/useModalGuard.ts',module);
mod.require=id=>{if(id==='react')return mockReact;throw Error('unexpected hook import '+id)};
mod._compile(js,'/vault/hooks/useModalGuard.ts');
const {useModalGuard}=mod.exports;
let doc;
class Element {
  constructor(name){this.name=name;this.isConnected=true;this.tabIndex=0;this.hidden=false;this.entries=[];this.attrs={};this.focusCount=0;}
  focus(){this.focusCount++;doc.activeElement=this;}
  contains(el){return this.entries.includes(el) || this===el;}
  querySelectorAll(){return this.entries;}
  hasAttribute(k){return k==='hidden'?this.hidden:k in this.attrs;}
  getAttribute(k){return this.attrs[k]??null;}
  getClientRects(){return this.visible===false?[]:[{}];}
}
const handlers=new Set();const frames=new Map();let nextFrame=0;
doc={body:{style:{overflow:'auto'}},activeElement:new Element('trigger'),addEventListener:(type,fn)=>{if(type==='keydown')handlers.add(fn)},removeEventListener:(type,fn)=>handlers.delete(fn)};
global.HTMLElement=Element;global.document=doc;
global.window={requestAnimationFrame(fn){frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame(id){frames.delete(id)}};
function frame(){const f=[...frames.values()];frames.clear();f.forEach(x=>x())}
function key(name,shiftKey=false){const e={key:name,shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true}};for(const fn of [...handlers])fn(e);return e}
const trigger=doc.activeElement;
const dialogA=new Element('dialogA'),a1=new Element('a1'),a2=new Element('a2'); dialogA.entries=[a1,a2];
let closeA=0;
useModalGuard({open:true,dialogRef:{current:dialogA},onClose:()=>closeA++});
const cleanupA=effects.shift()();
ok(doc.body.style.overflow==='hidden','first modal locks body scrolling');
ok(handlers.size===1,'first modal installs exactly one handler');
frame();ok(doc.activeElement===dialogA,'initial focus moves to first modal without keyboard opening');
key('Tab');ok(doc.activeElement===a1,'Tab from dialog enters first tabbable element');
a2.focus();const eWrap=key('Tab');ok(eWrap.defaultPrevented&&doc.activeElement===a1,'Tab from last wraps to first');
a1.focus();const eReverse=key('Tab',true);ok(eReverse.defaultPrevented&&doc.activeElement===a2,'Shift+Tab from first wraps to last');
const dialogB=new Element('dialogB'),b1=new Element('b1'),b2=new Element('b2');dialogB.entries=[b1,b2];
let closeB=0;
useModalGuard({open:true,dialogRef:{current:dialogB},onClose:()=>closeB++});
const cleanupB=effects.shift()();
frame();ok(doc.activeElement===dialogB,'later modal gets focus when stacked');
ok(handlers.size===2 && doc.body.style.overflow==='hidden','two modal layers share one body lock');
const dismissB=key('Escape');ok(closeB===1 && closeA===0,'Escape affects topmost modal only');
ok(dismissB.defaultPrevented && dismissB.stopped,'Escape prevents background handling');
cleanupB();
ok(doc.body.style.overflow==='hidden','closing top layer keeps body locked');
ok(doc.activeElement===a2,'closing top layer restores underlying dialog focus');
const dismissA=key('Escape');ok(closeA===1,'after top layer closes, underlying layer handles Escape');
cleanupA();
ok(doc.body.style.overflow==='auto','final modal restores original body overflow');
ok(doc.activeElement===trigger,'last modal returns focus to original trigger');
ok(handlers.size===0 && frames.size===0,'all modal event handlers and frames removed');
// Modal cannot dismiss during upload or regulatory warning, but can still manage Tab.
const deny=new Element('deny'),d1=new Element('d1');deny.entries=[d1];let denyClose=0;
useModalGuard({open:true,dialogRef:{current:deny},onClose:()=>denyClose++,canDismiss:false});
const stopDeny=effects.shift()();frame();const e=key('Escape');
ok(denyClose===0&&!e.defaultPrevented,'nondismissable dialog never closes on Escape');
key('Tab');ok(doc.activeElement===d1,'nondismissable dialog retains keyboard trap');
stopDeny();
ok(doc.body.style.overflow==='auto','nondismissable cleanup unlocks scrolling');
// Detached and hidden targets are never selected for Tab.
const hidden=new Element('hidden');hidden.visible=false;const safe=new Element('safe');const dlg=new Element('filtered');dlg.entries=[hidden,safe];
useModalGuard({open:true,dialogRef:{current:dlg},onClose:()=>{}});const stopFiltered=effects.shift()();frame();key('Tab');
ok(doc.activeElement===safe,'Tab skips hidden or non-rendered controls');
stopFiltered();
ok(doc.body.style.overflow==='auto'&&handlers.size===0,'all keyboard and scroll resources released');

// Never require a change to persisted health data from a keyboard-only release.
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
has('components/UploadGaleriaModal.tsx','safeAddAnexoClinico({','existing gallery clinical persistence preserved');
has('components/UploadGaleriaModal.tsx','safeAddDocument({','existing gallery personal persistence preserved');
has('components/saude/ModalAlertaReceita.tsx','onForcar','regulatory user choice remains available');
ok(gate.includes('scripts/test-vault-m54-dialog-guard.cjs'), 'M54 integrated into canonical release gate');
console.log('M54 MODAL 360: '+checks+' verificações aprovadas.');
