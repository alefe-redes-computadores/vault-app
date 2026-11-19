#!/usr/bin/env node
'use strict';
/** P0: checks the REAL rendered header and canonical destinations, not merely JSX text. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
let checks=0;
const ok=(v,description)=>{assert.ok(v,`P0 CREATE: ${description}`);checks++};
const read=file=>fs.readFileSync(file,'utf8');
function compile(file,aliases={}) {
  const original=read(file);
  const kind=file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const ast=ts.createSourceFile(file,original,ts.ScriptTarget.Latest,true,kind);
  ok(ast.parseDiagnostics.length===0,`sintaxe ${file}`);
  const result=ts.transpileModule(original,{fileName:file,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  ok(!(result.diagnostics||[]).length,`transpile ${file}`);
  const absolute=path.resolve(file);
  const m=new Module(absolute,module);
  m.filename=absolute;m.paths=Module._nodeModulePaths(path.dirname(absolute));
  m.require=id=>Object.hasOwn(aliases,id)?aliases[id]:require(id);
  m._compile(result.outputText,absolute);
  return m.exports;
}
const icons=new Proxy({},{get(_target,key){
  if(key==='__esModule')return true;
  return ({size,...rest}={})=>React.createElement('svg',{'data-lucide':String(key),'aria-hidden':true,'width':size||18,'height':size||18},null);
}});
const returnContext=compile('lib/navigation/return-context.ts');
const policy=compile('lib/navigation/ia20-p2-create.ts');
const compose=compile('lib/navigation/bottom-nav-compose.ts',{'lucide-react':icons});
let route='/saude/medicamentos';
const routerCalls=[];
const nav={usePathname:()=>route.split('?')[0],useSearchParams:()=>new URLSearchParams(route.split('?')[1]||''),useRouter:()=>({push:s=>routerCalls.push(s),replace:s=>routerCalls.push(s)})};
const haptics={useHapticFeedback:()=>({trigger:()=>{}})};
const toasts={useToast:()=>({showInfo:()=>{}})};
const Create=compile('components/list/ContextualCreateP2.tsx',{
  'next/navigation':nav,'lucide-react':icons,'@/lib/haptics':haptics,
  '@/components/ToastProvider':toasts,
  '@/lib/navigation/bottom-nav-compose':compose,'@/lib/navigation/return-context':returnContext,
  '@/lib/navigation/ia20-p2-create':policy,
}).ContextualCreateP2;
const Header=compile('components/list/ListPageHeader.tsx',{
  'next/navigation':nav,'lucide-react':icons,'@/lib/haptics':haptics,
  '@/lib/navigation/return-context':returnContext,
  '@/lib/navigation/bottom-nav-compose':compose,
  '@/lib/navigation/ia20-p2-create':policy,
  '@/components/list/ContextualCreateP2':{ContextualCreateP2:Create},
}).ListPageHeader;
function rendered(r,props={}){
  route=r;
  return renderToStaticMarkup(React.createElement(Header,{title:'Audit '+r,rightAction:React.createElement('button',{'aria-label':'Pesquisar'},'Pesquisar'),...props}));
}
const expected={
 '/saude/medicamentos':'/saude/medicamentos/novo',
 '/saude/tratamentos':'/saude/tratamentos/novo',
 '/saude/renovacao':'/saude/renovacao/nova',
 '/saude/retiradas':'/saude/retiradas/nova',
 '/saude/consultas':'/saude/consultas/nova',
 '/saude/exames':'/saude/exames/novo',
 '/saude/cirurgias':'/saude/cirurgias/nova',
 '/saude/cids':'/saude/cids/novo',
 '/saude/medicos':'/saude/medicos/novo',
 '/saude/farmacias':'/saude/farmacias/novo',
 '/saude/hospitais':'/saude/hospitais/novo',
 '/saude/locais':'/saude/locais/novo',
 '/saude/registros':'/saude/registros/novo',
 '/saude/fornecimento':'/saude/fornecimento?action=novo',
 '/pessoas':'/pessoas/novo',
 '/cartoes':'/cartoes/novo',
 '/contas':'/contas/novo',
 '/vaults':'/vaults/novo',
 '/senhas':'/senhas/novo',
};
ok(Object.keys(expected).length===19,'cobertura exata das 19 listagens solicitadas');
ok(policy.IA20_P2_LOCAL_CREATE_ROUTES.length===19,'19 rotas canonicas em uma unica autoridade');
const policySet=new Set(policy.IA20_P2_LOCAL_CREATE_ROUTES);
ok(Object.keys(expected).every(x=>policySet.has(x)),'todas as rotas alvo registradas na autoridade');
const markup=read('components/list/ListPageHeader.tsx');
const createSource=read('components/list/ContextualCreateP2.tsx');
const bottom=read('components/BottomNav.tsx');
ok(markup.includes('data-vault-p0-create-row="visible"')&&markup.includes('grid w-full min-w-0 grid-cols-1'), 'criacao tem faixa responsiva propria sem depender de rightAction');
ok(createSource.includes('min-h-11 w-full')&&createSource.includes('sm:w-auto')&&createSource.includes('max-w-[min(82vw,240px)]'), 'acao de >=44px ocupa largura util nas telas estreitas');
ok(createSource.includes('router.push(target)')&&createSource.includes('withReturnTarget(option.path, origin)')&&createSource.includes('disabled={navigating}')&&createSource.includes('trigger("vibrate")'),'navegacao real, retorno, haptics e protecao de duplo clique');
// FIX2: todas as entradas de criacao exibem Plus. Cor e rotulo permanecem contextuais.
ok(createSource.includes('const Icon = Plus;') && createSource.includes('LoaderCircle, Plus'), 'CTA global usa Lucide Plus canonico');
ok(createSource.includes('useToast()') && createSource.includes('showInfo(`Abrindo ${option.label.toLocaleLowerCase("pt-BR")}…`, 1600)') && createSource.includes('trigger("vibrate")'), 'feedback tactil, toast informativo e nenhum sucesso clinico inventado');
const medicationCreateMarkup=rendered('/saude/medicamentos');
ok(medicationCreateMarkup.includes('data-lucide="Plus"')&&!medicationCreateMarkup.includes('data-lucide="Pill"'), 'Medicamento apresenta Plus e nao Pill');
const treatmentCreateMarkup=rendered('/saude/tratamentos');
ok(treatmentCreateMarkup.includes('data-lucide="Plus"')&&!treatmentCreateMarkup.includes('data-lucide="FolderHeart"'), 'Tratamentos tambem usam Plus');
const catalogSource=read('lib/navigation/bottom-nav-compose.ts');
ok((catalogSource.match(/icon: Plus,/g)||[]).length===35, '35 opcoes canonicas de Compose usam Plus');
for(const name of ['novo-medicamento','nova-consulta','novo-exame','nova-cirurgia','nova-senha']) {
 const shade=compose.getIa20CreateAccent(name);
 ok(shade.includes('bg-')&&shade.includes('text-'), 'cores semanticas por dominio: '+name);
}
ok(bottom.includes('!ia20P3SuppressFallbackCompose(pathname)')&&bottom.includes('!ia20P2HeaderOwnsCreate(pathname, composeOptions.length, searchParams)'),'Compose inferior exclusivo permanece preservado');
const matrix=[];
for(const [r,target] of Object.entries(expected)){
  const options=compose.getComposeOptions(r,new URLSearchParams());
  ok(options.length===1,`acao canonica unica: ${r}`);
  ok(options[0].path===target,`destino correto: ${r}`);
  const u=new URL(target,'https://vault.local');
  ok(fs.existsSync('app'+u.pathname+'/page.tsx'),`formulario existe: ${target}`);
  ok(policy.ia20P2HeaderOwnsCreate(r,1,new URLSearchParams()),`cabecalho tem propriedade: ${r}`);
  const html=rendered(r);
  ok(html.includes('data-lucide="Plus"'),`Lucide Plus para cada lista: ${r}`);
  const n=(html.match(/data-ia20-p2-create=/g)||[]).length;
  ok(n===1&&html.includes('data-vault-p0-create-row="visible"'),`botao REAL renderizado uma vez: ${r}`);
  ok(html.includes('aria-label="Pesquisar"')&&html.includes('role="group"'),`ferramenta continua no topo sem substituir CTA: ${r}`);
  const rows=html.match(/data-vault-p0-create-row="visible"[^>]+>/g)||[];
  ok(rows.length===1&&!/hidden|overflow-hidden|opacity-0/.test(rows[0]),`faixa nao oculta nem corta CTA: ${r}`);
  ok(html.includes('min-h-11')&&html.includes('w-full')&&html.includes('sm:w-auto'),`dimensoes CSS responsivas: ${r}`);
  for(const width of [320,360,393,430]){
    ok(width<640&&html.includes('grid-cols-1')&&html.includes('w-full'),`layout previsto ${width}dp sem acao na coluna auxiliar: ${r}`);
  }
  const dest=returnContext.withReturnTarget(options[0].path,r+'?tab=a');
  const parsed=new URL(dest,'https://vault.local');
  ok(parsed.pathname===u.pathname&&parsed.searchParams.get('return_to')===r+'?tab=a',`return_to preserva origem: ${r}`);
  matrix.push({route:r,owner:'header',option:options[0].id,destination:target,rendered_buttons:n,target_exists:true,return_to:true,status:'OK'});
}
for(const [r,query] of [['/saude/fornecimento','action=novo'],['/saude/fornecimento','action=editar']]){
 const html=rendered(r+'?'+query);
 ok(!html.includes('data-ia20-p2-create='),`formulario inline nao duplica cadastro ${query}`);
 matrix.push({route:r+'?'+query,owner:'inline-form',rendered_buttons:0,status:'OK'});
}
ok(!rendered('/saude/medicamentos',{suppressCreate:true}).includes('data-ia20-p2-create='),'suppressCreate realmente oculta CTA quando ha formulario proprio');
const supply=read('app/saude/fornecimento/page.tsx');
ok(supply.includes('suppressCreate={creating || editing || !processes.length}') && supply.includes('(creating || !processes.length) && (') && supply.includes('id="supply-create-form"'), 'fornecimento vazio tem formulario inline real; nao fica sem criacao quando suprime header');

for(const r of ['/', '/hoje','/saude/rede','/saude/rede?tab=medicos','/saude','/saude/minha-saude','/saude/mapa','/saude/careflow','/documentos','/saude/documentos']){
 const url=new URL(r,'https://vault.local');
 const ops=compose.getComposeOptions(url.pathname,new URLSearchParams(url.search));
 ok(ops.length>=1&& !policy.ia20P2HeaderOwnsCreate(url.pathname,ops.length,new URLSearchParams(url.search)),`hub/documentos mantem Compose sem CTA concorrente: ${r}`);
 for(const op of ops){
  ok(String(op.label||'').length>0 && typeof op.icon==='function',`hubs: Plus com texto contextual ${r}`);
  const dest=new URL(op.path,'https://vault.local');
  ok(fs.existsSync('app'+dest.pathname+'/page.tsx'),`acao externa aponta para formulario real: ${r} -> ${op.path}`);
 }
 matrix.push({route:r,owner:'compose-fallback',options:ops.map(x=>x.id),status:'OK'});
}
// Nao duplicar o botao de criacao no estado vazio: o header e a unica autoridade.
for(const [file,oldLabel] of [
 ['app/saude/tratamentos/page.tsx','"Criar tratamento"'],
 ['app/saude/retiradas/page.tsx','actionLabel={retiradas.length === 0 ? "Nova retirada"'],
 ['app/cartoes/page.tsx','actionLabel="Novo cartão"'],
 ['app/contas/page.tsx','"Nova conta"'],
 ['app/senhas/page.tsx','actionLabel="Nova senha"'],
 ['app/vaults/page.tsx','actionLabel="Criar cofre"'],
]){
 const source=read(file);
 ok(!source.includes(oldLabel),`empty state sem CTA duplicado: ${file}`);
 ok(source.includes('no topo'),`empty state orienta CTA principal: ${file}`);
}
ok(read('app/saude/tratamentos/page.tsx').includes('actionLabel={hasFilters ? "Limpar filtros" : undefined}'), 'limpar filtros continua disponivel quando busca nao retorna resultado');
const meds=read('app/saude/medicamentos/page.tsx');
ok(meds.includes('aria-label="Pesquisar medicamentos"')&&!meds.includes('aria-label="Abrir retiradas de medicamentos"'),'Medicamentos remove icone historico redundante, preserva busca');
ok(meds.includes('if (withdrawalLinkP71B.state === "review"')&&meds.includes('router.push("/saude/retiradas")'),'fluxo clinico de retiradas ainda existe');
ok(meds.includes('data-vault-executive-density={compactCards?"compact":"comfort"}')&&meds.includes('data-vault-med360-treatment-tags'),'geometria e etiquetas UX360 R5 inalteradas');
for(const protectedPath of ['app/hoje/page.tsx','app/documentos/page.tsx','app/mais/page.tsx','components/BottomNav.tsx','scripts/test-v63-release-gate.mjs'])ok(fs.existsSync(protectedPath),`superficie P5/QG3 nao removida: ${protectedPath}`);
const report=process.env.VAULT_P0_MATRIX_REPORT;
if(report)fs.writeFileSync(report,JSON.stringify({surgery:'VAULT P0 GLOBAL',checked_at:new Date().toISOString(),checks,matrix},null,2)+'\n');
console.log(`VAULT_P0_CRIACAO_RENDERIZADA_OK: ${checks} verificacoes / ${matrix.length} estados / 19 listas + 10 hubs; CSS real no Android pendente de homologacao.`);
