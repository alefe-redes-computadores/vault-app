#!/usr/bin/env node
// M148 P1: testes de integração não-destrutivos; não leem dados privados.
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
let n=0;
const read=p=>fs.readFileSync(p,'utf8');
const ok=(truth,label)=>{assert.ok(truth,'M148 P1: '+label);n++};
const paths=[
  'app/saude/medicamentos/page.tsx',
  'app/saude/minha-saude/page.tsx',
  'components/list/ListCard.tsx',
  'components/saude/MedicationFormatIcon.tsx',
];
for(const p of paths){
  const t=read(p);const source=ts.createSourceFile(p,t,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  ok(!source.parseDiagnostics.length,`${p}: TSX sintaticamente válido`);
}
const med=read(paths[0]);const health=read(paths[1]);const card=read(paths[2]);const icon=read(paths[3]);
ok(icon.includes('normalizedPillV8('),'ícones relacionais usam normalização da mesma apresentação V8');
for(const shape of ['capsula','oblongo','oblongo_sulcado','comprimido','partido','gota','injecao','adesivo'])ok(icon.includes(shape),`formato ${shape} ilustrado`);
ok(icon.includes('useId()')&&icon.includes('p.first')&&icon.includes('p.second'),'gradientes únicos e cores declaradas preservados');
ok(icon.includes('size = 20')&&icon.includes('interface MedicationFormatIconProps'),'interface original do ícone mantida');
ok(med.includes('<MedicationFormatIcon formato={med.formato} cores={med.cores} size={24} />'),'lista consome ícone canônico com cores reais');
ok(med.includes('VAULT_M144_LIST_ENTRY')&&med.includes('router.push("/saude/central-m144?return_to=%2Fsaude%2Fmedicamentos")'),'acesso contextual à central preservado');
ok(!med.includes('mx-4 mb-5 rounded-2xl border border-emerald-400/15 bg-surface/60 p-3'),'botão solto no rodapé removido');
ok(med.indexOf('VAULT_M144_LIST_ENTRY')<med.indexOf('/* DOSE RÁPIDA */'),'central movida para a área de organização');
ok(health.includes('goFromHealth("/saude/central-m144")'),'Minha Saúde oferece entrada para ocorrências, ciclos e vacinas');
ok(card.includes('softRail?: boolean')&&card.includes('softRail = false')&&med.includes('softRail'),'tarja lateral atenuada apenas opt-in');
ok(med.includes('setSelectedRegulatory(regulatoryProfile)')&&med.includes('regulatoryProfile?.label'),'classificação regulatória interativa preservada');
ok(med.includes('rail={(regulatoryProfile || receita)')&&med.includes('writingMode: "vertical-rl"'),'M136/V76: faixa regulatória original visível e clicável');
ok((med.match(/setSelectedRegulatory\(regulatoryProfile\)/g)||[]).length===1,'V328: apenas um handler de classificação regulatória');
ok(card.includes('softRail ? "opacity-75"'),'M148 FIX1: borda visual menos intensa sem perder a largura e o texto');
ok(med.includes('!isSuspenso && canQuickDose && quickDoseLabel')&&med.includes('isSuspendedSOSM147'),'proteções de dose e SOS suspenso intactas');
ok(med.includes('MedicationOperationalStrip today={todayStatus}')&&med.includes('humanizeStockText(textoEstoquePrincipal)'),'informação de dose e saldo preservada');
ok(med.includes('medicationCareStageNeedsAttention(')&&med.includes('medicationListAttentionReasonsM143('),'prioridade M146 e horário M143 preservados');
ok(med.includes('density="compact"')&&med.includes('compactTight={compactCards}'),'controles de densidade preservados');
ok(med.includes('className="min-h-0"')&&!med.includes('min-h-[142px]'),'M109: cartões flexíveis sem altura mínima artificial');
const overviewP9=read('components/saude/MedicationPortfolioOverview.tsx');
ok(overviewP9.includes('text-[10px] font-bold uppercase') && overviewP9.includes('min-h-10')
  && !overviewP9.includes('min-h-[64px]'),
  'P9: resumo operacional e proxima decisao compactos e acionaveis');
const activeGate=read('scripts/test-v63-release-gate.mjs');
ok(activeGate.split('"scripts/test-vault-m148-p1.cjs"').length===2,'novo contrato cadastrado uma única vez');
// Execução de SVG real (sem DOM e sem dados da pessoa): JSX transpilado + mocks delimitados.
const Module=require('node:module');
function compileMock(file,imports){
  const js=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const m=new Module(file,module);
  m.require=(name)=>{if(Object.prototype.hasOwnProperty.call(imports,name))return imports[name];throw new Error('M148 import inesperado no teste: '+name);};
  m._compile(js,file);return m.exports;
}
const domain=compileMock('lib/health-intelligence/visual-studio-v8.ts',{'./brain-v7-universal':{validBrainDayV7:()=>true,shiftBrainDayV7:()=>''}});
const jsx=(type,props)=>({type,props:props||{}});
let uniq=0;
const ui=compileMock('components/saude/MedicationFormatIcon.tsx',{
  react:{useId:()=>`:icon-${++uniq}:`},
  'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},
  '@/lib/health-intelligence/visual-studio-v8':{normalizedPillV8:domain.normalizedPillV8},
});
const all=(node)=>node&&typeof node==='object'?[node,...(Array.isArray(node.props?.children)?node.props.children:[node.props?.children]).flatMap(all)]:[];
const formats=['capsula','comprimido','partido','oblongo','oblongo_sulcado','gota','adesivo','injecao'];
for(const formato of formats){
  const node=ui.MedicationFormatIcon({formato,cores:['#ab12ef','#45bc98'],size:23});
  const tree=all(node);
  ok(node.type==='svg'&&node.props.width===23&&node.props.height===23,`${formato}: SVG 23px renderizado`);
  ok(tree.some(item=>item.type==='linearGradient'),`${formato}: volume e brilho`);
  ok(tree.some(item=>item.type==='path'||item.type==='ellipse'||item.type==='rect'),`${formato}: contorno real`);
  ok(tree.some(item=>item.props?.stopColor==='#ab12ef'),`${formato}: cor declarada preservada`);
}
const shade=all(ui.MedicationFormatIcon({formato:'capsula',cores:['url(javascript:evil)'],size:18}));
ok(shade.every(item=>item.props?.stopColor!=='url(javascript:evil)'),'cores fora de HEX bloqueadas pelo normalizador V8');
const cap1=ui.MedicationFormatIcon({formato:'capsula',cores:['#000000','#ffffff']});
const cap2=ui.MedicationFormatIcon({formato:'capsula',cores:['#000000','#ffffff']});
const ids=x=>all(x).filter(v=>v.props?.id).map(v=>v.props.id);
ok(!ids(cap1).some(id=>ids(cap2).includes(id)),'gradientes SVG sem colisão entre medicamentos');

console.log(`M148 P1: ${n} contratos de identidade visual, navegação e segurança aprovados.`);
