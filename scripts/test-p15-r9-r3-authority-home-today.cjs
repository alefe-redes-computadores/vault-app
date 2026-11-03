#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const read = p => fs.readFileSync(p,'utf8');
const paths = [
 'lib/health-intelligence/medication-care-decision.ts',
 'lib/health-intelligence/medication-card-action.ts',
 'lib/health-intelligence/medication-portfolio.ts',
 'components/saude/MedicationPortfolioOverview.tsx',
 'app/saude/medicamentos/page.tsx',
 'components/home/HomeCommandCenter.tsx',
 'components/hoje/TodayRoutinePulse.tsx',
];
let n=0;
function ok(condition, name) {assert.ok(condition,`P15 R9 R3: ${name}`); console.log(`✓ ${++n}: ${name}`);}
for(const p of paths){const x=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(x.parseDiagnostics.length===0,'TS/TSX válido: '+p);}
const cache=new Map(), root=process.cwd();
function load(rel){
 const file=path.isAbsolute(rel)?rel:path.join(root,rel);
 if(cache.has(file))return cache.get(file).exports;
 const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);
 mod.require=id=>id.startsWith('@/lib/')?load(id.slice(2)+'.ts'):id.startsWith('./')?load(path.resolve(path.dirname(file),id)+'.ts'):require(id);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
 return mod.exports;
}
const care=load('lib/health-intelligence/medication-care-decision.ts');
const action=load('lib/health-intelligence/medication-card-action.ts');
const basic={id:'med',user_id:'u',person_id:'p',nome:'Medicamento teste',dosagem:'',medico:'',data_receita:'',proxima_renovacao:'',estoque_quantidade:0,document_id:'doc-linked'};
const run=(medication,rest={})=>care.decideMedicationCarePath({medication,renewals:[],today:'2026-11-01',needsPrescription:true,needsStock:true,...rest});
let decision=run(basic);
ok(decision.stage==='acquisition_needed'&&decision.actionLabel==='Repor estoque','Documento vinculado + sem estoque: conferir aquisição, sem duplicar receita');
ok(decision.prescriptionOnFile===false&&decision.explanation.includes('validade'),'Vínculo de documento não vira validade atestada');
ok(decision.actionHref.includes('mode=acquisition')&&!decision.plannedAcquisition,'Ação aponta aquisição real; planejamento não é compra');
decision=run(basic,{needsStock:false});
ok(decision.stage==='stock_review'&&decision.actionLabel==='Conferir receita','Documento vinculado sem falta de estoque: revisar receita em vez de criar outra');
ok(decision.actionHref.includes('medicamentos/detalhes'),'Revisão aponta detalhe do medicamento, sem escrita');
const brainRx={href:'/saude/renovacao/nova-receita?medicamento_id=med',label:'Renovar receita',description:'Aviso genérico'};
const chosen=action.resolveMedicationCardAction(decision,brainRx,null);
ok(chosen.href===decision.actionHref,'Brain genérico não força receita duplicada sobre revisão documental');
const noDoc=run({...basic,document_id:''},{needsStock:false});
ok(noDoc.stage==='prescription_needed','Ausência de evidência mantém caminho de receita');
const oldRx={id:'rx',user_id:'u',person_id:'p',medicamento_id:'med',data:'2026-09-12',document_id:'other'};
const bought={id:'buy',user_id:'u',person_id:'p',medicamento_id:'med',data:'2026-09-23',data_aquisicao:'2026-09-23',tipo_aquisicao:'comprado',quantidade:30};
const history=run({...basic,document_id:undefined},{renewals:[oldRx,bought]});
ok(history.stage==='acquisition_needed'&&history.prescriptionOnFile===false,'Receita histórica anterior à compra não prova validade atual');
ok(history.actionLabel==='Repor estoque','Histórico da aquisição preserva contrato V329');
const planned={...bought,data:'2026-12-03',data_aquisicao:'2026-12-03'};
const future=run(basic,{renewals:[planned]});
ok(future.stage==='acquisition_planned'&&future.plannedAcquisition,'Compra futura nunca vira realizada por haver documento');
const foreignRx={...oldRx,person_id:'other'};
const foreign=run({...basic,document_id:undefined},{renewals:[foreignRx],needsStock:false});
ok(foreign.stage==='prescription_needed','Receita de outra pessoa não satisfaz medicamento atual');
const portfolio=load('lib/health-intelligence/medication-portfolio.ts');
const context={personId:'p',userId:'u',hoje:'2026-11-01',medicamentos:[
 {id:'a',user_id:'u',person_id:'p',nome:'A',status:'ativo',tipo_uso:'continuo'},
 {id:'b',user_id:'u',person_id:'p',nome:'B',status:'ativo',tipo_uso:'sos'},
 {id:'foreign',user_id:'other',person_id:'p',nome:'Outra conta',status:'ativo',tipo_uso:'continuo'},
 {id:'other-person',user_id:'u',person_id:'other',nome:'Outra pessoa',status:'ativo',tipo_uso:'continuo'},
 {id:'inactive',user_id:'u',person_id:'p',nome:'Suspenso',status:'descontinuado'}],doseLogs:[]};
const summary=portfolio.buildMedicationPortfolio(context,{items:[{medicationId:'a',lane:'now'},{medicationId:'foreign',lane:'now'}]}, {items:[]});
ok(summary.active===2,'Portfólio restringe conta e pessoa, não soma terceiros');
ok(summary.asNeeded===1&&summary.continuous===1,'SOS é ativo, mas separado dos contínuos');
ok(summary.needsAction===1,'Ação de outra conta não vaza para o Brain');
const list=read('app/saude/medicamentos/page.tsx'),home=read('components/home/HomeCommandCenter.tsx'),today=read('components/hoje/TodayRoutinePulse.tsx'),overview=read('components/saude/MedicationPortfolioOverview.tsx');
ok(list.includes('listActiveCount={statsProgresso.ativos}')&&overview.includes('listActiveCount !== portfolio.active'),'Divergência entre lista e Brain aparece em vez de ser escondida');
ok(overview.includes('Doses SOS não entram nessa meta programada'),'Meta da rotina continua sem SOS');
ok(list.includes('med.tipo_aquisicao === "comprado"')&&list.includes('Comprado · cadastro'),'Origem comprada declarada tem indicação própria');
ok(list.includes('med.tipo_aquisicao === "sus"')&&list.includes('SUS · cadastro'),'Origem SUS declarada tem indicação própria');
ok(list.includes('Origens históricas · conferir')&&list.includes('supplyRoute?.mode === "hybrid" ? ('),'Coexistência histórica não vira fornecimento comprovado');
ok(home.includes('home-acessos-medicamentos')&&home.includes('home-organizacao')&&home.includes('id="home-outras-areas" defaultOpen'),'Apenas outras áreas abre inicialmente; outras seções continuam navegáveis');
ok(home.includes('go("/saude/medicamentos")')&&home.includes('min-h-12 items-center'),'Medicamentos permanece navegável como atalho secundário compacto');
ok(today.includes('isPassado ? "inline-flex items-center gap-1 text-ink-muted"')&&today.includes('<CalendarDays size={12}'),'Previsões e histórico não recebem ícone de urgência do Hoje');
ok(today.includes('!isFuturo && recorded > 0')&&today.includes('safePercentage'),'Progresso só usa realização registrada; previsão mantém sua autoridade');
ok(!read('lib/health-intelligence/medication-care-decision.ts').includes('document_id === valid'),'Vínculo documental não é validade forçada');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('"scripts/test-p15-r9-r3-authority-home-today.cjs"'),'Contrato novo integrado ao gate integral');
console.log(`VAULT P15 R9 R3: ${n} contratos clínicos, de escopo e UX aprovados.`);
