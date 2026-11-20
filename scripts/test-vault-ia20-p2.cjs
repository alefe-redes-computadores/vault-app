#!/usr/bin/env node
'use strict';
/** IA 2.0 P2: exact functional creation coverage + visual semantics, read-only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const vm=require('node:vm'),ts=require('typescript');
let checks=0;
const read=f=>fs.readFileSync(f,'utf8');
const ok=(v,m)=>{assert.ok(v,'IA20 P2: '+m);checks++};
function moduleTs(file,deps={}){
 const source=read(file);
 const c=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 ok(!(c.diagnostics||[]).length,'TypeScript sintatico '+file);
 const box={exports:{}};
 vm.runInNewContext(c.outputText,{exports:box.exports,module:box,require:(id)=>{
  if(Object.hasOwn(deps,id))return deps[id];
  throw Error('IA20 P2: dependencia nao permitida '+file+': '+id);
 },URL,URLSearchParams}, {filename:file});
 return box.exports;
}
const icons=new Proxy({}, {get:(o,key)=>key==='__esModule'?true:()=>null});
const compose=moduleTs('lib/navigation/bottom-nav-compose.ts',{'lucide-react':icons});
const own=moduleTs('lib/navigation/ia20-p2-create.ts');
const dir=moduleTs('lib/navigation/clinical-directory-m150.ts');
const tones=moduleTs('lib/navigation/clinical-map-tones-m150-p3.ts');
const returns=moduleTs('lib/navigation/return-context.ts');
const header=read('components/list/ListPageHeader.tsx'),button=read('components/list/ContextualCreateP2.tsx');
const bottom=read('components/BottomNav.tsx'),hub=read('components/saude/HealthHubLauncherR5.tsx');
const testGate=read('scripts/test-v63-release-gate.mjs');
const paths=[
 'components/BottomNav.tsx','components/list/ListPageHeader.tsx',
 'components/list/ContextualCreateP2.tsx','lib/navigation/bottom-nav-compose.ts',
 'lib/navigation/ia20-p2-create.ts','lib/navigation/clinical-map-tones-m150-p3.ts',
 'components/saude/HealthHubLauncherR5.tsx',
 'scripts/test-vault-m6-hierarchy-fenix.cjs','scripts/test-v63-release-gate.mjs',
];
for(const f of paths){
 const s=read(f),kind=f.endsWith('.tsx')?ts.ScriptKind.TSX:f.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS;
 const ast=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,kind);
 ok(ast.parseDiagnostics.length===0,'parse '+f+': '+ast.parseDiagnostics.map(d=>d.messageText).join(' | '));
}
ok(Array.isArray(own.IA20_P2_LOCAL_CREATE_ROUTES)&&own.IA20_P2_LOCAL_CREATE_ROUTES.length===19,'exatamente 19 listas com CTA local');
ok(new Set(own.IA20_P2_LOCAL_CREATE_ROUTES).size===19,'19 rotas distintas');
ok(own.ia20P2Route('/saude/consultas///?x=1')==='/saude/consultas','normalizacao de caminho');
const matrix=[];
const optionsFor=route=>{const u=new URL(route,'https://vault.local');return compose.getComposeOptions(own.ia20P2Route(u.pathname),new URLSearchParams(u.search));};
function audited(route,expectedMode){
 const u=new URL(route,'https://vault.local'),ops=optionsFor(route);
 const local=own.ia20P2HeaderOwnsCreate(u.pathname,ops.length,new URLSearchParams(u.search));
 const mode=local?'header':ops.length?'fallback':'sem-criacao';
 ok(mode===expectedMode,route+': esperado '+expectedMode+', atual '+mode);
 for(const op of ops){
  const dest=new URL(op.path,'https://vault.local');
  ok(op.path.startsWith('/')&&!op.path.startsWith('//'),'URL local '+op.path);
  ok(fs.existsSync('app'+dest.pathname+'/page.tsx'),'destino real '+op.path);
  const target=returns.withReturnTarget(op.path,u.pathname+u.search);
  const actual=new URL(target,'https://vault.local');
  ok(actual.pathname===dest.pathname,'criacao nao troca destino '+op.path);
  ok(actual.searchParams.get('return_to')===u.pathname+u.search,'ida e retorno '+route);
  matrix.push({route,mode,id:op.id,label:op.label,destination:op.path,return_to:actual.searchParams.get('return_to'),status:'PASS'});
 }
 if(!ops.length)matrix.push({route,mode,operations:0,status:'PASS'});
}
for(const route of own.IA20_P2_LOCAL_CREATE_ROUTES){
 ok(fs.existsSync('app'+route+'/page.tsx'),'lista existente '+route);
 ok(read('app'+route+'/page.tsx').includes('<ListPageHeader'),'cabeçalho real montado '+route);
 ok(optionsFor(route).length===1,'cadastro unico comprovado '+route);
 audited(route,'header');
 audited(route+'/', 'header'); // CAPACITOR_BUILD trailingSlash: true
}
for(const route of ['/', '/hoje','/documentos','/saude/documentos','/saude',
 '/saude/minha-saude','/saude/mapa','/saude/careflow','/saude/careflow/episodios',
 '/saude/rede','/saude/rede?tab=medicos','/saude/rede?tab=farmacias',
 '/saude/rede?tab=hospitais','/saude/rede?tab=tratamentos',
 '/saude/rede?tab=cids','/saude/rede?tab=locais','/saude/rede?tab=consultas'])
 audited(route,'fallback');
for(const route of ['/mais','/saude/brain-v7','/saude/careflow/modo-medico',
 '/saude/careflow/dossie','/saude/careflow/pressao','/saude/careflow/sintomas',
 '/saude/careflow/exames','/saude/careflow/relatorios','/saude/pharmalens'])
 audited(route,'sem-criacao');
ok(!own.ia20P2HeaderOwnsCreate('/saude/fornecimento',1,new URLSearchParams('action=novo')),'fornecimento nao duplica formulario');
ok(!own.ia20P2HeaderOwnsCreate('/saude/fornecimento',1,new URLSearchParams('action=editar')),'fornecimento nao duplica edicao');
ok(own.ia20P2HeaderOwnsCreate('/saude/fornecimento',1,new URLSearchParams('tab=pedidos')),'fornecimento lista mantem CTA');
ok(!own.ia20P2HeaderOwnsCreate('/saude/medicos',2),'lista de multiplas operacoes usa fallback');
ok(header.includes('<ContextualCreateP2')&&header.includes('ia20P2HeaderOwnsCreate(')&&header.includes('rightAction'),'header integra CTA sem destruir ferramentas');
ok(header.includes('getComposeOptions(ia20P2Route(pathname), searchParams)'), 'cabecalho normaliza barra final ANTES de resolver o CTA Android');
ok(button.includes('getIa20CreateAccent(option.id)')&&button.includes('withReturnTarget(option.path, origin)'),'um unico catalogo e retorno seguro');
ok(button.includes('min-h-11')&&button.includes('focus-visible:outline')&&button.includes('motion-reduce:transition-none'),'area tocavel, foco e movimento reduzido');
ok(button.includes('disabled={navigating}')&&button.includes('aria-busy={navigating}')&&button.includes('LoaderCircle'),'feedback de navegacao sem alegar sucesso clinico');
ok(!/(?:\.insert\(|\.put\(|db\.|supabase|\.delete\()/.test(button),'CTA nao grava clinica');
ok(bottom.includes('ia20P2HeaderOwnsCreate(pathname, composeOptions.length, searchParams)'),'FAB oculto somente sob CTA de cabecalho comprovado');
ok(bottom.includes('showCompose && (')&&bottom.includes('withReturnTarget(option.path, composeReturnTo)'),'fallback global multiacao preservado');
ok(bottom.includes('id: "saude", icon: HeartPulse'),'quinta aba Saúde preservada');
ok(compose.getIa20CreateAccent('novo-medicamento').includes('emerald-'),'medicamentos esmeralda');
ok(compose.getIa20CreateAccent('nova-consulta').includes('sky-'),'consulta azul');
ok(compose.getIa20CreateAccent('nova-farmacia').includes('emerald-'),'farmacia verde');
ok(compose.getIa20CreateAccent('nova-cirurgia').includes('violet-'),'procedimento violeta');
ok(compose.getIa20CreateAccent('novo-exame').includes('cyan-'),'exame ciano');
ok(compose.getIa20CreateAccent('nova-renovacao').includes('violet-'),'receita violeta');
ok(compose.getOptionColorClass('nova-consulta').includes('sky-'),'sheet consulta azul');
ok(compose.getOptionColorClass('novo-medicamento').includes('emerald-'),'sheet medicamento verde');
for(const [href,shade] of [['/saude/medicamentos','emerald-'],['/saude/consultas','sky-'],['/saude/careflow/pressao','cyan-'],['/saude/exames','cyan-'],['/saude/careflow/sintomas','rose-'],['/saude/rede','sky-']]){
 const cl=compose.getIa20ShortcutTone(href);
 ok(cl.surface.includes(shade)&&cl.icon.includes(shade),'atalho Saúde em '+shade+': '+href);
}
ok(hub.includes('getIa20ShortcutTone(href).surface')&&hub.includes('getIa20ShortcutTone(href).icon'),'atalhos de Saúde usam semantica unica');
for(const [id,shade] of [['medicamentos','emerald-'],['retiradas','emerald-'],['fornecimento','emerald-'],['consultas','sky-'],['exames','cyan-'],['tratamentos','violet-']])
 ok(tones.clinicalMapToneM150P3(id).includes(shade),'Explorar usa '+shade+': '+id);
const entries=dir.clinicalDirectoryM150.flatMap(section=>section.items);
ok(entries.length>=31&&new Set(entries.map(x=>x.href)).size===entries.length,'catalogo Explorar possui 31 destinos diferentes');
for(const entry of entries){const u=new URL(entry.href,'https://vault.local');ok(fs.existsSync('app'+u.pathname+'/page.tsx'),'entrada Explorar real '+entry.id);}
ok(hub.includes('const favorites=')&&hub.includes('const focus=')&&hub.includes('NETWORK_SEARCH_R5'),'favoritos, Brain e foco do Hub continuam');
ok(testGate.includes('"scripts/test-vault-ia20-p1.cjs"')&&testGate.includes('"scripts/test-vault-ia20-p2.cjs"'),'gate P1 e P2 sem remover nenhum');
ok(read('scripts/test-vault-m6-hierarchy-fenix.cjs').includes("getOptionColorClass('consulta').includes('sky-')"),'M6 atualizado para paleta semantica sem remover comportamento');
const homeCenter=read('components/home/HomeCommandCenter.tsx');
const homeSupply=read('components/home/HomeSupplyAccessTiles.tsx');
const homeCare=read('components/home/HomeCareOrganizationTiles.tsx');
const homePage=read('app/page.tsx');
ok(homeCenter.includes('border-emerald-300/25 bg-emerald-300/[.06]')&&homeCenter.includes('bg-emerald-300/10 text-emerald-300'),'Home medicamento com identidade esmeralda');
ok(homeCenter.includes('tone: "border-sky-400/20 bg-sky-400/[0.06] text-sky-300"'),'Home consultas azul');
ok(homeCenter.includes('tone: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300"'),'Home exames ciano');
ok(homeCenter.includes('networkTone="text-sky-300/80"'),'Home profissionais azul');
ok(homeCenter.includes('Icon={Syringe} tone="border-violet-400/20'),'Home procedimentos com iconografia Lucide e violeta');
ok(!homeSupply.includes('amber-300')&&!homeSupply.includes('violet-300')&&homeSupply.includes('emerald-300'),'Home retiradas/fornecimento ambos esmeralda');
ok(homeCare.includes('text-violet-300')&&homeCare.includes('Profissionais e locais'),'Home documentos violeta e Rede humana');
ok(homePage.includes('bg-cyan-400/10 text-cyan-300'),'compromisso de exame ciano sem alterar dados');
ok(returns.safeReturnTarget('//outside.example','/')==='/','protecao contra URL externa');
const report=process.env.VAULT_IA20_P2_AUDIT;
if(report)fs.writeFileSync(report,JSON.stringify({surgery:'IA20-P2',checks,checkedAt:'validation-run',totalRecords:matrix.length,records:matrix},null,2)+'\n');
console.log(`VAULT_IA20_P2_COBERTURA_OK: ${checks} verificacoes; ${matrix.length} entradas de matriz; 19 listas com CTA local e fallback global preservado.`);
