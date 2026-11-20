"use strict";
/**
 * V63 A1: execute the canonical release gate list exactly once, but aggregate
 * independent failures instead of aborting on the first failed contract.
 * Uses the installed release-gate source as authority, no copied list.
 */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {spawnSync} = require('node:child_process');
const gate = 'scripts/test-v63-release-gate.mjs';
const source = fs.readFileSync(gate,'utf8');
const tree = ts.createSourceFile(gate,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
let contracts = null;
function collect(node) {
 if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='contracts'&&node.initializer&&ts.isArrayLiteralExpression(node.initializer)){
  if(contracts!==null)throw Error('V63: lista de contratos ambígua');
  contracts=node.initializer.elements.map(e=>{
   if(!ts.isStringLiteral(e))throw Error('V63: contrato não literal: '+e.getText(tree));
   return e.text;
  });
 }
 ts.forEachChild(node,collect);
}
collect(tree);
if(!contracts||contracts.length<200||new Set(contracts).size!==contracts.length){
 throw Error('V63: lista canônica ausente, incompleta ou com duplicatas; bloqueado');
}
const tail=['scripts/test-v70-super-integrity-ux-contract.mjs','scripts/test-v70-final-completeness-contract.mjs'];
for(const f of tail)if(!source.includes(f))throw Error('V63: mudou o fechamento '+f+'; revisar o executor antes de homologar');
const preload = path.resolve('scripts/vault-m2-test-alias-preload.cjs');
if(!fs.existsSync(preload))throw Error('V63: preload M2 ausente');
const failures=[];
const all=[...contracts,...tail];
console.log(`A1_V63_SWEEP_INICIO | contratos=${contracts.length} | finais=${tail.length} | total=${all.length}`);
for(let i=0;i<all.length;i++){
 const file=all[i];
 console.log(`\n===== V63 ${i+1}/${all.length}: ${file} =====`);
 if(!fs.existsSync(file)){
  failures.push(`${file} (ausente)`);console.error(`A1_V63_FALHA: ${file} ausente`);continue;
 }
 const args=i<contracts.length?['--require',preload,file]:[file];
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,NODE_OPTIONS:''}});
 if(result.error||result.signal||result.status!==0){
  const problem=`${file} (${result.error?.message||result.signal||`exit=${result.status}`})`;
  failures.push(problem);console.error('A1_V63_FALHA: '+problem);
 }
}
console.log(`\nA1_V63_SWEEP_COMPLETO | executados=${all.length} | falhas=${failures.length}`);
if(failures.length){
 console.error('=== A1 V63 — TODAS AS FALHAS CONSOLIDADAS ===');
 for(const f of failures)console.error(' - '+f);
 process.exitCode=1;
}else console.log('A1_V63_CONTRATOS_E_V70_APROVADOS');
