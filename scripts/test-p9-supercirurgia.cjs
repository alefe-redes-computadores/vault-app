#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=process.cwd();
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
const files=[
'app/saude/medicamentos/page.tsx',
'components/saude/MedicationPortfolioOverview.tsx',
'lib/health-intelligence/medication-portfolio.ts',
'components/saude/ClinicalCollectionGroup.tsx',
'app/page.tsx','app/hoje/page.tsx',
'components/saude/HealthAvatar3D.tsx',
'lib/home/home-pending-brief.ts',
'lib/today/dose-batch-stock.ts',
];
for(const file of files){
 const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,`${file}: valid TS/TSX`);
}
const med=read(files[0]);const overview=read(files[1]);const portfolio=read(files[2]);const group=read(files[3]);
const home=read(files[4]);const today=read(files[5]);const avatar=read(files[6]);
assert(med.includes('V334_VISIBLE_MEDICATION_FILTERS')&&med.includes('Mais filtros')&&med.includes('Outras categorias de medicamentos'), 'seven medication filters retained');
assert(med.includes('aria-pressed={medicationFilter === value}')&&med.includes('aria-pressed={medicationFilter===value}'), 'filter selection remains accessible');
assert(med.includes('medicationFilter === "todos" ? <details')&&med.includes('Ir para um grupo'),'duplicate primary/secondary navigation collapsed');
assert(med.includes('<MedicationPortfolioOverview')&&med.includes('medsSOS.map(renderCard)'),'care overview and real SOS cards kept');
assert(med.includes('density="compact"')&&med.includes('rail={(regulatoryProfile || receita)'), 'compact cards and regulatory rail retained');
assert(overview.includes('text-[10px] font-bold uppercase')&&overview.includes('min-h-10'),'compact information hierarchy and actionable decision');
assert(overview.includes('ignored > 0')&&overview.includes('O percentual considera somente doses marcadas como tomadas'),'ignored doses never count as taken');
assert(overview.includes('Entender origens, doses e estados')&&overview.includes('portfolio.asNeeded > 0')&&overview.includes('portfolio.temporaryCoursesOpen > 0'),'all original disclosures remain');
assert(portfolio.includes('activeMedicationIds.has(item.medicationId)'), 'action counts only current active medications');
assert(group.includes('min-h-[52px]')&&group.includes('[content-visibility:auto]')&&group.includes('onToggle'),'shorter headers preserve progressive rendering');
assert(home.includes('buildHomePendingBrief(dosesPendentesAtrasadas)')&&home.includes('homePendingBrief.description'),'home uses traceable temporal evidence');
assert(home.includes('href: primaryCareCommand.href')&&home.includes('href: primaryMedicationCareOpportunity.actionHref'),'existing brain/action hierarchy retained');
assert(today.includes('partitionDoseBatchByStock(')&&today.includes('dosesSemEstoqueNoLote')&&today.includes('dosesComEstoqueNoLote'),'today module isolates stock partition without losing controls');
assert(today.includes('snapshotLote = [...dosesComEstoqueNoLote]')&&today.includes('dosesElegiveisLote.length > 1'),'idempotent batch controls remain');
assert(avatar.includes('P8: pele e olhos menos plastificados')&&avatar.includes('P9: transição de luz no rosto')&&avatar.includes('eyeHighlight: new THREE.MeshBasicMaterial({ color: "#e8f5f3", transparent: true, opacity: .42, depthWrite: false })')&&avatar.includes('opacity:.075')&&avatar.includes('renderer.forceContextLoss()')&&avatar.includes('avatarAdaptiveRatio(')&&!avatar.includes('requestAnimationFrame(function'),'P8/V273 eye & lens materials, P9 skin refinement, GPU budget and cleanup preserved');
const cache=new Map();
function load(rel){
 const file=path.resolve(root,rel);if(cache.has(file))return cache.get(file).exports;
 const m=new Module(file,module);m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);
 m.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):id.startsWith('./')?load(path.join(path.dirname(rel),id)+(path.extname(id)?'':'.ts')):require(id);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 return m.exports;
}
const {buildMedicationPortfolio}=load('lib/health-intelligence/medication-portfolio.ts');
const context={personId:'p',userId:'u',hoje:'2026-10-31',medicamentos:[
{id:'a',person_id:'p',user_id:'u',tipo_uso:'continuo',status:'ativo'},
{id:'b',person_id:'p',user_id:'u',tipo_uso:'sos',status:'ativo'},
{id:'old',person_id:'p',user_id:'u',tipo_uso:'continuo',status:'descontinuado'},
{id:'foreign',person_id:'other',user_id:'u',tipo_uso:'continuo',status:'ativo'}],doseLogs:[]};
const plan={items:[{medicationId:'a',lane:'now'},{medicationId:'a',lane:'prepare'},{medicationId:'b',lane:'discuss'},{medicationId:'old',lane:'now'},{medicationId:'foreign',lane:'now'}]};
const portfolioResult=buildMedicationPortfolio(context,plan,{items:[]});
assert.equal(portfolioResult.active,2);assert.equal(portfolioResult.needsAction,1);
assert.equal(portfolioResult.planned,1);assert.equal(portfolioResult.asNeeded,1);
const {partitionDoseBatchByStock}=load('lib/today/dose-batch-stock.ts');
const slots=[{id:'a',time:'23:00',empty:true},{id:'b',time:'23:00',empty:false}];
const divided=partitionDoseBatchByStock(slots,x=>x.empty);
assert.deepEqual(divided.withoutStock.map(x=>x.id),['a']);
assert.deepEqual(divided.withStock.map(x=>x.id),['b']);
assert.equal(slots.length,2,'both medicines remain independent');
const {buildHomePendingBrief}=load('lib/home/home-pending-brief.ts');
const result=buildHomePendingBrief([
{medicamentoId:'a',nome:'A',data:'2026-10-31',horario:'23:00',diaLabel:'Hoje'},
{medicamentoId:'b',nome:'B',data:'2026-10-31',horario:'23:00',diaLabel:'Hoje'}]);
assert.equal(result.simultaneousTimes,1);assert.match(result.description,/2 medicamentos às 23:00/);
assert.match(result.description,/Revise cada registro separadamente/);
console.log('VAULT P9: clinical hierarchy + screenshot density + active-only Brain + simultaneous SOS + safe batch + avatar OK');
