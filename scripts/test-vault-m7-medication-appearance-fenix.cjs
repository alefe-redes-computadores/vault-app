#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let n=0;const check=(b,label)=>{assert.ok(b,'M7: '+label);console.log(`✓ ${++n}: ${label}`)};
const files=[
 'app/saude/medicamentos/novo/page.tsx',
 'app/saude/medicamentos/editar/page.tsx',
 'components/saude/MedicationFormatPicker.tsx',
 'components/saude/MedicationIdentityColorPicker.tsx',
 'components/saude/HealthAvatar.tsx',
 'lib/health-profile/avatar-scene-geometry.ts',
 'components/hoje/TodayTimelineGuide.tsx',
 'scripts/test-v94-3-toast-medication-identity-contract.mjs',
];
for(const path of files){const source=read(path),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const errors=tree.parseDiagnostics.map(d=>{const p=tree.getLineAndCharacterOfPosition(d.start||0);return `${p.line+1}:${p.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`});check(errors.length===0,`TS/TSX: ${path}${errors.length?' '+errors.join('; '):''}`)}
const [create,edit,format,color,fenix,scene,today]=files.slice(0,7).map(read);
for(const [which,src] of [['Novo',create],['Editar',edit]]){
  check(src.includes('<MedicationFormatPicker')&&src.includes('<MedicationIdentityColorPicker')&&src.includes('onToggleColor={toggleCor}'),`${which}: formatos e cores delegados sem remover handlers`);
  check(!src.includes('CORES_DISPONIVEIS.map')&&!src.includes('FORMATOS_PRINCIPAIS.map'),`${which}: JSX duplicado removido`);
  check(src.includes('toggleMedicationIdentityColor(')&&src.includes('setIsFormatoModalOpen('),`${which}: controle original de duas cores e outros formatos preservado`);
}
check(format.includes('MEDICATION_PRIMARY_FORMATS')&&format.includes('MEDICATION_ADDITIONAL_FORMATS')&&format.includes('aria-pressed={isActive}'),'formato mantém seleção e catálogo canônico');
check(color.includes('MEDICATION_IDENTITY_COLORS')&&color.includes('type="color"')&&color.includes('aria-pressed={active}'),'paleta tem mesma origem e acessibilidade');
check(!/(?:\bdb\.|\bsupabase\b|\bfetch\(|\.insert\(|\.delete\(|\.put\()/.test(format+'\n'+color),'seletores não leem nem gravam dados');
check(fenix.includes('Consultar contexto do Brain sem mudar de página')&&fenix.includes('onClick={onBrainSelect}')&&fenix.includes('Ver contexto registrado · não é diagnóstico'),'Brain contextual com ressalva e CTA real');
check(fenix.includes('Toque na Fênix para ampliar.')&&fenix.includes('aria-label="Como usar o Avatar"'),'afordância de toque explícita');
check(scene.includes('new THREE.BoxGeometry(Math.max(backWidth,frontWidth),height,depth)')&&scene.includes('shadowCanvas.width=128;shadowCanvas.height=128')&&scene.includes('gradient.addColorStop(0,"rgba(0,0,0,.37)")')&&scene.includes('gradient.addColorStop(.58,"rgba(0,0,0,.08)")'),'geometria Android preservada e sombra mais suave');
check(today.includes('Doses futuras são previsões')&&today.includes('Somente uma confirmação registra tomada')&&today.includes('className="shrink-0 text-emerald-300"'),'Hoje mantém autoridade clínica e tom visual equilibrado');

// Exercise real extracted components, including event callbacks and semantics,
// with a deterministic JSX adapter (no React renderer or browser required).
const jsx=(type,props)=>({type,props:props??{}});
const runtime={jsx,jsxs:jsx,Fragment:'Fragment'};
const icon=()=>null;
const deps={
 'react/jsx-runtime':runtime,
 'lucide-react':{Package:icon},
 '@/lib/medications/form-presentation':{
   MEDICATION_PRIMARY_FORMATS:[{id:'a',label:'Comprimido',icon},{id:'b',label:'Gotas',icon}],
   MEDICATION_ADDITIONAL_FORMATS:[{id:'c',label:'Creme',icon}],
   MEDICATION_IDENTITY_COLORS:['#FFFFFF','#F97316','#60A5FA'],
 },
};
function load(path){const m=new Module(path,module);m.require=id=>{if(id in deps)return deps[id];throw Error('M7: import inesperado '+id)};m._compile(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,path);return m.exports;}
const f=load('components/saude/MedicationFormatPicker.tsx').MedicationFormatPicker;
const c=load('components/saude/MedicationIdentityColorPicker.tsx').MedicationIdentityColorPicker;
const selected=[];let more=0;
const flatten=nodes=>Array.isArray(nodes)?nodes.flatMap(flatten):nodes?[nodes,...flatten(nodes.props?.children)]:[];
const view=f({selectedFormat:'b',onSelect:x=>selected.push(x),onMore:()=>more++,columns:3});
const formatButtons=flatten(view).filter(x=>x.type==='button');
check(formatButtons.length===3&&formatButtons.filter(x=>x.props['aria-pressed']===true).length===1&&formatButtons[1].props['aria-pressed']===true,'formatos: seleção única e Mais independente');
formatButtons[0].props.onClick();formatButtons[2].props.onClick();
check(selected.join('|')==='a'&&more===1,'formatos: callbacks reais preservam seleção e modal');
let custom=[];const swatches=c({colors:['#F97316'],onToggleColor:hex=>custom.push(hex),density:'compact'});
const colorControls=flatten(swatches);const swatchButtons=colorControls.filter(x=>x.type==='button');
check(swatchButtons.length===3&&swatchButtons.filter(x=>x.props['aria-pressed']===true).length===1,'cores: selecionada única e catálogo compartilhado');
swatchButtons[0].props.onClick();
const input=colorControls.find(x=>x.type==='input'&&x.props.type==='color');
check(Boolean(input)&&input.props['aria-label']==='Cor personalizada do medicamento','cor personalizada tem alvo nativo acessível');
input.props.onChange({target:{value:'#abcdef'}});
check(custom.join('|')==='#FFFFFF|#ABCDEF','cores: cliques e input personalizado chegam normalizados ao handler canônico');
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.includes('"scripts/test-vault-m7-medication-appearance-fenix.cjs"')&&gate.includes('"scripts/test-vault-m6-hierarchy-fenix.cjs"')&&gate.includes('"scripts/test-vault-m5-document-form-fenix.cjs"'),'gate conserva M1–M6 e inclui M7');
console.log(`VAULT M7: ${n} testes de medicação, interfaces, Fênix e segurança aprovados.`);
