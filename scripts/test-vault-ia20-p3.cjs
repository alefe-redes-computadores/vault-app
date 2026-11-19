#!/usr/bin/env node
'use strict';
/* IA 2.0 P3 / QG2 — behavior-preserving creation ownership; no clinical write. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
let n=0;const read=p=>fs.readFileSync(p,'utf8');
function ok(value,label){assert.ok(value,'IA20 P3: '+label);n++}
const files=[
 'app/saude/fornecimento/page.tsx',
 'components/list/ListPageHeader.tsx',
 'components/list/ContextualCreateP2.tsx',
 'components/BottomNav.tsx',
 'lib/navigation/ia20-p2-create.ts',
 'lib/navigation/bottom-nav-compose.ts',
 'scripts/test-v63-release-gate.mjs',
];
for(const p of files){
 const src=read(p), kind=p.endsWith('.tsx')?ts.ScriptKind.TSX:p.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS;
 const ast=ts.createSourceFile(p,src,ts.ScriptTarget.Latest,true,kind);
 ok(ast.parseDiagnostics.length===0,`TS/TSX sintaticamente valido ${p}: ${ast.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join(', ')}`);
}
const [supply,header,button,bottom,helper,compose,gate]=files.map(read);
function pure(path,deps={}) {
 const m={exports:{}};
 const js=ts.transpileModule(read(path),{fileName:path,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('module','exports','require',js)(m,m.exports,id=>{if(Object.hasOwn(deps,id))return deps[id];throw new Error('import nao autorizado '+id)});
 return m.exports;
}
const policy=pure('lib/navigation/ia20-p2-create.ts');
const icons=new Proxy({}, {get:(_o,key)=>key==='__esModule'?true:()=>null});
const catalog=pure('lib/navigation/bottom-nav-compose.ts',{'lucide-react':icons});
const options=(path,query='')=>catalog.getComposeOptions(path,new URLSearchParams(query));
ok(policy.IA20_P2_LOCAL_CREATE_ROUTES.length===19,'19 listas P2 preservadas');
ok(policy.ia20P3SuppressFallbackCompose('/saude/fornecimento'),'sem FAB concorrente no fornecimento');
ok(policy.ia20P3SuppressFallbackCompose('/saude/fornecimento///?action=novo'),'normaliza slash/query no fornecimento');
for(const path of ['/', '/hoje', '/saude/minha-saude','/saude/mapa','/saude/rede','/documentos','/saude/documentos','/saude/consultas']){
 ok(!policy.ia20P3SuppressFallbackCompose(path),`outras areas continuam sem supressao indevida: ${path}`);
}
const states=[
 {query:'',creating:false,editing:false,hasProcesses:true,header:true},
 {query:'action=novo',creating:true,editing:false,hasProcesses:true,header:false},
 {query:'action=editar',creating:false,editing:true,hasProcesses:true,header:false},
 {query:'',creating:true,editing:false,hasProcesses:true,header:false},
 {query:'',creating:false,editing:true,hasProcesses:true,header:false},
 {query:'',creating:false,editing:false,hasProcesses:false,header:false},
];
for(const x of states){
 const params=new URLSearchParams(x.query);
 const count=options('/saude/fornecimento',x.query).length;
 ok(count===1,'catalogo de fornecimento tem uma criacao canonica');
 const local=policy.ia20P2HeaderOwnsCreate('/saude/fornecimento',count,params)
    && !(x.creating||x.editing||!x.hasProcesses);
 const global= count>0 && !policy.ia20P2HeaderOwnsCreate('/saude/fornecimento',count,params)
    && !policy.ia20P3SuppressFallbackCompose('/saude/fornecimento');
 ok(local===x.header && global===false,`Fornecimento ${JSON.stringify(x)}: unica acao, ou so formulario`);
}
ok(supply.includes('suppressCreate={creating || editing || !processes.length}'),'formulario real informa estado ao cabeçalho, inclusive estado vazio');
ok(supply.includes('[creating, setCreating] = useState(')&&supply.includes('[editing, setEditing] = useState('),'mesmos estados canonicos de form, sem segundo motor');
ok(supply.includes('id="supply-create-form"')&&supply.includes('<ProcessForm personId={personId}'),'formulario original permanece');
ok(supply.includes('onClick={() => setEditing((v) => !v)}')&&supply.includes('repo.updateProcess(personId, process.id, v)'),'edicao e update originais preservados');
ok(header.includes('suppressCreate?: boolean;')&&header.includes('suppressCreate = false'),'prop opcional nao quebra demais listas');
ok(header.includes('!suppressCreate && ia20P2HeaderOwnsCreate(pathname, p2Options.length, searchParams)'),'cabecalho respeita formulario ativo');
ok(header.includes('rightAction')&&header.includes('<ContextualCreateP2'),'ferramentas e CTA de lista preservados');
ok(bottom.includes('!ia20P3SuppressFallbackCompose(pathname)')&&bottom.includes('ia20P2HeaderOwnsCreate(pathname, composeOptions.length, searchParams)'),'FAB global exclusivo, sem remover contrato P2');
ok(bottom.includes('showCompose && (')&&bottom.includes('withReturnTarget(option.path, composeReturnTo)'),'sheet e retorno contextual dos hubs mantidos');
ok(button.includes('withReturnTarget(option.path, origin)'),'return_to clinico preservado');
ok(button.includes('window.setTimeout(() => setNavigating(false), 8000)')&&button.includes('window.clearTimeout(recovery)'),'navegacao travada se recupera sem vazamento de timer');
ok(button.includes('catch { setNavigating(false); }')&&button.includes('disabled={navigating}')&&button.includes('aria-busy={navigating}'),'feedback nao congela e previne toque repetido');
ok(!/(?:\bdb\.|\.insert\(|\.put\(|supabase|\.delete\()/.test(button),'CTA nao grava clinica nem simula sucesso');
for(const path of ['/documentos','/saude/documentos']){
 const o=options(path);
 ok(o.length===1 && !policy.ia20P2HeaderOwnsCreate(path,o.length,new URLSearchParams()),`Documentos ${path} usam fallback original`);
 const u=new URL(o[0].path,'https://vault.local');
 ok(fs.existsSync('app'+u.pathname+'/page.tsx'),`formulario real preservado ${o[0].path}`);
}
ok(gate.split('"scripts/test-vault-ia20-p3.cjs"').length===2,'P3 uma unica vez no V63');
ok(gate.includes('"scripts/test-vault-ia20-p1.cjs"')&&gate.includes('"scripts/test-vault-ia20-p2.cjs"'),'P1 e P2 continuam nos gates');
ok(read('components/saude/HealthHubLauncherR5.tsx').includes('NETWORK_SEARCH_R5'),'favoritos e busca R5 intactos');
console.log(`VAULT_IA20_P3_QG2_OK: ${n} contratos; seis modos de Fornecimento; Documentos e fallback preservados`);
