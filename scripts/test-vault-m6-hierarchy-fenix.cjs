#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
const ok=(v,n)=>{assert(v,`VAULT M6: ${n}`);console.log(`✓ ${++checks}: ${n}`);};
const paths=[
 'components/BottomNav.tsx','lib/navigation/bottom-nav-compose.ts',
 'components/home/HomeCommandCenter.tsx','components/home/HomeCareOrganizationTiles.tsx',
 'app/saude/minha-saude/page.tsx','components/saude/HealthAvatar.tsx',
 'app/saude/medicamentos/page.tsx','components/saude/MedicationPortfolioOverview.tsx',
 'app/mais/page.tsx','scripts/test-v44-contextual-fab-contract.mjs',
 'scripts/test-v63-release-gate.mjs',
];
const [nav,compose,home,organization,health,avatar,meds,overview,more,legacy,gate]=paths.map(read);
for(const [i,p] of paths.entries()){
 if(p.endsWith('.mjs'))continue;
 const tree=ts.createSourceFile(p,[nav,compose,home,organization,health,avatar,meds,overview,more][i],ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 if(tree.parseDiagnostics.length){
   const diagnostics=tree.parseDiagnostics.map(d=>{
     const pos=tree.getLineAndCharacterOfPosition(d.start||0);
     return `${p}:${pos.line+1}:${pos.character+1}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`;
   });
   throw new Error(`VAULT M6 R3 — erro sintático identificado:\n${diagnostics.join('\n')}`);
 }
 ok(true,`${p}: sintaxe TS/TSX`);
}
ok(nav.includes('from "@/lib/navigation/bottom-nav-compose"') && !nav.includes('const SAUDE_COMPOSE_OPTIONS'), 'FAB extrai opções estáticas do componente sem duplicar tabelas');
ok(compose.includes('export function getComposeOptions(') && compose.includes('export function getOptionColorClass('),'catálogo de rotas e cores público e sem estado');
ok(nav.includes('normalizeNavPathname(pathname),') && compose.includes('const normalizedPathname = pathname;'),'normalização ocorre só na borda, sem mudar parâmetros');
ok(nav.includes('router.replace(path);') && nav.includes('router.push(') && nav.includes('VAULT_NORMALIZE_PATHNAME_V40'), 'abas replace; cadastros push; normalização V40');
ok(nav.includes('pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]') && nav.includes('bg-emerald-400 text-void'),'safe area e FAB premium preservados');
ok(compose.includes('path: "/saude/retiradas/nova"') && compose.includes('path: "/saude/medicamentos/novo"'),'criação continua apontando para os mesmos formulários');
ok(!/(?:\bfetch\(|\.add\(|\.put\(|db\.|supabase|safeAdd\()/.test(compose),'catálogo puro não acessa dados clínicos');
// Execute actual extracted TS module in isolation (lucide icons are presentational only).
const js=ts.transpileModule(compose,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exportsBox={exports:{}};new Function('module','exports','require',js)(exportsBox,exportsBox.exports,id=>{
 if(id==='lucide-react')return new Proxy({}, {get:(_obj,key)=>String(key)});
 throw Error('Import inesperado: '+id);
});
const {getComposeOptions,getOptionColorClass}=exportsBox.exports;
const options=(path,search='')=>getComposeOptions(path,new URLSearchParams(search));
ok(options('/').some(x=>x.path==='/saude/medicamentos/novo'),'FAB da Home mantém medicamento');
ok(options('/hoje').some(x=>x.path==='/hoje?action=dose'),'FAB do Hoje preserva dose contextual');
ok(options('/saude/medicamentos').length===1 && options('/saude/medicamentos')[0].path==='/saude/medicamentos/novo','FAB da listagem abre cadastro de medicamento');
ok(options('/saude/fornecimento').length===1 && options('/saude/fornecimento')[0].path==='/saude/fornecimento?action=novo','FAB Fornecimento abre criação contextual sem ação duplicada');
ok(options('/saude/rede','tab=medicos').some(x=>x.path==='/saude/medicos/novo'),'FAB da Rede permanece contextual');
ok(options('/inteligencia').length===0 && options('/mais').length===0,'Central e Mais não exibem FAB de cadastro indevido');
ok(getOptionColorClass('cartao').includes('rose-') && getOptionColorClass('consulta').includes('violet-'),'cores semânticas além de azul');
ok(!getOptionColorClass('novo-cofre').includes('text-ice'),'fallback visual neutro');
ok(legacy.includes('const compose =') && legacy.includes('compose.includes('),'V44 valida catálogo real e não implementação removida');
const v272=read('scripts/test-v272-avatar-supply-dose-resilience.cjs');
const preApk=read('scripts/test-pre-apk-intelligence-nav-contract.mjs');
ok(v272.includes('supplyChoices[0].path===') && v272.includes('lib/navigation/bottom-nav-compose.ts') &&
  v272.includes('new Function('), 'V272 verifica destino real do Fornecimento na fábrica extraída');
ok(preApk.includes('compose.includes(') && preApk.includes('normalizedPathname.startsWith(\"/inteligencia\")') &&
  !preApk.includes('bottom.includes(\"/inteligencia\")'), 'pré-APK verifica contexto de Inteligência no catálogo extraído');
// Home: access exists but is no longer an exposed second card in the lower section.
const disclosureIdx=home.indexOf('id="home-acessos-medicamentos"');
const medLinkIdx=home.indexOf('go("/saude/medicamentos")');
ok(disclosureIdx>0 && medLinkIdx>disclosureIdx,'atalho duplicado da Home está dentro da seção recolhida');
ok(home.includes('<HomeSupplyAccessTiles') && home.includes('withdrawalPath="/saude/retiradas"'),'retiradas e fornecimento preservados');
ok(home.includes('id="home-outras-areas" title=') && !home.includes('id="home-outras-areas" defaultOpen') && home.includes('Saúde e rotina'),'hierarquia geral e expansão padrão preservadas');
ok(organization.includes('Documentos de saúde') && organization.includes('text-amber-300') && home.includes('networkTone="text-emerald-300/80"'),'área inferior abandona repetição de azul');
// Fenix: first interaction MUST be local, navigation exists only as explicit sheet action.
const brainStart=health.indexOf('onBrainSelect={()=>{');
const brainEnd=health.indexOf('}} onDeviceSelect=',brainStart);
ok(brainStart>0 && brainEnd>brainStart,'handler Fênix localizado');
const brainHandler=health.slice(brainStart,brainEnd);
ok(brainHandler.includes('setSelectedInsight(insight)') && brainHandler.includes('setBrainSummaryOpen(true)'), 'toque no cérebro abre detalhe local ou resumo');
ok(!brainHandler.includes('goFromHealth(') && !brainHandler.includes('router.push('),'toque no cérebro não muda página sem consentimento');
ok(health.includes('onOpenCentral={selectedInsight?') && health.includes('setSelectedInsight(null);goFromHealth('),'navegação explícita dentro da Central preservada');
ok(avatar.includes('Ver contexto registrado · não é diagnóstico'),'Fênix explica o significado do toque');
ok(avatar.includes('<span aria-hidden="true">Ver</span></button>:null}') && !avatar.includes('<span aria-hidden="true">Ver</span></button>:null>'),'botão da Fênix mantém JSX ternário bem formado');
// Medications: no new reads; summaries retained, more useful hierarchy in first fold.
ok(meds.includes('Organização da lista de medicamentos') && meds.includes('Prioridades primeiro · rotina e SOS separados'),'lista comunica ordem e categorias');
ok(meds.includes('defaultOpen={false}') && meds.includes('medicamentos-panorama'),'panorama secundário recolhido inicialmente');
ok(meds.includes('medsPrioridade.map(renderCard)') && meds.includes('medsSOS.map(renderCard)'),'grupos canônicos não alterados');
ok(meds.includes('setQuickDoseMedId(med.id!)') && meds.includes('regulatoryProfile?.label'),'dose rápida e receita regulatória intactas');
ok(meds.includes('VAULT_V318_COMPACT_IDENTITY') && meds.includes('VAULT_MEDICATION_LIST_HIERARCHY_V98'),'hierarquia clínica anterior preservada');
ok(overview.includes('text-amber-300') && more.includes('border-rose-400/20 bg-rose-400/10 text-rose-300'),'indicadores do panorama e cartões com paleta semântica');
ok(gate.includes('"scripts/test-vault-m6-hierarchy-fenix.cjs"')&&gate.includes('"scripts/test-vault-m5-document-form-fenix.cjs"')&&gate.includes('"scripts/test-vault-m4-archive-avatar.cjs"'),'gate cumulativo M4/M5/M6');
console.log(`VAULT M6: ${checks} verificações de UX, fluxo, navegação, semântica, Fênix e testes TS/TSX aprovadas.`);
