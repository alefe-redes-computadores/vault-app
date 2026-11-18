'use strict';
/** IA 2.0 P1: contract checks run inside patched Git worktree. No network or data writes. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const read=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const navFile=read('lib/navigation/ia20-root-navigation.ts');
const compiled=ts.transpileModule(navFile,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
check(!compiled.diagnostics?.length,'syntax TypeScript da taxonomia');
const ex={};vm.runInNewContext(compiled.outputText,{exports:ex},{filename:'ia20-root-navigation.js'});
const {IA20_ROOTS,ia20ActiveRoot,ia20IsCareflowOverview,normalizeIa20Route}=ex;
check(Array.isArray(IA20_ROOTS)&&IA20_ROOTS.length===5,'cinco raízes');
check(new Set(IA20_ROOTS.map(x=>x.id)).size===5,'identidade das abas única');
check(IA20_ROOTS.map(x=>x.label).join('|')==='Início|Hoje|Saúde|Documentos|Mais','rótulos humanos');
for(const item of IA20_ROOTS)check(ia20ActiveRoot(item.href)===item.id,'destino ativo '+item.id);
for(const [url,expected] of [
 ['/','home'],['/hoje','hoje'],['/hoje?focus=doses','hoje'],['/saude','saude'],
 ['/saude/minha-saude','saude'],['/saude/careflow','saude'],['/saude/careflow/pressao','saude'],
 ['/saude/medicamentos','saude'],['/saude/rede','saude'],['/saude/pharmalens','saude'],
 ['/documentos','documentos'],['/documentos/detalhes?id=x','documentos'],
 ['/saude/documentos','documentos'],['/saude/documentos/novo','documentos'],
 ['/mais','mais'],['/mais/privacidade','mais'],
 ['/auth/login',null],['/login',null],['/pessoas',null],['/inteligencia/alertas',null],
 ]) check(ia20ActiveRoot(url)===expected,'aba para '+url);
check(normalizeIa20Route('/saude/careflow/?n=1')==='/saude/careflow','normalização sem query');
for(const p of ['episodios','linha-do-tempo','dossie','exames','pressao','sintomas','relatorios'])
 check(ia20IsCareflowOverview('/saude/careflow/'+p),'barra para lista CareFlow '+p);
for(const p of ['/saude/careflow/pressao/novo','/saude/careflow/sintomas/nova','/saude/careflow/modo-medico',
 '/saude/careflow/episodios/detalhes','/saude/careflow/relatorios/pdf','/login'])
 check(!ia20IsCareflowOverview(p),'não forçar barra em tarefa '+p);
const bottom=read('components/BottomNav.tsx');
check(bottom.includes('ia20ActiveRoot(pathname)'), 'ativo com origem, não só igualdade');
check(bottom.includes('aria-label="Navegação principal"'),'acessibilidade da barra');
check(bottom.includes('aria-current={active ? "page" : undefined}'),'aba corrente');
check(bottom.includes('const gridClass = "grid-cols-5"'),'cinco slots reservados');
check(bottom.includes('text-[9px] min-[360px]:text-[10px]'),'rótulos legíveis em 320/360dp');
check(bottom.includes('id: "saude", icon: HeartPulse'),'Saúde em quinto destino');
check(bottom.includes('ia20IsCareflowOverview(normalizedPathname)'),'barra em painéis');
check(bottom.includes('absolute -top-12 right-2'),'FAB não sobrepõe aba central');
check(bottom.includes('getComposeOptions('),'catálogo original Compose mantido');
const compose=read('lib/navigation/bottom-nav-compose.ts');
// FIX2: a cobertura de rotas e comportamental, executada abaixo via getComposeOptions.
// A fonte agrupa /saude, /saude/minha-saude, /saude/mapa e /saude/careflow
// com Array.includes, nao com quatro comparacoes literais independentes.
check(compose.includes('return SAUDE_COMPOSE_OPTIONS;'),'catalogo clinico ainda acessivel');
check(bottom.includes('showCompose && ('),'botão contextual não removido da P1');
check(bottom.includes('getIa20CreateAccent'),'paleta semântica por operação conectada à navegação');
check(bottom.includes('const ComposeIcon = composeOptions.length === 1 ? composeOptions[0].icon : Plus;'),'ícone contextual e menu múltiplo reutilizados');
check(bottom.includes('const createTitle = composeOptions.length === 1 ? composeOptions[0].label : "Adicionar";'),'rótulo contextual claro');
check(bottom.includes('withReturnTarget(composeOptions[0].path, composeReturnTo)'),'ação única conserva retorno da origem');
check(bottom.includes('withReturnTarget(option.path, composeReturnTo)'),'ação no menu múltiplo conserva retorno da origem');
check(bottom.includes('max-w-[min(55vw,190px)]'),'CTA contextual não invade toda a barra em celular pequeno');
check(compose.includes('export function getIa20CreateAccent(id: string)'),'uma única fonte de tom semântico');
check(compose.includes('if (tab === "locais") return LOCAIS_LIST_COMPOSE_OPTIONS;'),'locais mantêm cadastro canônico');
check(compose.includes('if (tab === "consultas") return CONSULTAS_LIST_COMPOSE_OPTIONS;'),'consultas mantêm cadastro canônico');
check(compose.includes('normalizedPathname === "/saude/careflow/episodios"'),'episódios reutilizam criação de consulta sem segundo motor');
check(compose.includes('"/saude/mapa"'),'Explorar não perde acesso ao menu + contextual');

check(bottom.includes('router.replace(path)'), 'troca de abas sem empilhar histórico');
check(bottom.includes('if (path === "/" && typeof window !== "undefined")'),'fallback nativo de Home mantido');
check(bottom.includes('normalizedPathname.includes("/editar")'),'edição continua focada');
const redirect=read('app/saude/page.tsx');
check(redirect.includes('router.replace("/saude/minha-saude")'),'rota /saude no hub único');
const hub=read('components/saude/HealthHubLauncherR5.tsx');
for(const href of ['/saude/medicamentos','/saude/consultas','/saude/careflow/sintomas',
 '/saude/exames','/saude/careflow/pressao','/saude/rede','/saude/mapa'])
 check(hub.includes(href),'acesso essencial '+href);
check(hub.includes('Acessos essenciais')&&hub.includes('Acessos rápidos'),'prioridade diária no Hub');
check(hub.indexOf('Acessos essenciais') < hub.indexOf('Módulos fixados'),'acessos rápidos antes dos favoritos');
check(!hub.includes('HEALTH_GROUPS_R5.map'),'catálogo duplicado removido do Hub');
for(const s of ['const favorites=','const focus=','const query=','NETWORK_SEARCH_R5','withReturnTarget('])
 check(hub.includes(s),'função original preservada '+s);
const clinical=read('lib/navigation/clinical-directory-m150.ts');
check(clinical.includes("export const clinicalDirectoryM150"),'diretório canônico existente');
check((clinical.match(/\{id:'/g)||[]).length>=31,'31 entradas com IDs preservados');
check(clinical.includes("href:'/saude/careflow/pressao'"),'pressão disponível');
check(clinical.includes("href:'/saude/careflow/relatorios'"),'PDFs disponíveis');
check(clinical.includes("href:'/saude/rede'"),'rede disponível');
check(clinical.includes("id:'pharmalens',label:'Conferência e bula'"),'rótulo PharmaLens humano');
const careflow=read('app/saude/careflow/page.tsx');
check(careflow.includes('>Acompanhamento clínico</h1>'),'CareFlow reposicionado');
for(const route of ['/saude/careflow/modo-medico','/saude/careflow/episodios',
 '/saude/careflow/linha-do-tempo','/saude/careflow/dossie','/saude/careflow/exames',
 '/saude/careflow/pressao','/saude/careflow/sintomas','/saude/careflow/relatorios'])
 check(careflow.includes('href:\''+route+'\''),'CareFlow não perdeu rota '+route);
const rede=read('app/saude/rede/page.tsx');
check(rede.includes('Profissionais e locais'),'rede com nome distinto');
check(rede.includes('backTarget'),'origem da Rede preservada');
const r5=read('lib/health-hub/r5.ts');
check(r5.includes('id:"careflow",title:"Acompanhamento clínico"'),'ID favoritos CareFlow mantido');
check(r5.includes('id:"pharmalens",title:"Conferência e bula"'),'ID favoritos PharmaLens mantido');
const switcher=read('components/saude/HealthHubSwitchR5.tsx');
check(switcher.includes('Profissionais e locais')&&switcher.includes('Voltar ao painel de saúde'),'rede aninhada com retorno para Saúde');
check(!switcher.includes('Alternar hubs de saúde'),'sem dois hubs concorrentes');
const g=read('scripts/test-v63-release-gate.mjs');
check(g.includes('"scripts/test-vault-ia20-p1.cjs"'),'teste no V63');
check(g.includes('"scripts/test-vault-ci360-p6-p5-macro2.cjs"'),'regressão macro2 mantida');
check(g.includes('"scripts/test-vault-ci360-p6-p6-macro3.cjs"'),'regressão macro3 mantida');
check(read('scripts/test-v71-1-empirical-repair-contract.mjs').includes('network.includes("Profissionais e locais")'),'regressão V71 adaptada ao novo nome, mantendo demais contratos');
check(careflow.includes('withReturnTarget(href,"/saude/careflow")'),'links do CareFlow preservam origem no retorno');

// Create coverage: run the actual Compose registry with icon-only dependency stubs.
const createSource=read('lib/navigation/bottom-nav-compose.ts');
const compiledCompose=ts.transpileModule(createSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
check(!compiledCompose.diagnostics?.length,'sintaxe do catálogo Compose');
const stubbed={exports:{}};
const icons=new Proxy({}, {get(_o,k){return k==='__esModule'?true:()=>null;}});
vm.runInNewContext(compiledCompose.outputText,{exports:stubbed.exports,require:name=>{if(name==='lucide-react')return icons;throw Error('import inesperado: '+name);}}, {filename:'ia20-compose.js'});
const {getComposeOptions,getIa20CreateAccent}=stubbed.exports;
check(typeof getComposeOptions==='function'&&typeof getIa20CreateAccent==='function','autoridade canônica de criação preservada');
const get=(route)=>{const url=new URL(route,'https://vault.local');return getComposeOptions(url.pathname,new URLSearchParams(url.search));};
const creations=[
 ['/', '/saude/medicamentos/novo'],
 ['/saude','/saude/medicamentos/novo'],
 ['/saude/minha-saude','/saude/medicamentos/novo'],
 ['/saude/mapa','/saude/medicamentos/novo'],
 ['/saude/careflow','/saude/medicamentos/novo'],
 ['/saude/careflow/episodios','/saude/consultas/nova'],
 ['/hoje','/saude/registros/novo'],
 ['/documentos','/documentos/novo'],
 ['/saude/documentos','/saude/documentos/novo'],
 ['/saude/medicamentos','/saude/medicamentos/novo'],
 ['/saude/consultas','/saude/consultas/nova'],
 ['/saude/medicos','/saude/medicos/novo'],
 ['/saude/farmacias','/saude/farmacias/novo'],
 ['/saude/hospitais','/saude/hospitais/novo'],
 ['/saude/locais','/saude/locais/novo'],
 ['/saude/tratamentos','/saude/tratamentos/novo'],
 ['/saude/retiradas','/saude/retiradas/nova'],
 ['/saude/renovacao','/saude/renovacao/nova'],
 ['/saude/exames','/saude/exames/novo'],
 ['/saude/cirurgias','/saude/cirurgias/nova'],
 ['/saude/cids','/saude/cids/novo'],
 ['/saude/registros','/saude/registros/novo'],
 ['/saude/fornecimento','/saude/fornecimento?action=novo'],
 ['/pessoas','/pessoas/novo'],
 ['/cartoes','/cartoes/novo'],
 ['/contas','/contas/novo'],
 ['/vaults','/vaults/novo'],
 ['/senhas','/senhas/novo'],
 ['/saude/rede?tab=medicos','/saude/medicos/novo'],
 ['/saude/rede?tab=farmacias','/saude/farmacias/novo'],
 ['/saude/rede?tab=locais','/saude/locais/novo'],
 ['/saude/rede?tab=consultas','/saude/consultas/nova'],
 ['/saude/rede?tab=tratamentos','/saude/tratamentos/novo'],
];
for(const [route,target] of creations){
 const options=get(route);
 check(options.some(x=>x.path===target),'criação contextual: '+route);
 check(options.every(x=>x.path.startsWith('/')&&!x.path.startsWith('//')),'destino local: '+route);
}
for(const route of ['/mais','/saude/brain-v7','/saude/careflow/pressao','/saude/careflow/sintomas','/saude/careflow/exames','/saude/careflow/dossie','/saude/careflow/relatorios'])
 check(get(route).length===0,'sem criação duplicada ou fictícia: '+route);
for(const id of ['nova-consulta','nova-farmacia','novo-medicamento','novo-tratamento','novo-exame','novo-registro'])
 check(getIa20CreateAccent(id).includes('text-slate-950'),'cor legível por entidade: '+id);
check(getIa20CreateAccent('nova-consulta')!==getIa20CreateAccent('nova-farmacia'),'azul e verde distintos');
check(getIa20CreateAccent('novo-tratamento')!==getIa20CreateAccent('novo-medicamento'),'violeta e âmbar distintos');
check(bottom.includes('const ComposeIcon = composeOptions.length === 1 ? composeOptions[0].icon : Plus'),'ícone por ação real');
check(bottom.includes('const createTitle = composeOptions.length === 1 ? composeOptions[0].label : "Adicionar"'),'nome contextual do botão');
check(bottom.includes('className={`absolute -top-12 right-2')&&bottom.includes('${createAccent}'),'ação flutuante contextual, fora dos cinco slots');
check(!bottom.includes('col-start-4')&&!bottom.includes('-translate-x-1/2 -translate-y-[34%]'),'botão + central removido');
check(bottom.includes('withReturnTarget(composeOptions[0].path, composeReturnTo)')&&bottom.includes('withReturnTarget(option.path, composeReturnTo)'),'criação preserva caminho de retorno');
check(bottom.includes('aria-haspopup={composeOptions.length > 1 ? "dialog" : undefined}'),'sheet contextual acessível');
console.log(`IA20 P1: ${checks} contratos dirigidos OK; dados clínicos preservados, navegação 5 raízes, Hub único e criação contextual.`);
