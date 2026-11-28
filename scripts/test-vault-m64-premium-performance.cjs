#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
let count = 0;
function check(ok, message) { assert.ok(ok, `M64: ${message}`); count++; }
function file(p) { return fs.readFileSync(p, 'utf8'); }
const files = [
 'hooks/useTodayOwnerData.ts', 'components/hoje/TodayRoutinePulse.tsx',
 'components/home/HomeDailyHero.tsx', 'components/saude/MedicationCareNetworkDetails.tsx',
 'components/home/HomeCommandCenter.tsx', 'components/saude/HealthAvatar.tsx',
 'app/saude/minha-saude/page.tsx', 'app/saude/medicamentos/page.tsx',
 'components/saude/ClinicalDisclosure.tsx','lib/medications/list-personal-accent.ts',
];
function load(p, imports={}) {
 const compiled = ts.transpileModule(file(p), { compilerOptions: {
  module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2021, jsx:ts.JsxEmit.ReactJSX,
  esModuleInterop:true,
 }, reportDiagnostics:true });
 check(!compiled.diagnostics.length, `transpila ${p}`);
 const m = new Module(path.resolve(p), module);
 m.require = id => Object.hasOwn(imports,id) ? imports[id] : require(id);
 m._compile(compiled.outputText,path.resolve(p));
 return m.exports;
}
for(const p of files){
 const source=file(p), f=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 check(!f.parseDiagnostics.length,`sem erro sintático ${p}`);
 check(!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["']/s.test(source),`M64 sem novo input nativo em ${p}`);
}
// H01: a repeated negative-balance prefix may be compacted only when an independent divergence alert remains visible.
const {MedicationOperationalStrip}=load('components/saude/MedicationOperationalStrip.tsx');
const negativeProps={today:{label:'Próxima dose às 20:00',detail:'',tone:'text-emerald-400'},stockLabel:'Saldo divergente: -2 comprimido',stockDetail:'',stockTone:'empty',doseOutcome:'unconfirmed',flowLayoutH01:true,alignedH01:true,compact:true};
const readStock=tree=>tree.props.children[1].props.children.props.children[1].props.children;
const compactNegative=MedicationOperationalStrip({...negativeProps,stockDivergenceAlertH01:true});
check(readStock(compactNegative)==='-2 comp.','H01 saldo negativo: valor e unidade sem alerta duplicado');
check(compactNegative.props['aria-label'].includes('Saldo divergente: -2 comprimido'),'H01 saldo negativo: evidência acessível integral');
check(readStock(MedicationOperationalStrip(negativeProps))==='Saldo divergente: -2 comp.','H01 saldo negativo: alerta não suprimido sem aviso independente');
check(file('app/saude/medicamentos/page.tsx').includes('stockDivergenceAlertH01={stockNegative && showStockBannerH01 && Boolean(stockReview || prescriptionReview360 || isEstoqueZerado)}'),'H01 saldo negativo: consumidor vincula compactação a alerta visível');
const accent = load('lib/medications/list-personal-accent.ts');
check(accent.medicationPersonalAccent({cor_principal:'#af2',cores:['#123456']})==='#AAFF22','cor principal do usuário tem prioridade');
check(accent.medicationPersonalAccent({cor_principal:'',cores:['#123456']})==='#123456','cor farmacêutica registrada é fallback');
check(accent.medicationPersonalAccent({cor_principal:'url(javascript:1)',cores:[]})===null,'CSS não confiável rejeitado');
check(accent.medicationPersonalAccent({cor_principal:'var(--unsafe)',cores:['red']})===null,'nomes e expressões não são injetados');
check(accent.medicationPersonalAccentStyle({cor_principal:'#cafe99'}).borderColor==='#CAFE9955','borda semântica translúcida');
check(accent.medicationPersonalAccentStyle({cor_principal:'bad'})===undefined,'sem cor não inventa borda');
const list=file('app/saude/medicamentos/page.tsx');
// M109 R2: verify the JSX ownership of the slim regulatory rail, not indentation.
// The visual accent is restricted to the icon and never takes over ListCard.color.
const listAst = ts.createSourceFile('medications-list.tsx',list,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const cards = [];
function visitList(node) {
 if (ts.isJsxOpeningElement(node) && node.tagName.getText(listAst) === 'ListCard') cards.push(node);
 ts.forEachChild(node,visitList);
}
visitList(listAst);
const cardColorAttribute = cards.length === 1 && cards[0].attributes.properties.find(attr =>
 ts.isJsxAttribute(attr) && attr.name.text === 'color');
const cardRailAttribute = cards.length === 1 && cards[0].attributes.properties.some(attr =>
 ts.isJsxAttribute(attr) && attr.name.text === 'rail');
check(Boolean(cardColorAttribute && ts.isJsxAttribute(cardColorAttribute) &&
 cardColorAttribute.initializer && ts.isJsxExpression(cardColorAttribute.initializer) &&
 cardColorAttribute.initializer.expression && ts.isIdentifier(cardColorAttribute.initializer.expression) &&
 cardColorAttribute.initializer.expression.text === 'regulatoryBorderColor' &&
 cardRailAttribute && list.includes('railSize="label"') &&
 list.includes('[writing-mode:vertical-rl]') &&
 (list.includes('setSelectedRegulatoryScope({medicationId: med.id || "", userId: treatmentOwner?.id || "", personId: activePersonId || ""})') && list.includes('med.id === selectedRegulatoryScope.medicationId') && list.includes('med.user_id === selectedRegulatoryScope.userId') && list.includes('med.person_id === selectedRegulatoryScope.personId') && list.includes('regulatoryProfiles[selectedRegulatoryMedication.id') && list.includes('selectedRegulatory && selectedRegulatoryMedication') && list.includes('onClick={closeRegulatoryModal}') && !list.includes('setSelectedRegulatory(regulatoryProfile)')) &&
 /const\s+regulatoryBorderColor\s*=\s*regulatoryCopy\.listRailColor\s*\?\?\s*regulatorySurface\.rail\s*;/.test(list) &&
 list.includes('aria-label={`Ver classificação da receita:')),
 'classificação na borda e etiqueta regulatória preservada via AST');
// GUARDIAN closure: execute the real consumer's expressions with the canonical
// catalogue, reconciliation, and surface modules; never substitute a pigment mock.
const vm = require('node:vm');
const regulatoryCatalog = load('lib/medication-catalog/regulatory.ts');
const regulatoryVisual = load('lib/medication-regulatory-visual.ts', {
 '@/lib/medication-catalog/regulatory': regulatoryCatalog,
});
const regulatoryPresentation = load('lib/medications/regulatory-copy-ux360.ts', {
 '../medication-regulatory-visual': regulatoryVisual,
});
const regulatoryEvidence = load('lib/health-intelligence/pharmalens-reconciliation-p6.ts');
const regulatoryInitializers = new Map();
function findRegulatoryInitializers(node) {
 if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
     ['regulatoryCopy','regulatorySurface','regulatoryBorderColor','regulatoryMeaning'].includes(node.name.text)) {
  assert.ok(node.initializer, `M64: ${node.name.text} sem expressão`);
  assert.ok(!regulatoryInitializers.has(node.name.text), `M64: autoridade duplicada ${node.name.text}`);
  regulatoryInitializers.set(node.name.text,node.initializer.getText(listAst));
 }
 ts.forEachChild(node,findRegulatoryInitializers);
}
findRegulatoryInitializers(listAst);
check(regulatoryInitializers.size === 4, 'quatro expressões reais de projeção regulatória');
function runRegulatoryCase({declaredType, code, linked=false, review=false, identity=code?'confirmed':'unvalidated', malformed=false, foreign=false}) {
 const source='ANVISA — referência sintética M64';
 const types={receita_comum:'comum',receita_controle_especial:'branca',notificacao_a:'amarela',notificacao_b:'azul',notificacao_b2:'azul'};
 const rule={prescriptionModelCode:code,vaultPrescriptionType:types[code],sources:[{label:source,authority:'anvisa'}],hasMalformedExceptions:malformed};
 const reference={regulatoryIdentity:{referenceType:'product'},regulatoryRules:code?[rule]:[]};
 const med={id:'med-a',user_id:'owner-a',person_id:'person-a',tipo_receita:declaredType,
   ...(linked?{document_id:'doc-a'}:{}),catalog_snapshot:{match_kind:'exact',reference}};
 const documents=linked?[{id:'doc-a',user_id:foreign?'owner-b':'owner-a',person_id:'person-a',type:'receita',title:'Documento sintético',entidade_tipo:'medicamento',entidade_id:'med-a'}]:[];
 const regulatoryProfile=regulatoryVisual.resolveMedicationRegulatoryVisual(med,reference,new Date('2026-11-28T12:00:00Z'));
 const reconciliationP6=regulatoryEvidence.reconcileMedicationP6({medication:med,documents,renewals:[],userId:'owner-a',personId:'person-a',regulatory:regulatoryProfile});
 const context={regulatoryProfile,reconciliationP6,catalogIdentity:{regulatoryNeedsReview:review,authorityState:identity},
  receita:{corBorda:'#ff00ff'},regulatoryCopyUX360:regulatoryPresentation.regulatoryCopyUX360,
  getMedicationRegulatorySurface:regulatoryVisual.getMedicationRegulatorySurface};
 for(const name of ['regulatoryCopy','regulatorySurface','regulatoryBorderColor','regulatoryMeaning']) {
  context[name]=vm.runInNewContext(regulatoryInitializers.get(name),context,{timeout:1000});
 }
 check(reconciliationP6.hasDocumentEvidence === (linked&&!foreign),'vínculo documental somente por titular e relação explícitos');
 check(context.regulatoryMeaning.includes(linked&&!foreign?'Documento de receita vinculado':'Documento de receita não localizado nos vínculos'),'proveniência documental no consumidor real');
 check(context.regulatoryCopy.validity==='Vínculo documental não comprova validade atual.','vínculo não comprova validade');
 return {copy:context.regulatoryCopy,color:context.regulatoryBorderColor,meaning:context.regulatoryMeaning,source,profile:regulatoryProfile};
}
const declaredMatrix=[['comum','#94a3b8','Comum · cad.'],['branca','#cbd5e1','Especial · cad.'],['azul','#60a5fa','Azul · cad.'],['amarela','#facc15','Amarela · cad.'],[null,'#64748b','REG. REVISÃO']];
for(const [declaredType,color,label] of declaredMatrix) for(const linked of [false,true]) {
 const registered=runRegulatoryCase({declaredType,linked});
 check(registered.color===color && registered.copy.listRail===label && !registered.copy.official && registered.copy.rail==='REG. PENDENTE',`cadastro/ausência ${declaredType}: cor, legenda e autoridade independentes`);
 if(declaredType) check(registered.meaning.includes('Cor da tarja: cadastro') && registered.meaning.includes('não representa confirmação oficial'),'proveniência explícita da cor cadastrada');
 else check(!registered.meaning.includes('Cor da tarja: cadastro'),'não inventa classificação ausente');
 for(const state of [{review:true},{identity:'possible_divergence'},{code:'notificacao_b',review:true},{code:'notificacao_b',malformed:true,review:true}]) {
  const disputed=runRegulatoryCase({declaredType,linked,...state});
  const catalogOnly=!declaredType&&state.code==='notificacao_b'&&!state.malformed;
  const knownWithoutClass=!declaredType&&state.code==='notificacao_b'&&state.malformed;
  check(disputed.color===(catalogOnly?'#3b82f6':color) && disputed.copy.review && !disputed.copy.official && disputed.copy.rail==='REG. REVISÃO' && disputed.copy.listRail===(catalogOnly?'Azul B · cat.':knownWithoutClass?'Cat. · s/ classe':label),'revisão mantém conhecimento independente sem promover autoridade');
  check(disputed.copy.listRailOrigin===(declaredType?'declared':catalogOnly?'catalog-review':knownWithoutClass?'catalog-identity':'unknown'),'origem real da identidade visual em revisão');
  if(catalogOnly)check(disputed.meaning.includes('referência do catálogo em conferência')&&disputed.meaning.includes('não representa confirmação oficial'),'catálogo em conferência não vira confirmação');
 }
}
const officialMatrix=[['receita_comum','comum','#94a3b8','Comum'],['receita_controle_especial','branca','#cbd5e1','Especial'],['notificacao_b','azul','#3b82f6','Azul B'],['notificacao_b2','azul','#3b82f6','Azul B2'],['notificacao_a','amarela','#eab308','Amarela']];
for(const [code,matching,color,label] of officialMatrix) for(const linked of [false,true]) {
 for(const declaredType of [matching,matching==='azul'?'amarela':'azul',null]) {
  const current=runRegulatoryCase({declaredType,code,linked});
  const conflict=Boolean(declaredType&&declaredType!==matching);
  check(current.color===color && current.copy.official && current.copy.listRail===label,`referência oficial ${code} preserva sua cor com ou sem cadastro/documento`);
  check(current.copy.source===current.source && current.meaning.includes(`Fonte: ${current.source}`),'fonte oficial real permanece explícita');
  check(current.copy.declarationConflict===conflict && current.meaning.includes('Cadastro diverge da referência.')===conflict,'divergência real preservada sem reclassificar cadastro');
  check(!current.meaning.includes('Cor da tarja: cadastro'),'cor oficial não é atribuída ao cadastro');
 }
}
for(const code of ['notificacao_retinoides','notificacao_talidomida']) for(const linked of [false,true]) {
 const special=runRegulatoryCase({declaredType:null,code,linked});
 check(special.color==='#fb7185' && special.copy.official && special.copy.listRail==='Especial' && special.copy.source===special.source,'notificação especial: cor oficial vermelha e fonte preservadas');
}
// H01 GOLD: no medication name branches; test the real resolver across class and evidence axes.
for(const [code,matching,color,label] of officialMatrix) {
 const partial=runRegulatoryCase({code,review:true,identity:'compatible'});
 check(!partial.copy.official && partial.copy.listRail===label+' · cat.' && partial.copy.listRailOrigin==='catalog-review' && partial.profile.classEvidence?.modelCode===code,'class independent of presentation: '+code);
 const divergent=runRegulatoryCase({code,review:true,identity:'possible_divergence'});
 check(!divergent.copy.official && divergent.copy.listRailOrigin==='unknown' && divergent.copy.listRail==='REG. REVISÃO','divergent match cannot assert another product class: '+code);
 const recorded=runRegulatoryCase({code,declaredType:matching,review:true,identity:'compatible'});
 check(!recorded.copy.official && recorded.copy.listRailOrigin==='declared' && recorded.copy.catalogClass?.modelCode===code,'declared and catalog facts coexist: '+code);
}
const identityOnly=regulatoryPresentation.regulatoryCopyUX360({verified:false,label:'Classificação não confirmada',referenceIdentity:'compatible',identifiedIngredients:['Substância sintética QA']},false,{});
check(identityOnly.listRail==='Cat. · s/ classe' && !identityOnly.official,'known substance without class does not claim official prescription');
check(regulatoryPresentation.medicationRegulatoryKnowledgeText({verified:false,label:'Classificação não confirmada',referenceIdentity:'compatible',identifiedIngredients:['Substância sintética QA']}).includes('Princípio ativo: Substância sintética QA'),'shared descriptive text preserves ingredient without fabricated class');
const foreignLink=runRegulatoryCase({declaredType:'azul',linked:true,foreign:true});
check(foreignLink.color==='#60a5fa' && !foreignLink.copy.official,'documento de outra conta não promove autoridade nem altera pigmento');
// A parent live-query render must not restart a drawer session (390px incident).
// Assert the stable callback is the real JSX consumer, not an unused helper.
let drawerCloseDecl,drawerOpening;
function visitDrawerSession(node) {
 if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='closeMedicationSheet360') {
  assert.ok(!drawerCloseDecl,'duplicate close handler');drawerCloseDecl=node;
 }
 if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(listAst)==='MedicationSheet360R3') {
  assert.ok(!drawerOpening,'duplicate medication drawer');drawerOpening=node;
 }
 ts.forEachChild(node,visitDrawerSession);
}
visitDrawerSession(listAst);
const drawerInit=drawerCloseDecl?.initializer;
const drawerHandler=drawerOpening?.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.text==='onClose');
check(Boolean(drawerInit&&ts.isCallExpression(drawerInit)&&drawerInit.expression.getText(listAst)==='useCallback'&&
 drawerInit.arguments.length===2&&ts.isArrayLiteralExpression(drawerInit.arguments[1])&&drawerInit.arguments[1].elements.length===0&&
 drawerInit.arguments[0].getText(listAst).replace(/\s/g,'')==='()=>setMedicationSheet360(null)'&&
 drawerHandler?.initializer?.expression?.getText(listAst)==='closeMedicationSheet360'),
 'gaveta: callback de fechamento estável no consumidor real, sem reiniciar aba em atualização do pai');

check(list.includes('style={medicationPersonalAccentStyle(med)}'),'cor pessoal limitada ao ícone');
check(list.includes('const personalAccent = medicationPersonalAccent(med);'),'uma resolução por medicamento');
check(!list.includes('aria-hidden="true" className="inline-block h-2 w-2') && list.includes('style={medicationPersonalAccentStyle(med)}'),'cor pessoal no ícone sem ponto decorativo órfão');
const hook=file('hooks/useTodayOwnerData.ts');
check(hook.includes('const ownerData = useLiveQuery')&&hook.includes('const dayData = useLiveQuery'),'duas consultas reativas independentes');
check(hook.includes('}, [userId, personId]);') && hook.includes('}, [userId, personId, date]);'),'consulta de dono não depende da data');
check(hook.includes('const ready = ownerReady && dayReady;'),'dados novos só aparecem com dono e dia coerentes');
check(hook.includes('historicoDosesCompleto: historyReady ? historyData!.rows'),'histórico M62 completo mantido');
check(!hook.includes('.limit('),'sem truncamento silencioso do histórico clínico');
let queries = [], views=[];
const db = new Proxy({}, {get(_t,name){return {where(index){return {equals(value){return {toArray:async()=>{views.push([name,index,value]);return [{id:String(name)}]}}}}}}}});
let returned = [];
const useLiveQuery = (fn,deps)=>{ queries.push({fn,deps}); return returned[queries.length-1]; };
const {useTodayOwnerData} = load('hooks/useTodayOwnerData.ts',{
 'dexie-react-hooks':{useLiveQuery},'@/lib/db':{db}
});
function render(data) {queries=[];return useTodayOwnerData(data)};
(async()=>{
 let state=render({userId:'u1',personId:'p1',date:'2026-10-29'});
 check(state.ready===false && state.tratamentos.length===0,'carregamento inicial falha fechado');
 check(queries.length===3,'três subscrições: dono, dia e histórico');
 check(JSON.stringify(queries[0].deps)===JSON.stringify(['u1','p1']),'leitura de dono por conta/pessoa');
 check(JSON.stringify(queries[1].deps)===JSON.stringify(['u1','p1','2026-10-29']),'leitura do dia com data selecionada');
 check(JSON.stringify(queries[2].deps)===JSON.stringify(['u1','p1']),'histórico independente da navegação de dia');
 await queries[0].fn(); await queries[1].fn(); await queries[2].fn();
 const ownerRows=views.filter(x=>['tratamentos','renovacoes','medicos','farmacias','hospitais'].includes(String(x[0])));
 const dayRows=views.filter(x=>['consultas','cirurgias','exames','registros_saude'].includes(String(x[0])));
 check(ownerRows.length===5 && ownerRows.every(x=>x[1]==='[user_id+person_id]'),'cinco áreas estáveis indexadas por dono');
 check(dayRows.length===4 && dayRows.every(x=>x[1]==='[user_id+person_id+data]'),'quatro áreas de agenda indexadas por dia');
 returned=[{userId:'u1',personId:'p1',tratamentos:[{id:'t'}],renovacoes:[],medicos:[],farmacias:[],hospitais:[]},
 {userId:'u1',personId:'p1',date:'2026-10-29',consultasHoje:[],cirurgiasHoje:[],examesHoje:[],registrosHoje:[]},
 {userId:'u1',personId:'p1',rows:[{id:'dose'}]}];
 state=render({userId:'u1',personId:'p1',date:'2026-10-29'});
 check(state.ready && state.tratamentos[0].id==='t' && state.historicoDosesCompleto[0].id==='dose','snapshot consistente exibido');
 state=render({userId:'u1',personId:'p1',date:'2026-10-30'});
 check(!state.ready && state.consultasHoje.length===0 && state.tratamentos.length===0,'troca de data nunca exibe dia anterior');
 state=render({userId:'u2',personId:'p1',date:'2026-10-29'});
 check(!state.ready && state.historicoDosesCompleto.length===0,'troca de conta isola todas as consultas');
 state=render({userId:'u1',personId:'p2',date:'2026-10-29'});
 check(!state.ready && state.tratamentos.length===0,'troca de pessoa falha fechado');
 const pulse=file('components/hoje/TodayRoutinePulse.tsx');
 check(pulse.includes('Entender este resumo')&&pulse.includes('<details'),'orientação temporal progressiva');
 check(pulse.includes('aria-valuetext={`${completed} concluídas, ${ignored} ignoradas, ${unconfirmed} sem confirmação`}'),'progresso mantém três autoridades de dose');
 check(pulse.includes('todayTemporalGuidance')&&pulse.includes('role="note"'),'explicação clínica preservada');
 const home=file('components/home/HomeDailyHero.tsx');
 check(home.includes('scheduled > 0')&&home.includes('homeRoutineSummaryNote(scheduled, safeCompleted)'),'denominador de doses e ausência de horários preservados');
 check(home.includes('min-h-[75px]') && home.includes('active:bg-surface-raised/40') &&
 home.includes('scheduled > 0 && Number.isFinite(progress)'),
 'UI360 R4: toque >=44px, feedback e denominador real preservados sem altura redundante');
 const network=file('components/saude/MedicationCareNetworkDetails.tsx');
 check(network.includes('size-12') && network.includes('onNavigate(') &&
 network.includes('onMap(') && network.includes('onCall('),
 'M25: ações da rede com 48px e destinos autênticos preservados');
check(network.includes('text-sky-300" label="Médico Prescritor"'),'médico identificado em azul');
 check(network.includes('text-emerald-300" label="Farmácia Vinculada"'),'farmácia identificada em verde');
 check(network.includes('Vínculo não confirma atendimento, fornecimento ou retirada'),'sem inferência clínica');
 const hub=file('components/home/HomeCommandCenter.tsx');
 // Existing V9 semantics: preserve each clinical route's original color exactly.
 const hasClinicalTone=(route,tone)=>new RegExp('path:\\s*\"'+route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\"[\\s\\S]{0,250}?tone:\\s*\"[^\"]*text-'+tone+'').test(hub);
 // M131 R3: Minha Saude agora e primaria. Confirmar rota e cor no componente
 // de destaque, mantendo intactas as outras cinco cores de rota V9.
 const primaryHealthTone = /<HomeClinicalAreaTile\s+label="Minha saúde"[\s\S]*?path="\/saude\/minha-saude"[\s\S]*?tone="[^"]*text-coral"[\s\S]*?onNavigate=\{go\}/.test(hub);
 check(primaryHealthTone &&
   hasClinicalTone('/saude/consultas','sky-300') &&
   hasClinicalTone('/saude/exames','cyan-300') &&
   hasClinicalTone('/saude/lembretes','amber-400') &&
   hasClinicalTone('/saude/registros','coral') &&
   hub.includes('networkTone="text-sky-300/80"') &&
   !hub.includes('networkTone="text-cyan-400/70"'),
   'V9: cores clínicas por rota mantidas, sem ciano excessivo na rede');
 check(hub.includes('grid min-w-0 grid-cols-2 gap-2.5'),
   'M64 R4: grade de atalhos secundários sem overflow, sem mudar identidade');
 const health=file('app/saude/minha-saude/page.tsx');
  const healthAst=ts.createSourceFile('my-health.tsx',health,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  check(healthAst.statements.some(node => ts.isImportDeclaration(node) &&
    node.moduleSpecifier.text === 'lucide-react' && node.importClause &&
    node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
    node.importClause.namedBindings.elements.some(item => item.name.text === 'HeartPulse')),
    'HeartPulse usado em Minha Saúde está importado (contrato TypeScript)');
 check(health.includes('id="minha-saude-panorama"')&&health.includes('{() => <PersonalHealthOverview'),'panorama sob demanda sem abandonar seção');
 check(health.includes('Como explorar seu Avatar')&&health.includes('não um diagnóstico'),'orientação de Avatar acessível sob demanda');
 const avatar=file('components/saude/HealthAvatar.tsx');
 check(avatar.includes("size==='expanded'?<details open className=") &&
 avatar.includes('Toque no Avatar para ampliar. O botão do Brain mostra o contexto sem sair desta tela.') &&
 avatar.includes('não diagnósticos'),
 'V178/M7/M11/M13: inspeção ampliada visível e orientação original preservadas');
 check(avatar.includes('shouldMount3D')&&avatar.includes('previewVisible')&&avatar.includes('documentVisible'),'Fênix mantém WebGL condicionado à visibilidade');
 const disclosure=file('components/saude/ClinicalDisclosure.tsx');
 check(disclosure.includes('aria-describedby={descriptionId}')&&disclosure.includes('open ? "sr-only" : "line-clamp-2"'),'título compacto com descrição ainda acessível');
 check(disclosure.includes('vault:reveal-clinical-section'),'deep links de seções preservados');
 const gate=file('scripts/test-v63-release-gate.mjs');
 for(const name of ['test-vault-m64-premium-performance.cjs','test-vault-m63-notifications-search.cjs','test-vault-m62-retro-batch.cjs','test-vault-m61-help.cjs'])
  check(gate.includes(name),`release gate inclui ${name}`);
 console.log(`VAULT M64: ${count} verificações de performance, identidade, Owner, UX, navegação, Fênix e release OK`);
})().catch(e=>{console.error(e);process.exitCode=1});
