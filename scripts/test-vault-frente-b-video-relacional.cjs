#!/usr/bin/env node
'use strict';
const fs=require('fs'),assert=require('assert/strict'),ts=require('typescript');
let count=0;const get=p=>fs.readFileSync(p,'utf8');function ok(cond,label){assert.ok(cond,'B_RELACIONAL: '+label);console.log('✓ '+(++count)+' '+label)}
const paths=['app/saude/minha-saude/page.tsx','app/saude/fenix/page.tsx','app/saude/mapa/page.tsx','app/saude/registros/page.tsx','app/saude/careflow/modo-medico/page.tsx','components/saude/HealthHubLauncherR5.tsx','lib/m3/medical-dossier-p3.ts','lib/clinical-record-timeline.ts','lib/navigation/bottom-nav-compose.ts','components/BottomNav.tsx','lib/ui/front-b-clinical-identity.ts','components/saude/MedicalDossierRowIconB.tsx','components/saude/FenixRouteContextB.tsx','lib/clinical-front-b-pure.ts','app/saude/fenix/layout.tsx'];
for(const p of paths){const source=get(p),pTs=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(pTs.parseDiagnostics.length===0,'sintaxe '+p+' '+pTs.parseDiagnostics.map(d=>d.messageText).join('|'))}
const health=get(paths[0]),fenix=get(paths[1]),map=get(paths[2]),records=get(paths[3]),medical=get(paths[4]),launcher=get(paths[5]),dossier=get(paths[6]),timeline=get(paths[7]),compose=get(paths[8]),modal=get(paths[9]),identity=get(paths[10]);
ok(fenix.includes('return <MyHealthPage/>')&&get('app/saude/fenix/layout.tsx').includes('<FenixRouteProviderB>{children}</FenixRouteProviderB>')&&health.includes('forceFenix||pathname'),'rota Fenix forçada sem mudar PageProps do Next');
ok(health.includes('const forceFenix=useForcedFenixRouteB()')&&health.includes('profileOnly = forcedFenix')&&get('components/saude/FenixRouteContextB.tsx').includes('createContext(false)'),'painel completo por rota e contexto isolado da Fênix');
ok(launcher.includes('spanFull={favorites.length%2===1&&i===favorites.length-1}'),'último favorito ímpar expande');
ok(map.includes('featured.length%2===1')&&map.includes('remaining.length%2===1')&&map.includes('favoriteEntries.length%2===1')&&records.includes('[&_nav]:!grid-cols-3'),'grades órfãs cobertas');
ok(identity.includes('formatDoseQuantityB')&&timeline.includes('formatDoseQuantityB(item.quantidade)')&&!timeline.includes('estoque_unidade_medida')&&!dossier.includes('estoque_unidade_medida'),'dose sem unidade não inventa unidade');
ok(identity.includes('formatSleepDurationB')&&records.includes('originLabelB(event.record.source)'),'sono legível e origem explícita');
ok(records.includes('metricIdentityB(event.record.tipo)')&&medical.includes('<MedicalDossierRowIconB row={row}')&&get('components/saude/MedicalDossierRowIconB.tsx').includes('metricIdentityB(row.visualB?.metric)'),'ambos consumidores usam tipo real');
ok(medical.includes('<MedicalDossierRowIconB row={row}')&&get('components/saude/MedicalDossierRowIconB.tsx').includes('<MedicationFormatIcon formato={row.visualB.formato}')&&dossier.includes('visualB:medForRow'),'dossiê usa forma/cor por ID no consumidor real');
ok(get('components/saude/MedicalDossierRowIconB.tsx').includes('TreatmentIdentityIconR03')&&dossier.includes("visualB:{kind:'treatment'"),'tratamento usa autoridade A (somente leitura)');
ok(compose.includes('id:"vacina"')&&compose.includes('id:"procedimento"')&&compose.includes('id:"documento"')&&compose.includes('id:"alergia"')&&compose.includes('id:"dose-rapida"'),'destinos canônicos e encaminhamentos no Adicionar');
ok(!compose.slice(compose.indexOf('const SAUDE_COMPOSE_OPTIONS'),compose.indexOf('const SAUDE_DOCUMENTOS_COMPOSE_OPTIONS')).includes('icon: Plus,'),'menu saúde sem 12 ícones genéricos');
ok(modal.includes('overscroll-contain')&&modal.includes('querySelectorAll<HTMLButtonElement>'),'foco e rolagem preservados');
ok(medical.includes('>Modo Médico</h1>')&&!medical.includes('>Modo Médico 360</h1>'),'rótulo sem 360 redundante na área B');
ok(medical.includes('CustomDatePicker label="Início"')&&medical.includes('CustomDatePicker label="Fim"')&&medical.includes('30 ocorrências recentes')&&medical.includes('modo detalhado')&&medical.includes('makeMedicalPdfP3'),'BVID-25 preservar calendário, aviso 30, modo detalhado e PDF');
const jsx=ts.transpileModule(identity,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const Module=require('module');
const pureSource=get('lib/clinical-front-b-pure.ts');
const pureJs=ts.transpileModule(pureSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const pureModule=new Module('pure-b',module);pureModule.require=id=>{throw Error('Dependência não permitida no núcleo B: '+id)};pureModule._compile(pureJs,'pure-b');const pure=pureModule.exports;
const m=new Module('identity-b',module);m.require=id=>id==='lucide-react'?new Proxy({},{get:(_,name)=>({displayName:name})}):id==='@/lib/clinical-front-b-pure'?pure:require(id);m._compile(jsx,'identity-b');const h=m.exports;
const entries=Object.entries(h.METRIC_IDENTITY_B);ok(entries.length===9,'nove grandezas semânticas');
ok(new Set(entries.map(([_,data])=>data.icon.displayName)).size===entries.length,'ícones distintos por grandeza');
ok(h.metricKindB('SpO2')==='oxigenacao'&&h.metricKindB('batimentos')==='frequencia_cardiaca','sinônimos mapeados sem cruzar grandezas');
ok(h.metricKindB('sem_tipo')===null&&h.metricKindB('constructor')===null,'fallback honesto para grandeza desconhecida');
ok(h.formatSleepDurationB(770)==='12 h 50 min (770 min)'&&h.formatSleepDurationB(267)==='4 h 27 min (267 min)'&&h.formatSleepDurationB(1)==='1 min','durações 770 / 267 / 1 sem perda');
ok(h.formatDoseQuantityB(5)==='Quantidade registrada: 5 (unidade não informada)','não infere unidade por formato');
ok(h.formatDoseQuantityB(1,'comprimido')==='1 comprimido'&&h.formatDoseQuantityB(5,'gotas')==='5 gotas','unidade explicitamente cadastrada');
ok(h.formatDoseQuantityB(0)==='Quantidade não informada','zero não cria tomada');
ok(h.formatDoseQuantityB(5,'constructor')===h.formatDoseQuantityB(5),'chave de protótipo não vira unidade');
ok(h.originLabelB(null)==='Fonte não informada'&&h.originLabelB('health_connect').includes('Health Connect'),'proveniência real ou desconhecida');
// Behavioral render checks: execute the REAL changed row component with test-only dependencies.
const jsxRender=(type,props)=>({type,props:props||{}});
const iconCache=new Map();const iconMock=new Proxy({}, {get:(_,name)=>{if(!iconCache.has(name))iconCache.set(name,Object.assign(function IconMock(){},{displayName:String(name)}));return iconCache.get(name);}});
const medicationIcon=Object.assign(function MedicationIcon(){},{displayName:'MedicationFormatIcon'});
// Real published A resolver; only the external icon library is replaced in this render harness.
const treatmentResolverPath='lib/health-profile/treatment-icon.ts';
const treatmentResolverJs=ts.transpileModule(get(treatmentResolverPath),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const treatmentResolver=new Module('published-treatment-resolver-a',module);
const treatmentMeta=new Module('treatment-meta-r03',module);treatmentMeta._compile(ts.transpileModule(get('lib/health-profile/treatment-preferences-r03.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'treatment-meta-r03');
treatmentResolver.require=id=>{if(id==='lucide-react')return iconMock;if(id==='./treatment-preferences-r03')return treatmentMeta.exports;throw Error('Unexpected A resolver dependency '+id)};
treatmentResolver._compile(treatmentResolverJs,'published-treatment-resolver-a');
const resolveTreatmentA=treatmentResolver.exports.getVaultTreatmentIcon;

const iconSource=get('components/saude/MedicalDossierRowIconB.tsx');
const iconJs=ts.transpileModule(iconSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const mIcon=new Module('medical-row-icon-b',module);
let treatmentArgB;
const TreatmentIdentityBoundaryR03=({entity,style,...props})=>{treatmentArgB=entity;return jsxRender(resolveTreatmentA(entity),{...props,style});};
const renderDossierChildR03=(type,props)=>type===TreatmentIdentityBoundaryR03?type(props):jsxRender(type,props);
mIcon.require=id=>id==='react/jsx-runtime'?{jsx:renderDossierChildR03,jsxs:renderDossierChildR03,Fragment:'fragment'}:id==='@/components/saude/MedicationFormatIcon'?{MedicationFormatIcon:medicationIcon}:id==='@/components/saude/TreatmentIdentityR03'?{TreatmentIdentityIconR03:TreatmentIdentityBoundaryR03}:id==='@/lib/ui/front-b-clinical-identity'?h:id==='lucide-react'?iconMock:require(id);
mIcon._compile(iconJs,'medical-row-icon-b');
const medicalIcon=mIcon.exports.MedicalDossierRowIconB;
const medEl=medicalIcon({row:{title:'Med',visualB:{kind:'medication',formato:'gota',cores:['#123456']}},fallbackIcon:iconMock.Pill,fallbackTone:'text-muted'});
ok(medEl.props.children.type===medicationIcon&&medEl.props.children.props.formato==='gota'&&medEl.props.children.props.cores[0]==='#123456','render Modo Médico usa apresentação real e cor da pessoa');
const oxEl=medicalIcon({row:{title:'Oxigenação',visualB:{kind:'measurement',metric:'oxigenacao'}},fallbackIcon:iconMock.HeartPulse,fallbackTone:'text-muted'});
ok(oxEl.props.children.type.displayName==='Wind'&&oxEl.props.children.type!==iconMock.HeartPulse,'render SpO2 não usa ícone da seção');
const unknownEl=medicalIcon({row:{title:'Sem vínculo'},fallbackIcon:iconMock.Pill,fallbackTone:'text-muted'});
ok(unknownEl.props.children.type===iconMock.Pill,'sem identificação mantém fallback honesto');
const treatmentEl=medicalIcon({row:{title:'Tratamento',visualB:{kind:'treatment',name:'Dor',color:'#ff8800',treatmentId:'treatment-real-id'}},fallbackIcon:iconMock.Pill,fallbackTone:'text-muted'});
ok(treatmentEl.props.children.props.style.color==='#ff8800','tratamento usa cor declarada e resolvedor A');
ok(treatmentArgB?.id==='treatment-real-id'&&!Object.hasOwn(treatmentArgB,'name'),'autoridade A recebe ID real, não nome nem título');
medicalIcon({row:{title:'Sem ID',visualB:{kind:'treatment',name:'Dor'}},fallbackIcon:iconMock.Pill,fallbackTone:'text-muted'});
ok(treatmentArgB?.id===undefined,'tratamento sem ID mantém fallback neutro da A');
const stableTreatment=medicalIcon({row:{title:'Nome alterado',visualB:{kind:'treatment',name:'Outro',treatmentId:'treatment-real-id'}},fallbackIcon:iconMock.Pill,fallbackTone:'text-muted'});
const neutralTreatment=medicalIcon({row:{title:'Dor',visualB:{kind:'treatment',name:'Dor'}},fallbackIcon:iconMock.Pill,fallbackTone:'text-muted'});
ok(treatmentEl.props.children.type===resolveTreatmentA({id:'treatment-real-id'})&&stableTreatment.props.children.type===treatmentEl.props.children.type,'consumidor B usa resolvedor A real e identidade estável ao renomear');
ok(neutralTreatment.props.children.type===iconMock.CircleHelp,'nome sem ID não produz classificação clínica');
// Evaluate the actual EventRow consumer with synthetic user-owned records, without a DOM or network.
const recordsForTest=records.replace('function EventRow({','export function EventRow({');
ok(recordsForTest!==records,'consumer EventRow exported only inside the test runtime');
const recordsJs=ts.transpileModule(recordsForTest,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mRow=new Module('event-row-b',module);
mRow.require=id=>id==='react/jsx-runtime'?{jsx:jsxRender,jsxs:jsxRender,Fragment:'fragment'}:id==='lucide-react'?iconMock:id==='@/lib/ui/front-b-clinical-identity'?h:id==='@/lib/health-insights'?{analisarRegistroSaude:()=>null}:new Proxy({}, {get:()=>()=>null});
mRow._compile(recordsJs,'event-row-b');
const makeEvent=tipo=>({kind:'record',category:'medicao',id:'record-1',title:'Registro',subtitle:'',date:'2026-11-25',time:'12:00',record:{id:'id',tipo,nome:'Registro',source:'health_connect',duracao_minutos:770}});
const walk=(n,buf=[])=>{if(Array.isArray(n)){n.forEach(x=>walk(x,buf));return buf;}if(n&&typeof n==='object'&&n.type!==undefined){buf.push(n);walk(n.props?.children,buf);}return buf;};
const sleepTree=walk(mRow.exports.EventRow({event:makeEvent('sono'),onOpen:()=>{}}));
const oxyTree=walk(mRow.exports.EventRow({event:makeEvent('spo2'),onOpen:()=>{}}));
ok(sleepTree.some(e=>e.type?.displayName==='Moon')&&!sleepTree.some(e=>e.type?.displayName==='ClipboardList'),'render Linha Cuidado usa Moon no sono');
ok(oxyTree.some(e=>e.type?.displayName==='Wind')&&!oxyTree.some(e=>e.type?.displayName==='Activity'),'render Linha Cuidado usa Wind em SpO2');
const mutantMetricMap={...h.METRIC_IDENTITY_B,oxigenacao:{...h.METRIC_IDENTITY_B.oxigenacao,icon:h.METRIC_IDENTITY_B.frequencia_cardiaca.icon}};
ok(new Set(Object.values(mutantMetricMap).map(x=>x.icon.displayName)).size<9,'mutante negativo de ícones repetidos detectado');
// R02: actual timeline, historical dose invariants and route boundary (synthetic records only).
const timelineJs=ts.transpileModule(timeline,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const tm=new Module('timeline-b',module);tm.require=id=>{if(id==='@/lib/clinical-front-b-pure')return pure;throw Error('Timeline depende de '+id)};tm._compile(timelineJs,'timeline-b');
const taken={id:'dose-b',user_id:'u',person_id:'p',medicamento_id:'med-b',data:'2026-11-25',horario:'10:00',tomado_em:'2026-11-25T10:00:00',quantidade:5};
const med={id:'med-b',user_id:'u',person_id:'p',nome:'Sintético',estoque_unidade_medida:'gotas'};
const eventFor=(dose,medication)=>tm.exports.buildClinicalEvents([], [dose], [medication])[0];
const hist=eventFor(taken,med),histChanged=eventFor(taken,{...med,estoque_unidade_medida:'comprimidos'});
ok(hist.subtitle===histChanged.subtitle&&hist.subtitle.includes('5 (unidade não informada)'),'dose histórica independe da unidade atual do estoque');
ok(!hist.subtitle.includes('gotas')&&!histChanged.subtitle.includes('comprimidos'),'negativo: estoque não rotula dose histórica');
const ignored=eventFor({...taken,tomado_em:undefined,ignorado_em:taken.tomado_em},med);
ok(ignored.subtitle.includes('ignorada')&&!ignored.subtitle.includes('Quantidade registrada'),'dose ignorada não afirma consumo');
ok(tm.exports.buildClinicalEvents([], [{...taken,tomado_em:undefined,dose_kind:'planned'}], [med]).length===0,'dose apenas planejada não vira fato');
ok(!pureSource.includes('lucide-react')&&!pureSource.includes('react/'),'núcleo sem dependência de UI');
const layoutSource=get('app/saude/fenix/layout.tsx');
const layoutJs=ts.transpileModule(layoutSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const routeProvider=function RouteProvider(){};const lm=new Module('layout-b',module);lm.require=id=>id==='react/jsx-runtime'?{jsx:jsxRender}:id==='@/components/saude/FenixRouteContextB'?{FenixRouteProviderB:routeProvider}:require(id);lm._compile(layoutJs,'layout-b');
const child={type:'sentinel'},wrapped=lm.exports.default({children:child});
ok(wrapped.type===routeProvider&&wrapped.props.children===child,'layout Fênix entrega filho real ao provider sem duplicação');
ok(pure.formatDoseQuantityB(5,undefined)!==pure.formatDoseQuantityB(5,'gotas'),'mutante unidade inferida produz saída diferente');
// R02.1 — execute canonical option resolver, actual BottomNav handler and destination entries.
// Synthetic navigation only: no DOM, database, network or clinical writes.
const loadR021=(name,source,resolveDep)=>{
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true},reportDiagnostics:true});
 assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,name);
 const mod=new Module(name,module);mod.require=resolveDep;mod._compile(compiled.outputText,name);return mod.exports;
};
const noDepR021=id=>{throw Error('R021 unexpected dependency: '+id)};
const loadComposeR021=source=>loadR021('compose-r021',source,id=>id==='lucide-react'?iconMock:noDepR021(id));
const composeR021=loadComposeR021(compose);
const returnsR021=loadR021('return-context-r021',get('lib/navigation/return-context.ts'),noDepR021);
const navAstR021=ts.createSourceFile('BottomNav.tsx',modal,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const handlerDeclR021=[], clickNodesR021=[];
function findHandlerR021(n){
 if(ts.isVariableDeclaration(n)&&n.name.getText(navAstR021)==='handleComposeOptionPress'&&n.initializer)handlerDeclR021.push(n);
 if(ts.isJsxAttribute(n)&&n.name.getText(navAstR021)==='onClick'&&n.initializer&&ts.isJsxExpression(n.initializer)){
  const e=n.initializer.expression;if(e&&ts.isArrowFunction(e)&&ts.isCallExpression(e.body)&&e.body.expression.getText(navAstR021)==='handleComposeOptionPress'&&e.body.arguments.length===1&&e.body.arguments[0].getText(navAstR021)==='option')clickNodesR021.push(e);
 }
 ts.forEachChild(n,findHandlerR021);
}
findHandlerR021(navAstR021);
ok(handlerDeclR021.length===1&&clickNodesR021.length===1,'R021 consumidor BottomNav: clique real ligado ao handler de opções');
const handlerJsR021=ts.transpileModule('const '+handlerDeclR021[0].getText(navAstR021)+';',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const handlerFactoryR021=new Function('router','trigger','setIsComposeMenuOpen','withReturnTarget','composeReturnTo',handlerJsR021+'\nreturn handleComposeOptionPress;');
const destinationForR021=(resolver,origin,id)=>{
 const originUrl=new URL(origin,'https://vault.local');
 const options=resolver.getComposeOptions(originUrl.pathname,originUrl.searchParams);
 const found=options.filter(o=>o.id===id);assert.equal(found.length,1,'R021 exactly one '+id+' on '+origin);
 const pushes=[],haptics=[],menu=[];
 const press=handlerFactoryR021({push:x=>pushes.push(x)},x=>haptics.push(x),x=>menu.push(x),returnsR021.withReturnTarget,origin);
 press(found[0]);assert.deepEqual(haptics,['success']);assert.deepEqual(menu,[false]);assert.equal(pushes.length,1);
 return new URL(pushes[0],'https://vault.local');
};
const originsR021=['/','/saude','/saude/minha-saude','/saude/mapa','/saude/careflow','/saude/rede?tab=geral'];
const checkDestinationR021=(resolver,id,target)=>{
 for(const origin of originsR021){const url=destinationForR021(resolver,origin,id);assert.equal(url.pathname,target);assert.equal(url.searchParams.get('return_to'),origin);}
 return true;
};
ok(checkDestinationR021(composeR021,'hidratacao','/saude/hidratacao'),'G-B01 seis origens: clique entrega Hidratação à rota canônica com retorno');
ok(checkDestinationR021(composeR021,'alergia','/saude/reacoes'),'G-B02 seis origens: clique entrega Alergia/Reação à rota canônica com retorno');
ok(checkDestinationR021(composeR021,'sintoma','/saude/registros/novo')&&checkDestinationR021(composeR021,'procedimento','/saude/procedimentos'),'R021 destinos vizinhos permanecem distintos');
const hydrationSentinelR021=function HydrationPanel(){};
const hydrationEntryR021=loadR021('hydration-page-r021',get('app/saude/hidratacao/page.tsx'),id=>id==='react/jsx-runtime'?{jsx:jsxRender,jsxs:jsxRender}:id==='@/components/saude/HydrationPanel'?{HydrationPanel:hydrationSentinelR021}:noDepR021(id));
const hydTreeR021=walk(hydrationEntryR021.default());
ok(hydTreeR021.some(e=>e.type===hydrationSentinelR021),'G-B01 rota real monta HydrationPanel existente');
const sensitivitySentinelR021=function A9ClinicalWorkspace(){};
const suspenseSentinelR021=function Suspense(){};
const allergyUrlR021=destinationForR021(composeR021,'/saude/rede?tab=geral','alergia');
const allergyEntryR021=loadR021('reaction-page-r021',get('app/saude/reacoes/page.tsx'),id=>id==='react/jsx-runtime'?{jsx:jsxRender,jsxs:jsxRender}:id==='react'?{Suspense:suspenseSentinelR021}:id==='next/navigation'?{useSearchParams:()=>allergyUrlR021.searchParams}:id==='@/components/saude/A9ClinicalWorkspace'?{A9ClinicalWorkspace:sensitivitySentinelR021}:id==='@/lib/navigation/return-context'?returnsR021:noDepR021(id));
const reactionRootR021=allergyEntryR021.default();
const reactionChildR021=reactionRootR021.props.children.type(reactionRootR021.props.children.props);
ok(reactionRootR021.type===suspenseSentinelR021&&reactionChildR021.type===sensitivitySentinelR021&&reactionChildR021.props.initial==='sensitivity'&&reactionChildR021.props.returnTo==='/saude/rede?tab=geral','G-B02 rota real monta contexto sensitivity e mantém retorno');
const wrongHydR021=loadComposeR021(compose.replace('id:"hidratacao",label:"Hidratação",icon:Droplets,path:"/saude/hidratacao"','id:"hidratacao",label:"Hidratação",icon:Droplets,path:"/saude/registros/novo"'));
const wrongAllergyR021=loadComposeR021(compose.replace('id:"alergia",label:"Alergia / Reação",icon:Activity,path:"/saude/reacoes"','id:"alergia",label:"Alergia / Reação",icon:Activity,path:"/saude/procedimentos"'));
function rejectsR021(fn){try{fn();return false}catch(e){return e instanceof assert.AssertionError||e.code==='ERR_ASSERTION'}}
ok(rejectsR021(()=>checkDestinationR021(wrongHydR021,'hidratacao','/saude/hidratacao')),'mutante G-B01: destino antigo efetivamente rejeitado');
ok(rejectsR021(()=>checkDestinationR021(wrongAllergyR021,'alergia','/saude/reacoes')),'mutante G-B02: destino antigo efetivamente rejeitado');
// Permanent registration must exist in the official contracts array; do not freeze future counts.
const gateAstR021=ts.createSourceFile('gate.mjs',get('scripts/test-v63-release-gate.mjs'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const registrationsR021=[];
function findRegistrationR021(n){if(ts.isVariableDeclaration(n)&&n.name.getText(gateAstR021)==='contracts'&&n.initializer&&ts.isArrayLiteralExpression(n.initializer))registrationsR021.push(n.initializer.elements.filter(e=>ts.isStringLiteral(e)&&e.text==='scripts/test-vault-frente-b-video-relacional.cjs').length);ts.forEachChild(n,findRegistrationR021)}
findRegistrationR021(gateAstR021);
ok(registrationsR021.length===1&&registrationsR021[0]===1,'G-B03 vacina B registrada uma única vez na lista oficial V63');
console.log(`B_VIDEO_RELACIONAL_PASS=${count}`);
// STB-01..09: preserve all 67 existing assertions; new suite runs as a hard dependency.
require('./test-vault-stability-360.cjs');
require('node:child_process').execFileSync(process.execPath,['scripts/test-vault-stability-r03.cjs'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,['scripts/test-vault-stb11-cas-transport-r03.cjs'],{stdio:'inherit'});
