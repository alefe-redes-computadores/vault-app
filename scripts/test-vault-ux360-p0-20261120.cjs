#!/usr/bin/env node
'use strict';
// P0: asserts presentation behavior and canonical access; no users/DB/network required.
const assert = require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
const files={
  list:'app/saude/medicamentos/page.tsx',
  listcard:'components/list/ListCard.tsx',
  detail:'app/saude/medicamentos/detalhes/page.tsx',
  journey:'components/saude/MedicationTreatmentJourneyD2.tsx',
  knowledge:'lib/medication-intelligence/knowledge-resolver-m153p4.ts',
  modal:'components/saude/MedicationSheet360R3.tsx',
  rx:'components/saude/MedicationPrescriptionCard.tsx',
  home:'components/home/HomeCommandCenter.tsx',
  nav:'components/BottomNav.tsx',
  css:'app/globals.css',
  episode:'app/saude/careflow/episodios/page.tsx',
  brain:'components/saude/BrainReturnCardD3.tsx',
  hub:'components/saude/MedicationDetailCareHubM148.tsx',
  summary:'components/saude/MedicationJourneySummary.tsx',
};
const read = p => fs.readFileSync(p,'utf8');
const src = Object.fromEntries(Object.entries(files).map(([id,p])=>[id,read(p)]));
let count=0;
const ok=(condition,label)=>{assert.ok(condition,`UX360 P0 ${label}`);console.log('UX360_P0_OK',++count,label)};
for(const [id,path] of Object.entries(files)){
  if(!/\.tsx?$/.test(path))continue;
  const ast=ts.createSourceFile(path,src[id],ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(!ast.parseDiagnostics.length,`Parser TSX ${path}`);
  if(!path.endsWith('tsx'))continue;
  const duplicates=[];
  const visit=n=>{
    if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
      const attrs=n.attributes.properties.filter(ts.isJsxAttribute).map(a=>a.name.getText(ast));
      for(const a of attrs)if(attrs.indexOf(a)!==attrs.lastIndexOf(a))duplicates.push(a);
    }
    ts.forEachChild(n,visit);
  };visit(ast);
  ok(!duplicates.length,`Sem atributos JSX duplicados ${path}`);
}
const {list,listcard,detail,home,nav,css,episode,brain,hub,summary}=src;
ok(listcard.includes('grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-2')&&listcard.includes('col-start-2 row-start-1 min-w-0'),'Grid único do medicamento: ícone e conteúdo compartilham eixo');
ok(!list.includes('data-vault-med360-header className="flex min-w-0 w-full items-center gap-1.5 pl-11"')&&!list.includes('min-w-0 pl-11 line-clamp-1'),'Alinhamentos manuais duplicados removidos');
ok(list.includes('data-vault-r5-active-ingredient')&&list.includes('showActiveIngredient && <span')&&list.includes('className="sr-only" title={`Princípio ativo: ${activeIngredient}`}'),'Princípio ativo visível colado ao título e a11y preservada');
ok(list.includes('data-vault-executive-density={compactCards?"compact":"comfort"}')&&list.includes('chooseCardDensity(true)')&&list.includes('chooseCardDensity(false)'),'Compacto e Conforto continuam controláveis');
ok(list.includes('data-vault-r5-comfort-context className="pointer-events-auto relative z-20 flex min-w-0 flex-wrap')&&!list.includes('overscroll-x-contain pb-0.5'),'Contextos quebram linha sem clipping horizontal');
ok(!list.includes('SUS · cadastrado')&&!list.includes('Comprado · cadastrado')&&!list.includes('Etiqueta: ${med.laboratorio_etiqueta}')&&list.includes('med.tipo_aquisicao === "sus" ? "SUS"'),'Labels curtas e fonte preservada');
ok(list.includes('data-vault-r5-context="fabricante"')&&list.includes('openMedicationSheet360("ficha")')&&list.includes('data-vault-r5-context="receita"')&&list.includes('openMedicationSheet360("receita")'),'Chips Lucide clicáveis continuam abrindo contexto real');
ok(list.includes('Documento vinculado')&&list.includes('whitespace-normal break-words rounded-lg border border-violet-300/25'),'Documento vinculado sem truncamento');
ok(list.includes('data-vault-r4-main-action')&&list.includes('actionLayoutM150P3.primary === "dose" ? quickActionButtonM150P3 : null')&&list.includes('data-vault-med360-microbanner'),'Dose/estoque/alerta permanecem na mesma autoridade');
ok(detail.indexOf('<MedicationRoutineSummary')<detail.indexOf('<MedicationKnowledgePanelM153P4')&&detail.indexOf('id="medicamento-receita"')<detail.indexOf('<MedicationKnowledgePanelM153P4'),'Rotina/estoque/receita precedem conhecimento avançado');
ok(detail.includes('id="medicamento-contexto-avancado"')&&detail.includes('Explorar todas as áreas do medicamento'),'Conhecimento e navegação completos, sob demanda');
ok(detail.includes('Conferir datas documentais')&&detail.includes('firstRecordedDose={dosesTomadas')&&detail.includes('MedicationJourneySummary'),'Uma jornada progressiva, com datas de dose existentes');
ok(detail.includes('med.data_receita && journeySnapshot.prescriptions === 0')&&detail.includes('Receita informada no cadastro'),'Receita no cadastro não é confundida com contador de eventos separados');
ok(detail.includes('title={`Laboratório da etiqueta visual: ${med.laboratorio_etiqueta}`}')&&detail.includes('<Factory size={12}'),'Identidade do fabricante curta mas com origem explícita');
ok(hub.includes('showOccurrences = false')&&hub.includes('showOccurrences && <button'),'Ocorrências irrelevantes não surgem em todo medicamento');
ok(home.includes('items-start max-[349px]:grid-cols-1')&&home.includes('min-h-[76px]')&&home.includes('${viva ? "h-auto self-start" : "h-full"}')&&!home.includes('className="group flex h-full min-h-[76px]'),'Home mantém toque 76px e altura independente quando Viva está ativo');
ok(nav.includes('renderComposeButton(true)')&&nav.includes('renderComposeButton(false)')&&nav.includes('pathname === "/"')&&nav.includes('pathname !== "/"'),'Botão Adicionar na Home integrado sem cobrir cards');
ok(nav.includes('data-vault-home-compose')&&css.includes('nav.vault-bottom-nav [data-vault-home-compose]'),'Safe Area reserva altura do botão integrado na Home');
ok(hub.includes('Laboratório informado')&&hub.includes('Etiqueta declarada no cadastro'),'Detalhes com fabricante curto e procedência mantida');
ok(nav.includes('grid-cols-5')&&nav.includes('getComposeOptions')&&nav.includes('handleComposePress'),'Cinco abas e menu Compose preservados');
ok(css.includes('vault-episode-compact')&&episode.includes('vault-adaptive-tail vault-episode-compact'),'Respiro da subtela sem faixa preta estrutural');
ok(brain.includes('Preparação para o retorno')&&!brain.includes('Brain 360 · Continuidade'),'Jargão técnico fora do kicker');
ok(summary.includes('label: "Receitas"')&&summary.includes('Sem evento separado')&&!summary.includes('label: "Eventos de receita"'),'Categoria Receitas preservada; zero evento separado não nega receita do cadastro');
// Teste executável da ordenação de eventos factuais: dose pode anteceder receita.
const requireMock=(mod, mocks)=>{
  const code=ts.transpileModule(src[mod],{fileName:files[mod],compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const m=new Module(files[mod],module);
  m.require=name=>{if(Object.hasOwn(mocks,name))return mocks[name];throw Error('Import não autorizado no teste '+mod+': '+name)};
  m._compile(code,files[mod]);return m.exports;
};
const jsx=(type,props)=>({type,props:props||{}});
const fakeJSX={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'}};
const renderer=requireMock('journey',fakeJSX);
const element=renderer.MedicationTreatmentJourneyD2({prescriptionDate:'2026-09-10',acquisitionDate:'2026-11-01',firstRecordedDose:'2026-08-24T10:00:00-03:00',temporary:false});
const labels=[];const walk=node=>{
  if(node==null)return;
  if(Array.isArray(node)){node.forEach(walk);return;}
  if(typeof node==='object'){
    if(node.type==='p' && typeof node.props?.children==='string' && /Prescrição declarada|Aquisição registrada|Dose mais antiga encontrada/.test(node.props.children))labels.push(node.props.children);
    walk(node.props?.children);
  }
};walk(element);
ok(JSON.stringify(labels)===JSON.stringify(['Dose mais antiga encontrada','Prescrição declarada','Aquisição registrada']),'Datas reais ordenadas, não etapas obrigatórias');
const knowledge=requireMock('knowledge',{}).resolveMedicationKnowledgeM153P4({formato:'partido'});
ok(knowledge.facts.some(f=>f.label==='Formato informado'&&f.value==='Comprimido partido (formato visual)'),'Formato humano sem alegar apresentação oficial');

const legacyGeometryContracts=[
 'scripts/test-vault-quality-gate-qg1.cjs',
 'scripts/test-vault-m136-visual-navigation.cjs',
 'scripts/test-vault-m139-global-visual.cjs',
 'scripts/test-vault-m141-visual-viewport.cjs',
];
for(const contract of legacyGeometryContracts){
 const text=read(contract);
 ok(text.includes('grid-cols-2 gap-2 items-start') && !text.includes('grid-cols-2 gap-2 items-stretch'),`Contrato ${contract}: geometria Home Viva atualizada sem aceitar stretch`);
}
ok(home.includes('min-h-[76px]')&&home.includes('touch-manipulation')&&home.includes('${viva ? "h-auto self-start" : "h-full"}')&&home.includes('${viva?"!grid-cols-1":""}'),'Home mantém 76px, toque e uma coluna contextual no Android');

const m138Source=read('scripts/test-vault-m138-visual-identity.cjs');
const v196Source=read('scripts/test-v196-progressive-shell-avatar.cjs');
const ia20Source=read('scripts/test-vault-ia20-p1.cjs');
ok(m138Source.includes('Laboratório da etiqueta visual: ${med.laboratorio_etiqueta}')&&m138Source.includes('<Factory size={12}')&&m138Source.includes("!detail.includes('Etiqueta visual · {med.laboratorio_etiqueta}')"),'M138 verifica fonte na acessibilidade, sem prefixo desnecessário');
ok(v196Source.includes('homeMedClasses=qg1.extractClassAfter')&&v196Source.includes("homeMedClasses.includes('min-h-[76px]')")&&v196Source.includes('qg1.homePrimaryMinHeightQG1(command,76)'),'V196 usa classes reais e exige toque mínimo, sem regex estática obsoleta');
ok(ia20Source.includes('renderComposeButton(true)')&&ia20Source.includes('renderComposeButton(false)')&&ia20Source.includes('grid-cols-5'),'IA20 exige Compose contextual sem perder cinco abas');
ok(src.summary.includes('label: "Receitas"')&&src.summary.includes('Sem evento separado')&&detail.includes('Receita informada no cadastro'),'Receitas preservadas em M60/M51/M12, com contador factual distinguindo cadastro');
console.log(`UX360_P0_CONTRATOS_APROVADOS | total=${count} | sem dados/estoque alterados`);
