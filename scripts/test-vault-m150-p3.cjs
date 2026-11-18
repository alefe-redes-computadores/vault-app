#!/usr/bin/env node
'use strict';
/** UX-only tests. No clinical data, network, Supabase, IndexedDB or writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const files=[
 'app/saude/medicamentos/page.tsx','components/saude/MedicationFilterBar.tsx',
 'components/saude/MedicationProvenanceLineM150P3.tsx',
 'lib/medications/medication-list-provenance-m150-p3.ts',
 'lib/medications/medication-card-action-layout-m150-p3.ts',
 'lib/navigation/clinical-map-tones-m150-p3.ts',
 'lib/medication-regulatory-visual.ts','app/saude/mapa/page.tsx'
];
for(const file of files){const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(source.parseDiagnostics.length,0,file+' tem erros sintaticos');}
const load=(file,stubs={})=>{const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const m=new Module(file,module);m.require=id=>{if(id in stubs)return stubs[id];throw Error('Import inesperado: '+id)};m._compile(code,file);return m.exports;};
const {medicationListProvenanceM150P3:label,medicationListDisplayNameM150P3:displayName}=load('lib/medications/medication-list-provenance-m150-p3.ts');
assert.equal(displayName('PRYSTIQ 100mg'),'Pristiq 100mg');assert.equal(displayName('Venvanse 30mg'),'Venvanse 30mg');
const out=label({latestManufacturer:'Eurofarma',declaredManufacturer:'Cristália',acquisitionType:'comprado',routeMode:'hybrid',routeLabels:['SUS','Compra'],doseText:'1 cápsula'});
assert.equal(out.text,'Eurofarma · Comprado · cadastro · Dose 1 cápsula');
const hybridPublic=label({routeMode:'hybrid',acquisitionType:'sus',routeLabels:['SUS','Compra']});
assert.equal(hybridPublic.text,'SUS · cadastro');
assert(hybridPublic.evidence.includes('nenhuma comprova o fornecedor atual.'));
const hybridUnknown=label({routeMode:'hybrid'});
assert.equal(hybridUnknown.text,'Origens históricas');
assert(hybridUnknown.evidence.includes('nenhuma comprova o fornecedor atual.'));
const nonHybrid=label({routeMode:'private'});
assert.equal(nonHybrid.text,'Compra no histórico');
assert(out.hasDistinctManufacturers && out.evidence.includes('Cristália') && out.evidence.includes('Eurofarma') && out.evidence.includes('histórico'));
assert(!out.text.includes('Cristália') && !out.text.includes('SUS · Comprado'),'visivel tem so um fabricante, evidencia secundaria segue acessivel');
const unknown=label({});assert.equal(unknown.text,'');assert(unknown.evidence.includes('não informados'));
const historic=label({routeMode:'public'});assert.equal(historic.text,'SUS no histórico');
const {medicationCardActionLayoutM150P3:actions}=load('lib/medications/medication-card-action-layout-m150-p3.ts');
assert.deepEqual(actions({dose:true,care:true,stock:true,suspended:false,history:false}),{primary:'dose',secondary:['care','stock']});
assert.deepEqual(actions({dose:false,care:true,stock:true,suspended:false,history:false}),{primary:'care',secondary:['stock']});
assert.deepEqual(actions({dose:false,care:false,stock:true,suspended:false,history:false}),{primary:'stock',secondary:[]});
assert.deepEqual(actions({dose:true,care:true,stock:true,suspended:true,history:true}),{primary:null,secondary:['history','care','stock']});
const {clinicalMapToneM150P3:tone}=load('lib/navigation/clinical-map-tones-m150-p3.ts');
assert.equal(new Set(['medicamentos','tratamentos','exames','lembretes','brain','documentos'].map(tone)).size,6,'seis cores de dominio');
for(const id of ['medicamentos','ocorrencias','documentos','retiradas','studio'])assert(tone(id).includes('border-')&&tone(id).includes('bg-'));
const regulatory=load('lib/medication-regulatory-visual.ts',{'@/lib/medication-catalog/regulatory':{isMedicationRegulatoryRuleActive:()=>true}});
const blue=regulatory.getMedicationRegulatorySurface({tone:'blue',label:'Notificação B',detail:'Catálogo',verified:true,accent:'#60a5fa',badgeClass:'blue'});
const declared=regulatory.getMedicationRegulatorySurface({tone:'blue',label:'Receita azul informada',detail:'Cadastro',verified:false,accent:'#60a5fa',badgeClass:'declared'});
const unconfirmed=regulatory.getMedicationRegulatorySurface({tone:'unknown',label:'Não confirmada',detail:'Não confirmada',verified:false,accent:'#64748b',badgeClass:'unknown'});
assert.equal(blue.rail,'#3b82f6');assert.equal(declared.rail,'#60a5fa');assert.equal(unconfirmed.rail,'#64748b');
const special=regulatory.getMedicationRegulatorySurface({tone:'neutral',label:'Receita de controle especial',detail:'Catálogo',verified:true,accent:'#cbd5e1',badgeClass:'neutral'});
assert.equal(special.rail,'#cbd5e1');
const med=read('app/saude/medicamentos/page.tsx');
assert(med.includes('<MedicationProvenanceLineM150P3')&&!med.includes('source="ultima_aquisicao"'),'origens em linha unica');
assert(med.includes('medicationCardActionLayoutM150P3(')&&med.includes('actionLayoutM150P3.secondary.length>0')&&med.includes('setMedicationSheet360({')&&med.includes('controls,')&&med.includes('openMedicationSheet360("acoes")')&&read('components/saude/MedicationSheet360R3.tsx').includes('value.controls.map'),'acoes secundarias acessiveis na Gaveta 360 com os controles clinicos originais');
assert(med.includes('stockUnknown ? "Não informado" : medicationStockLabelM149('),'saldo desconhecido preservado');
assert(med.includes('isSuspendedSOSM147')&&med.includes('Registrar uso já ocorrido'),'registro suspenso so historico');
assert.equal((med.match(/aria-label="Escolher densidade dos cartões"/g)||[]).length,1,'controle de densidade unico');
const filter=read('components/saude/MedicationFilterBar.tsx');
assert(filter.includes('grid grid-cols-2 gap-1.5')&&filter.includes('min-h-11')&&filter.includes('break-words'),'filtros alinhados com altura tatil minima');
assert(filter.includes('event.key === "Escape"')&&filter.includes('aria-pressed={value === key}'),'controle acessivel');
const map=read('app/saude/mapa/page.tsx');
assert(map.includes('clinicalMapToneM150P3(entry.id)')&&map.includes('withReturnTarget(entry.href,\'/saude/mapa\')'),'diretorio preserva todos os destinos com cores por dominio');
const v63=read('scripts/test-v63-release-gate.mjs');assert.equal(v63.split('"scripts/test-vault-m150-p3.cjs"').length,2,'teste P3 cadastrado uma vez no release');
console.log('VAULT M150 P3: 24+ verificacoes de identidade, cores, acoes, stock, filtros e CI aprovadas');
