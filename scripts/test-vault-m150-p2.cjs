#!/usr/bin/env node
'use strict';
/** VAULT M150 P2 — navigation and prescription linkage, read-only behavioral contracts. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let n=0;
const ok=(cond,why)=>{assert.ok(cond,'M150 P2: '+why);console.log(`✓ M150 P2 ${++n}: ${why}`)};
const files=[
 'components/BottomNav.tsx','app/saude/retiradas/detalhes/page.tsx',
 'app/saude/medicamentos/detalhes/page.tsx','app/saude/renovacao/nova-receita/page.tsx',
 'components/hoje/TodayDoseTimelineCard.tsx','app/hoje/page.tsx',
 'lib/navigation/return-context.ts','lib/navigation/clinical-return-m150.ts',
 'lib/health-intelligence/medication-care-decision.ts',
];
for(const p of files){const src=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(src.parseDiagnostics.length===0,'TS/TSX sintaticamente correto: '+p)}
const nav=read(files[0]);
for(const route of ['/saude/minha-saude','/saude/brain-v7','/saude/visual-studio','/saude/pharmalens','/saude/supply-shield','/saude/plano-seguranca','/saude/registros/relatorio']){
 ok(nav.includes(`"${route}"`) && fs.existsSync(`app${route}/page.tsx`),'exploracao com BottomNav e destino real: '+route);
}
ok(nav.includes('normalizedPathname.includes("/novo")')&&nav.includes('normalizedPathname.includes("/editar")'),'formularios continuam fora da barra global');
function loadPure(file,mocks={}){
 const js=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const box={exports:{}};
 new Function('module','exports','require',js)(box,box.exports,id=>{
   if(Object.hasOwn(mocks,id))return mocks[id];
   throw new Error('import nao autorizado em teste puro '+id);
 });
 return box.exports;
}
const root=loadPure('lib/navigation/return-context.ts');
const rel=loadPure('lib/navigation/clinical-return-m150.ts',{'@/lib/navigation/return-context':root});
const safe=rel.safeClinicalReturnM150;
ok(safe('/?return_to=%2Fsaude%2Fmapa','/saude/retiradas/detalhes','/saude/retiradas')==='/', 'retorno de retirada preserva Home sem carregar origem encadeada');
ok(safe('/saude/retiradas/detalhes?id=ABC&return_to=%2F','/saude/retiradas/detalhes','/saude/retiradas')==='/saude/retiradas','retorno circular da retirada cai na lista');
ok(safe('/hoje?data=2026-11-13&return_to=%2Fmais','/saude/renovacao/nova-receita','/saude/renovacao')==='/hoje?data=2026-11-13','retorno da receita preserva data real e remove cascata');
ok(safe('//example.com','/saude/renovacao/nova-receita','/saude/renovacao')==='/saude/renovacao','URL externa rejeitada na receita');
ok(safe('/saude/medicamentos/detalhes?id=m1','/saude/medicamentos/detalhes','/saude/medicamentos')==='/saude/medicamentos','detalhes nao retorna a si mesmo');
const withdraw=read(files[1]);
ok(withdraw.includes('safeClinicalReturnM150(safeReturnTarget(params.get("return_to"), "/saude/retiradas")')&&withdraw.includes('router.replace(\n                  backTarget'),'retirada usa sanitizacao e o botao Voltar real existente');
const med=read(files[2]);
ok(med.includes('safeClinicalReturnM150(safeReturnTarget(searchParams.get("return_to"), "/saude/medicamentos")')&&med.includes('router.replace(returnTarget)'),'medicamento respeita origem sem aninhar retorno');
const form=read(files[3]);
ok(form.includes('safeClinicalReturnM150(safeReturnTarget(rawReturnTo, "/saude/renovacao")'),'receita utiliza retorno protegido');
ok(form.includes('uploadFile(user.id, localFile, "receitas")')&&form.includes('createDocument('),'receita continua utilizando upload e criacao documental clinica');
ok(form.includes('medicamento_id: selectedMedicamento.id'),'medicamento real vinculado ao registro e anexo');
const decision=read(files[8]);
ok(decision.includes('const prescription = `/saude/renovacao/nova-receita?medicamento_id=')&&!decision.includes('const prescription = `/documentos'),'decisao de receita aponta para formulario clinico, nao Cofre Pessoal');
const today=read(files[5]),card=read(files[4]);
ok(today.includes('returnTo: buildTimelineUrl(dataSelecionada)'),'Hoje leva data selecionada para cada card');
ok(today.includes('actionHref: withReturnTarget(decision.actionHref, buildTimelineUrl(dataSelecionada))')&&today.includes('router.push(evento.actionHref);'),'agenda de receita preserva origem Hoje');
ok(card.includes('returnTo: string;')&&card.includes('returnTo: scope.returnTo')&&card.includes('scope.returnTo,'),'origem participa da memoizacao e troca de dia');
ok(card.split('router.push(withReturnTarget(`/saude/medicamentos/detalhes?id=${encodeURIComponent(item.medicamentoId)}`, returnTo))').length===3,'toque e teclado do medicamento usam mesmo destino contextual');
ok(!card.includes('router.back()'),'componente nao usa historico cego');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.startsWith('// scripts/test-v63-release-gate.mjs\n')&&gate.includes('"scripts/test-vault-m92-medication-premium-2.cjs"'),'gate original preserva M92');
ok(gate.split('"scripts/test-vault-m150-p2.cjs"').length===2,'P2 entra uma vez no V63');
ok(gate.split('"scripts/test-vault-m150-p1.cjs"').length===2,'P1 continua uma vez no V63');
console.log(`VAULT M150 P2: ${n} contratos de navegação e vínculos clínicos aprovados`);
