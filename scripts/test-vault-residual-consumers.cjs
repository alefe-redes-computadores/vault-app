'use strict';
// Regression contract on the actual checkout, not pre/post fixture source.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const load=(p,resolve=()=>{throw Error('unexpected runtime dependency')},transform=s=>s)=>{const f=path.join(root,p),t=ts.transpileModule(transform(read(p)),{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});assert.equal((t.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,p);const m=new Module(f,module);m.require=resolve;m._compile(t.outputText,f);return m.exports};
const jsx=(type,props)=>({type,props:props||{}});const generic=new Proxy({}, {get:()=>()=>null});
const walk=(x,out=[])=>{if(Array.isArray(x))x.forEach(y=>walk(y,out));else if(x&&typeof x==='object'){out.push(x);walk(x.props?.children,out)}return out};const text=x=>Array.isArray(x)?x.map(text).join(' '):typeof x==='string'?x:x&&typeof x==='object'?text(x.props?.children):'';
let n=0;const check=(name,fn)=>{fn();n++;console.log('PASS',name)};
// Temporal reader and actual DoseGroup consumer (JSX mock, not DOM or Android).
const pure=load('lib/clinical-front-b-pure.ts'),authority=load('lib/dose-slot-authority.ts'),timeline=load('lib/clinical-record-timeline.ts',id=>{if(id==='@/lib/clinical-front-b-pure')return pure;if(id==='./dose-slot-authority')return authority;if(id==='./dose-premium/pharmaceutical-snapshot')return load('lib/dose-premium/pharmaceutical-snapshot.ts');if(id==='./dose-premium/historical-unit')return load('lib/dose-premium/historical-unit.ts');throw Error('unexpected timeline dependency '+id)});
const row=Object.freeze({id:'d',user_id:'u',person_id:'p',medicamento_id:'m',data:'2026-11-25',horario:'10:00',tomado_em:'2026-11-25T10:00:00Z',quantidade:5,dose_kind:'scheduled'}),med=Object.freeze({id:'m',user_id:'u',person_id:'p',nome:'Sintético',estoque_unidade_medida:'gotas'}),rec=Object.freeze({id:'r',user_id:'u',person_id:'p',categoria:'medicao',tipo:'peso',nome:'Registro',data:row.data,horario:''});
const event=(changes={},meds=[med])=>timeline.buildClinicalEvents([], [Object.freeze({...row,...changes})], meds)[0];const record=(changes={})=>timeline.buildClinicalEvents([Object.freeze({...rec,...changes})],[],[])[0];
check('missing clock not midnight',()=>assert.equal(timeline.clinicalEventClockLabel(record()),'Sem horário registrado'));
check('explicit midnight preserved',()=>assert.equal(timeline.clinicalEventClockLabel(record({horario:'00:00'})),'00:00'));
check('invalid civil time withheld',()=>assert.equal(record({horario:'24:00'}).time,''));
check('non-string civil time is unknown, not a crash',()=>{for(const clock of [false,0,{},null])assert.equal(record({horario:clock}).time,'')});
check('seconds remain in source',()=>{const e=record({horario:'17:42:59'});assert.equal(e.time,'17:42');assert.equal(e.record.horario,'17:42:59')});
check('date only not actual time',()=>assert.equal(event({tomado_em:row.data}).time,''));
check('invalid calendar date withheld',()=>assert.equal(event({tomado_em:'2026-02-30T10:00:00Z'}).time,''));
check('scheduled fallback explicitly identified as planned',()=>{const e=event({tomado_em:'invalid'});assert.equal(e.time,'');assert.equal(timeline.clinicalEventClockLabel(e),'Sem horário confirmado · Previsto 10:00')});
check('SOS with invalid timestamp does not assert planned time',()=>assert.equal(timeline.clinicalEventClockLabel(event({tomado_em:'invalid',dose_kind:'sos'})),'Sem horário registrado'));
check('legacy missing type not planned',()=>assert.equal(timeline.clinicalEventClockLabel(event({tomado_em:'invalid',dose_kind:undefined})),'Sem horário registrado'));
check('real confirmation converted with local timezone',()=>{const at='2026-11-25T12:00:00Z';assert.equal(event({tomado_em:at}).time,new Date(at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}))});
check('actual midnight preserved with explicit offset',()=>{const local=new Date(2026,10,25,0,0,0);assert.equal(event({tomado_em:local.toISOString()}).time,'00:00')});
check('offsetless timestamp is not confirmation',()=>{const e=event({tomado_em:'2026-11-25T00:00:00'});assert.equal(e.time,'');assert(e.subtitle.includes('Registro a conferir'));assert(!e.subtitle.includes('Quantidade registrada'))});
check('planned taken is factual under Macro02 authority',()=>{const e=event({dose_kind:'planned'});assert(e.subtitle.includes('Tomada registrada'));assert(e.subtitle.includes(row.tomado_em));assert(e.time)});
check('planned ignored is marked, not taken',()=>{const e=event({dose_kind:'planned',tomado_em:undefined,ignorado_em:row.tomado_em});assert(e.subtitle.includes('Dose ignorada — informada'));assert(!e.subtitle.includes('Quantidade registrada'));assert(e.time)});
check('double marker not confirmed or counted',()=>{const e=event({ignorado_em:row.tomado_em});assert.equal(e.time,'');assert(e.subtitle.includes('Registro a conferir'));assert(!e.subtitle.includes('Quantidade registrada'))});
check('invalid offset or impossible date does not become actual time',()=>{for(const at of ['2026-11-25T10:00:00-00:00','2026-11-25T10:00:00+25:00','2026-02-30T10:00:00Z']){const e=event({tomado_em:at});assert.equal(e.time,'');assert(e.subtitle.includes('Registro a conferir'))}});
check('planned fallback is explicitly scheduled',()=>assert.equal(timeline.clinicalEventClockLabel(event({dose_kind:'planned',tomado_em:'invalid'})),'Sem horário confirmado · Previsto 10:00'));
check('actual timestamp retains its own instant, slot date unchanged',()=>{const at='2026-11-26T01:30:00Z';const e=event({tomado_em:at});assert.equal(e.date,row.data);assert(e.subtitle.includes(at));assert.equal(e.dose.tomado_em,at)});
check('reference unavailable not removal',()=>assert.equal(event({},[]).title,'Referência do medicamento indisponível'));
check('group counts only known clocks',()=>assert.equal(timeline.clinicalDoseClockSummary([event(),event({tomado_em:'invalid'})]),'1 com horário · 1 sem horário'));
check('planned only excluded from historical events',()=>assert.equal(timeline.buildClinicalEvents([], [{...row,tomado_em:undefined,dose_kind:'planned'}],[med]).length,0));
const DoseGroup=load('app/saude/registros/page.tsx',id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:id==='@/lib/clinical-record-timeline'?timeline:generic,s=>{assert.equal(s.split('function DoseGroup({').length,2);return s.replace('function DoseGroup({','export function DoseGroup({')}).DoseGroup;
check('actual DoseGroup displays unknown and planned distinctly',()=>{const t=text(DoseGroup({events:[event(),event({id:'other',tomado_em:'invalid'})],safetyByDoseId:new Map()}));assert(t.includes('1 com horário · 1 sem horário'));assert(t.includes('Sem horário confirmado · Previsto 10:00'))});
check('actual DoseGroup does not invent midnight',()=>{const t=text(DoseGroup({events:[event({tomado_em:'invalid',horario:''})],safetyByDoseId:new Map()}));assert(t.includes('Sem horário registrado'));assert(!t.includes('00:00'))});
check('actual DoseGroup distinguishes planned origin from valid taken',()=>{const t=text(DoseGroup({events:[event({dose_kind:'planned'})],safetyByDoseId:new Map()}));assert(t.includes('Planejada · 1 tomada'));assert(t.includes('Tomada registrada'))});
check('actual DoseGroup flags conflicting raw markers',()=>{const t=text(DoseGroup({events:[event({ignorado_em:row.tomado_em})],safetyByDoseId:new Map()}));assert(t.includes('Programada · 1 a conferir'));assert(!t.includes('1 ignorada'));assert(!t.includes('1 tomada'))});
check('actual DoseGroup does not label legacy unknown origin scheduled',()=>{const t=text(DoseGroup({events:[event({dose_kind:undefined})],safetyByDoseId:new Map()}));assert(t.includes('Origem não informada · 1 tomada'));assert(!t.includes('Programada'))});
check('group mixed valid outcomes not inferred from first raw flag',()=>{const group=[event(),event({id:'ignored',tomado_em:undefined,ignorado_em:row.tomado_em}),event({id:'conflict',ignorado_em:row.tomado_em})];assert.equal(timeline.clinicalDoseGroupStateLabel(group),'Programada · 1 tomada · 1 ignorada · 1 a conferir')});
// Real editor handler extracted by AST from actual source. No save/discard writer invocation.
const returns=load('lib/navigation/return-context.ts'),editor=read('app/saude/medicamentos/editar/page.tsx');
const ast=ts.createSourceFile('editor.tsx',editor,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(ast.parseDiagnostics.length,0);const handlers=[];
function find(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='handleBack'&&n.initializer)handlers.push(n);ts.forEachChild(n,find)}find(ast);assert.equal(handlers.length,1);
const handler=ts.transpileModule('const '+handlers[0].getText(ast)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const run=(origin,changed=false,intent='menu')=>{const calls=[];const f=new Function('router','searchParams','hasChanges','editIntent','id','setShowConfirmExitModal','setEditIntent','safeReturnTarget','withReturnTarget',handler+'\nreturn handleBack;');f({replace:x=>calls.push(['replace',x])},new URLSearchParams(origin===null?{}:{return_to:origin}),changed,intent,'med/abc',x=>calls.push(['confirm',x]),x=>calls.push(['intent',x]),returns.safeReturnTarget,returns.withReturnTarget)();return calls};const detail='/saude/medicamentos/detalhes?id=med%2Fabc';
check('editor preserves Home and Today origin and ID',()=>{for(const origin of ['/','/hoje?tab=rotina#doses']){const u=new URL(run(origin)[0][1],'https://vault.local');assert.equal(u.searchParams.get('id'),'med/abc');assert.equal(u.searchParams.get('return_to'),origin)}});
check('direct entry stays at same detail',()=>assert.deepEqual(run(null),[['replace',detail]]));
check('dirty draft asks confirmation first',()=>assert.deepEqual(run('/',true,'basico'),[['confirm',true]]));
check('clean subsection goes to editor menu',()=>assert.deepEqual(run('/',false,'basico'),[['intent','menu']]));
check('encoded API/external origin and cycles denied',()=>{for(const origin of ['https://evil.test','//evil.test','/%61pi/foo','/%ZZ','/saude/medicamentos/editar?id=other','/saude/medicamentos/%64etalhes/?id=other'])assert.deepEqual(run(origin),[['replace',detail]])});
check('nested unsafe return stripped',()=>{const u=new URL(run('/hoje?f=1&return_to=https%3A%2F%2Fevil.test#doses')[0][1],'https://vault.local');assert.equal(u.searchParams.get('return_to'),'/hoje?f=1#doses')});
// Real visual consumers with synthetic resolver facts. Do not infer official composition.
const icons=new Proxy({}, {get:(_,name)=>name});let facts=[];const resolver={resolveMedicationKnowledgeM153P4:()=>({facts}),knowledgeAuthorityLabel:a=>({declared:'Declarado',official_exact:'Fonte oficial · correspondência exata',official_inferred:'Fonte oficial · inferido pelo catálogo',conflict:'Divergência para conferência',unknown:'Sem referência'})[a]};
const deps=id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id==='react'?{memo:x=>x}:id==='lucide-react'?icons:id.includes('knowledge-resolver')?resolver:id.includes('MedicationOfficialGuidance')?{MedicationOfficialGuidanceMacro1:'Guidance'}:id.includes('visual-copy')?{humanizeOfficialPresentation:x=>x}:assert.fail('dependency '+id);
const panel=load('components/saude/MedicationKnowledgePanelM153P4.tsx',deps).MedicationKnowledgePanelM153P4,summary=load('components/saude/MedicationCatalogIdentitySummary.tsx',deps).MedicationCatalogIdentitySummary;
const limit='Vínculos registrados; a completude da composição não foi certificada.';
for(const authority of ['declared','official_inferred','unknown','conflict','official_exact'])check('visible authority '+authority,()=>{facts=[{kind:'active_ingredient',label:'Princípio ativo',value:'Sintético',authority,limitation:limit,source:{label:'Fonte fixture',authority:'anvisa'},catalogVersion:'v-fixture',verifiedAt:'2026-11-25'}];const tree=panel({medication:med}),s=walk(tree).find(x=>x.type==='summary');assert(text(s).includes(resolver.knowledgeAuthorityLabel(authority)));assert.equal(walk(s).some(x=>x.type==='ShieldCheck'),authority==='official_exact');assert.equal(walk(s).some(x=>x.type==='TriangleAlert'),authority==='conflict');assert(text(s).includes(limit));assert(text(tree).includes('v-fixture'))});
check('catalog selection no false green confirmation',()=>{const tree=summary({canonicalName:'Exemplo',authorityLabel:'Não validado',divergent:false});assert(!JSON.stringify(tree).includes('emerald'));assert(text(tree).includes('Não validado'))});
check('composition limitation visible',()=>{const tree=summary({canonicalName:'Exemplo',authorityLabel:'Possível divergência',divergent:true,activeIngredients:['A','B']});assert(text(tree).includes('A + B'));assert(text(tree).includes('Completude da composição não certificada'));assert(text(tree).includes('Confira a referência selecionada'))});
check('no reference does not invent ingredient',()=>assert(!text(summary({canonicalName:'Exemplo',authorityLabel:'Confirmado',divergent:false})).includes('Princípio ativo')));

// R4 consolidated historical parity: exact Macro02 readers and the actual group component.
const historicalAt='2026-11-25T10:00:00Z',historical={schema:1,source:'cadastro_no_registro',captured_at:historicalAt,user_id:'u',person_id:'p',medicamento_id:'m',nome:'Nome histórico',dosagem:'10 mg/mL',formato:'gotas',forma_farmaceutica:'solução',cores:['#123456'],catalog_snapshot:null};
const hrow={farmaco_snapshot:historical,unidade_dose:'drop',unidade_dose_rotulo:null,fonte_unidade:'documented'};
check('historical identity and unit not current cadastro',()=>{const e=event(hrow,[{...med,nome:'Nome atual',dosagem:'50 mg'}]);assert.equal(e.title,'Nome histórico');assert(e.subtitle.includes('Cadastro no registro: Nome histórico · 10 mg/mL'));assert(e.subtitle.includes('5 gotas'));assert(!e.subtitle.includes('50 mg'))});
check('historical identity survives missing cadastro',()=>assert.equal(event(hrow,[]).title,'Nome histórico'));
check('current stock cannot change historical dose',()=>assert.equal(event(hrow).subtitle,event(hrow,[{...med,estoque_unidade_medida:'mL'}]).subtitle));
check('foreign snapshot rejected',()=>{const e=event({...hrow,farmaco_snapshot:{...historical,person_id:'other'}});assert.equal(e.title,med.nome);assert(!e.subtitle.includes('Nome histórico'));assert(e.subtitle.includes('snapshot histórico requer revisão'))});
check('foreign current reference rejected',()=>assert.equal(event({},[{...med,person_id:'other'}]).title,'Referência do medicamento indisponível'));
check('legacy unit unknown, not inferred from current stock',()=>{const e=event({farmaco_snapshot:historical});assert(e.subtitle.includes('unidade não informada'));assert(!e.subtitle.includes('5 gotas'))});
check('incomplete snapshot unit needs review',()=>assert(event({...hrow,fonte_unidade:null}).subtitle.includes('unidade requer revisão')));
check('ignored and conflicting markers cannot claim consumed quantity',()=>{for(const x of [{tomado_em:undefined,ignorado_em:historicalAt},{ignorado_em:historicalAt}])assert(!event({...hrow,...x}).subtitle.includes('5 gotas'))});
check('historical identity and raw snapshot immutable',()=>{const input=Object.freeze({...row,...hrow,farmaco_snapshot:Object.freeze({...historical})}),before=JSON.stringify(input);timeline.buildClinicalEvents([], [input], [med]);assert.equal(JSON.stringify(input),before)});
check('current cadastro fallback explicitly labeled',()=>assert(event().subtitle.includes('Cadastro atual · snapshot histórico ausente')));
check('actual group displays historical identity and avatar properties',()=>{const tree=DoseGroup({events:[event(hrow)],safetyByDoseId:new Map()});assert(text(tree).includes('Nome histórico'));assert(text(tree).includes('Cadastro no registro'));const icon=walk(tree).find(x=>x.props?.nome==='Nome histórico');assert(icon);assert.equal(icon.props.formato,'gotas');assert.deepEqual(icon.props.cores,['#123456'])});
const DayGroup=load('app/saude/registros/page.tsx',id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:id==='@/lib/clinical-record-timeline'?timeline:generic,s=>{assert.equal(s.split('function DayGroup({').length,2);return s.replace('function DayGroup({','export function DayGroup({')}).DayGroup;
check('actual day separates distinct historical visual identities',()=>{const a=event(hrow),b=event({...hrow,id:'second',farmaco_snapshot:{...historical,nome:'Outra identidade',formato:'cápsula',cores:['#654321']}}),c=event({...hrow,id:'third'});const groups=walk(DayGroup({date:row.data,label:'Dia',events:[a,b,c],forceOpen:true,onOpenRecord:()=>{},safetyByDoseId:new Map()})).filter(x=>Array.isArray(x.props?.events));assert.equal(groups.length,2);assert.deepEqual(groups.map(x=>x.props.events.length).sort(),[1,2])});
// R2 alias contract, actual shared M150 reader; preserve actual destination URL.
const safeAlias=load('lib/navigation/clinical-return-m150.ts',id=>{assert.equal(id,'@/lib/navigation/return-context');return returns}).safeClinicalReturnM150;
const C='/saude/medicamentos/detalhes',F='/saude/medicamentos';
const aliasCases=[['exact self',C,C,F,F],['encoded self',C.replace('detalhes','%64etalhes')+'?id=x',C,F,F],['trailing self',C+'/?id=x',C,F,F],['current trailing',C+'?id=x',C+'/',F,F],['current encoded',C,C.replace('detalhes','%64etalhes'),F,F],['both aliases',C.replace('detalhes','%64etalhes')+'/',C+'/',F,F],['fallback alias',null,C,C+'/', '/'],['fallback encoded',null,C,C.replace('detalhes','%64etalhes'), '/'],['root self','/', '/',F,F],['unicode alias','/saude/%C3%A1rea','/saude/área',F,F],['case distinct','/saude/Medicamentos/detalhes',C,F,'/saude/Medicamentos/detalhes'],['native distinct','/hoje/?tab=rotina#doses',C,F,'/hoje/?tab=rotina#doses'],['web distinct','/hoje?tab=rotina#doses',C,F,'/hoje?tab=rotina#doses'],['opaque ID','/saude/tratamentos/detalhes?id=a%2Fb#secao',C,F,'/saude/tratamentos/detalhes?id=a%2Fb#secao'],['external','https://outside.invalid',C,F,F],['encoded API','/%61pi/foo',C,F,F],['nested removed','/hoje?x=1&return_to=%2F',C,F,'/hoje?x=1'],['root valid','/',C,F,'/']];
for(const [name,target,current,fallback,want] of aliasCases)check('M150 '+name,()=>assert.equal(safeAlias(target,current,fallback),want));

// Real conditional JSX, independent of any DB or network.
{const src=read('app/saude/medicamentos/page.tsx'),sheetSrc=read('components/saude/MedicationSheet360R3.tsx');
const ast=ts.createSourceFile('medications.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),sheet=ts.createSourceFile('sheet.tsx',sheetSrc,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length,0);assert.equal(sheet.parseDiagnostics.length,0);
const nodes={},projections={},definitions={};
function setUnique(obj,key,val){assert(!Object.hasOwn(obj,key),'duplicate '+key);obj[key]=val;}
function attr(n,key){const a=(ts.isJsxElement(n)?n.openingElement:n).attributes.properties.find(a=>a.name?.getText(n.getSourceFile())===key);return a;}
function attrIs(n,key,val){const a=attr(n,key);return !!a&&!!a.initializer&&ts.isStringLiteral(a.initializer)&&a.initializer.text===val;}
function enclosingExpression(n){let p=n.parent;while(p&&!ts.isJsxExpression(p))p=p.parent;assert(p&&p.expression);return p.expression.getText(p.getSourceFile());}
function walkPage(n){
 if(ts.isJsxElement(n)){
  if(attr(n,'data-vault-v34x-receita-cadastro'))setUnique(nodes,'date',enclosingExpression(n));
  if(attr(n,'data-vault-r5-comfort-context'))setUnique(nodes,'comfort',enclosingExpression(n));
  if(attrIs(n,'data-vault-med360-entry','name'))setUnique(nodes,'header',n.getText(ast));
 }
 if(ts.isVariableDeclaration(n)&&['manufacturerH01','manufacturerEvidenceH01'].includes(n.name.getText(ast))){assert(n.initializer);setUnique(definitions,n.name.getText(ast),n.initializer.getText(ast));}
 if(ts.isCallExpression(n)&&n.expression.getText(ast)==='setMedicationSheet360'&&n.arguments.length===1&&ts.isObjectLiteralExpression(n.arguments[0])){
  for(const p of n.arguments[0].properties)if(ts.isPropertyAssignment(p)&&['prescriptionDate','prescriptionDocumentLinked','manufacturer','declaredManufacturer'].includes(p.name.getText(ast)))setUnique(projections,p.name.getText(ast),p.initializer.getText(ast));
 }
 ts.forEachChild(n,walkPage);
}
function walkSheet(n){
 if(ts.isJsxElement(n)&&attr(n,'data-vault-h01-document-evidence'))setUnique(nodes,'drawerDoc',enclosingExpression(n));
 if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(sheet)==='Field'&&attrIs(n,'label','Data da receita'))setUnique(nodes,'drawerDate',n.getText(sheet));
 if(ts.isFunctionDeclaration(n)&&n.name?.text==='toBrazilianDate')setUnique(definitions,'dateFormatter',n.getText(sheet));
 ts.forEachChild(n,walkSheet);
}
walkPage(ast);walkSheet(sheet);
assert.deepEqual(Object.keys(nodes).sort(),['comfort','date','drawerDate','drawerDoc','header']);
assert.deepEqual(Object.keys(projections).sort(),['declaredManufacturer','manufacturer','prescriptionDate','prescriptionDocumentLinked']);
assert.deepEqual(Object.keys(definitions).sort(),['dateFormatter','manufacturerEvidenceH01','manufacturerH01']);
assert(sheetSrc.includes('onClick={()=>navigate(value.detailHref)}')&&sheetSrc.includes('Abrir detalhes completos'),'document details remain reachable');
const code=definitions.dateFormatter+'\nconst manufacturerH01='+definitions.manufacturerH01+';\nconst manufacturerEvidenceH01='+definitions.manufacturerEvidenceH01+';\nconst value={'+Object.entries(projections).map(([k,v])=>k+':('+v+')').join(',')+'};\nconst result=['+['date','comfort','header','drawerDate','drawerDoc'].map(k=>'('+nodes[k]+')').join(',\n')+'];';
const transpiled=ts.transpileModule(code,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});assert.equal((transpiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const jsx=(type,props)=>({type,props:props||{}}),find=(tree,marker,val,out=[])=>{if(Array.isArray(tree))tree.forEach(x=>find(x,marker,val,out));else if(tree&&typeof tree==='object'){if(Object.hasOwn(tree.props||{},marker)&&(val===undefined||tree.props[marker]===val))out.push(tree);find(tree.props?.children,marker,val,out)}return out};
const visible=x=>Array.isArray(x)?x.map(visible).join(' '):typeof x==='string'?x:x&&typeof x==='object'&&!String(x.props?.className||'').split(/\s+/).includes('sr-only')?visible(x.props?.children):'';
function render(compact,declared,linked,last='Fabricante recente',label='Etiqueta antiga'){
 const calls=[];const ctx={exports:{},compactCards:compact,med:{nome:'Sintético',dosagem:'1 mg',data_receita:declared?'2026-11-25':'',laboratorio_etiqueta:label,tipo_aquisicao:'sus'},reconciliationP6:{hasDocumentEvidence:linked},latestManufacturer:last,supplyRoute:{mode:'sus'},showActiveIngredient:true,activeIngredient:'Componente QA',catalogIdentity:undefined,medicationListDisplayNameM150P3:name=>name,FileCheck2:'FileCheck2',CalendarClock:'CalendarClock',Factory:'Factory',ShoppingBag:'ShoppingBag',ChevronRight:'ChevronRight',Field:'Field',openMedicationSheet360:x=>calls.push(x),require:id=>{assert.equal(id,'react/jsx-runtime');return {jsx,jsxs:jsx}}};
 const {result,value}=new Function(...Object.keys(ctx),transpiled.outputText+'\nreturn {result,value};')(...Object.values(ctx));return {tree:result,value,calls};
}
const test=(name,fn)=>check('MED02 '+name,fn);const event=()=>({preventDefault(){},stopPropagation(){}});
for(const compact of [true,false])for(const declared of [true,false])for(const linked of [true,false])test(JSON.stringify({compact,declared,linked}),()=>{
 const {tree,value,calls}=render(compact,declared,linked);
 const dates=find(tree,'data-vault-v34x-receita-cadastro'),docs=find(tree,'data-vault-v34x-receita-documento'),button=find(tree,'data-vault-r5-context','receita'),mf=find(tree,'data-vault-h01-manufacturer'),header=find(tree,'data-vault-med360-entry','name');
 assert.equal(dates.length,!compact&&declared?1:0);assert.equal(docs.length,!compact&&linked?1:0);assert.equal(button.length,docs.length);assert.equal(mf.length,1);assert.equal(header.length,1);
 assert(visible(mf[0]).includes('Fabricante recente'));assert(!visible(mf[0]).includes('Etiqueta antiga'));assert(mf[0].props.title.includes('Etiqueta antiga')&&mf[0].props.title.includes('Fabricante recente'));
 assert.equal(find(header[0],'data-vault-h01-manufacturer').length,1);assert.equal(header[0].type,'button');header[0].props.onClick(event());assert.deepEqual(calls,['ficha']);
 if(button.length){assert.equal(button[0],docs[0]);button[0].props.onClick(event());assert.equal(calls.at(-1),'receita');}
 if(dates.length)assert(visible(dates[0]).includes('25/11/2026'));
 assert.equal(value.prescriptionDate,declared?'2026-11-25':null);assert.equal(value.prescriptionDocumentLinked,linked);assert.equal(value.manufacturer,'Fabricante recente');assert.equal(value.declaredManufacturer,'Etiqueta antiga');
 const drawerDate=find(tree,'label','Data da receita'),drawerDoc=find(tree,'data-vault-h01-document-evidence');assert.equal(drawerDate.length,1);assert.equal(drawerDate[0].props.value,declared?'25/11/2026':'Não informada');assert.equal(drawerDoc.length,1);const field=find(drawerDoc[0],'label','Vínculo documental');assert.equal(field.length,1);assert.equal(field[0].props.value,linked?'Documento vinculado':'Não localizado nos vínculos');
});
test('declared manufacturer retained if completed acquisition absent',()=>{for(const compact of [true,false]){const {tree,value}=render(compact,false,false,'','Etiqueta antiga');const m=find(tree,'data-vault-h01-manufacturer');assert.equal(m.length,1);assert(visible(m[0]).includes('Etiqueta antiga'));assert.equal(value.manufacturer,null);assert.equal(value.declaredManufacturer,'Etiqueta antiga');}});
test('no manufacturer invented',()=>{for(const compact of [true,false]){const {tree,value}=render(compact,false,false,'','');assert.equal(find(tree,'data-vault-h01-manufacturer').length,0);assert.equal(value.manufacturer,null);assert.equal(value.declaredManufacturer,null);}});
}

assert.equal(n,82,'All 42 R3 + 40 new R4 checks must execute');
console.log('RESIDUAL_CONSUMERS_PASS='+n+' (real source/AST and JSX mocks; no DOM/Android)');
