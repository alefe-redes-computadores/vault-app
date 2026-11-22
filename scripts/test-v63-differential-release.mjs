#!/usr/bin/env node
/** VAULT 360: strict differential full release gate, with immutable V29.1 debt baseline.
 * This is NOT a claim that all inherited suites pass. Existing failures are emitted as debt;
 * new failures, changed root-cause signatures, removed suites and broken hard gates block CI.
 * No patient data, network API, SQL, or production database access is performed by this runner.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const baselineSpec=JSON.parse(fs.readFileSync(path.join(__dirname,'vault-v63-legacy-baseline-v291.json'),'utf8'));
const repo=process.cwd();
const reportDir=path.resolve(process.env.VAULT_GATE_REPORT_DIR||'artifacts/V63-DIFFERENTIAL');
const baseline=baselineSpec.baseline_commit;
const allowed=new Set(baselineSpec.legacy_failures);
const HARD=[
 'scripts/test-vault-m131-home-medication-density.cjs',
 'scripts/test-vault-m57-android-export.cjs',
 'scripts/test-vault-m67-final-certification.cjs',
 'scripts/test-vault-m87-m89-update-center.cjs',
 'scripts/test-v32-ci-differential-compat.cjs',
 'scripts/test-vault-a7-m6-premium-closeout.cjs',
 'scripts/test-vault-a7-work-v28-continuity.cjs',
 'scripts/test-vault-a7-macro1.cjs',
 'scripts/test-vault-a7-macro2.cjs',
 'scripts/test-vault-a7-macro3.cjs',
 'scripts/test-vault-a4-regimen-360.cjs',
 'scripts/test-vault-m5-reab-macro1.cjs',
 'scripts/test-vault-m5-reab-macro2.cjs',
 'scripts/test-vault-v281-guided-close.cjs',
 'scripts/test-v70-super-integrity-ux-contract.mjs',
 'scripts/test-v70-final-completeness-contract.mjs',
];
const git=(cwd,...args)=>spawnSync('git',args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:10*1024*1024});
const cleanLines=output=>String(output||'').replace(/\r/g,'').split('\n');
function errorSignature(output,status){
 const lines=cleanLines(output);
 // Assertion and throw messages are preferable to absolute paths, stack traces or line numbers.
 const thrown=lines.find(s=>/\b(?:AssertionError \[ERR_ASSERTION\]|SyntaxError|TypeError|ReferenceError|Error):\s*\S/.test(s));
 if(thrown)return thrown.trim().replace(/\s+/g,' ').replace(/\x1b\[[0-9;]*m/g,'');
 const failed=lines.filter(s=>/^\s*(?:✗|×|❌|FAIL\b|FALHOU\b|Error:|A5_V28_BLOQUEADA|\"status\":\s*\"[^\"]*BLOQUEADA\")/.test(s)).slice(0,8);
 if(failed.length)return failed.map(x=>x.trim().replace(/\s+/g,' ')).join('|');
 const tail=lines.filter(s=>s.trim()&&!/^\s*(?:at\s|Node\.js v\d|\^|\{|\}|generatedMessage|code:|actual:|expected:|operator:|diff:)/.test(s)).slice(-3);
 return `status=${status}|${tail.map(x=>x.trim().replace(/\s+/g,' ')).join('|')}`;
}
/** Read the JavaScript source as AST; the V63 historical array contains compact
 * multi-entry lines. Never execute the gate or evaluate arbitrary expressions.
 */
function listContracts(file){
 const source=fs.readFileSync(file,'utf8');
 const syntax=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 check(syntax.parseDiagnostics.length===0,'V63: falha de sintaxe no arquivo de contratos');
 const declarations=[];
 for(const statement of syntax.statements){
  if(!ts.isVariableStatement(statement))continue;
  for(const d of statement.declarationList.declarations){
   if(ts.isIdentifier(d.name)&&d.name.text==='contracts')declarations.push(d);
  }
 }
 check(declarations.length===1,'V63: esperado um único array canônico chamado contracts');
 const expr=declarations[0].initializer;
 check(Boolean(expr&&ts.isArrayLiteralExpression(expr)),'V63: contracts deve ser array literal, sem execução dinâmica');
 const contracts=[];
 for(const element of expr.elements){
  check(ts.isStringLiteral(element),'V63: somente strings literais são permitidas na lista de contratos');
  const name=element.text;
  check(/^scripts\/[A-Za-z0-9_./-]+\.(?:cjs|mjs)$/.test(name)&&!name.includes('..')&&!name.includes('//'),
   'V63: caminho de contrato inválido: '+name);
  contracts.push(name);
 }
 check(new Set(contracts).size===contracts.length,'V63: contratos duplicados');
 check(contracts.length>=baselineSpec.baseline_count,'V63: lista de contratos abaixo da contagem mínima registrada');
 return contracts;
}

function run(cwd,name){
 const preload=path.resolve(cwd,'scripts/vault-m2-test-alias-preload.cjs');
 const result=spawnSync(process.execPath,['--require',preload,name],{
  cwd,encoding:'utf8',timeout:180000,maxBuffer:20*1024*1024,
  env:{...process.env,VAULT_CI_TEST_MODE:'1',CI:'true'},
 });
 const output=(result.stdout||'')+(result.stderr||'');
 const exit=result.status===null?(result.signal||result.error?.message||'UNKNOWN'):result.status;
 return {pass:result.status===0,exit,signature:result.status===0?'':errorSignature(output,exit),output};
}
function check(cond,msg){if(!cond)throw Error(msg)}
function writeSummary(report){
 fs.mkdirSync(reportDir,{recursive:true});
 fs.writeFileSync(path.join(reportDir,'RESULTADO.json'),JSON.stringify(report,null,2)+'\n');
 const md=[
  '## VAULT 360 — Gate V63 diferencial, sem mascarar testes legados',
  `- Commit base imutável: \`${report.baseline_commit}\``,
  `- Contratos atuais: **${report.tested}**; aprovados: **${report.passed}**`,
  `- Falhas herdadas idênticas: **${report.inherited.length}**`,
  `- Testes recuperados: **${report.improved.length}**`,
  `- Regressões novas/assinaturas alteradas: **${report.blockers.length}**`,
  `- Hard gates obrigatórios: **${report.hard_ok?'aprovados':'reprovados'}**`,
  `- Situação: **${report.status}**`,
  '',
  'As falhas antigas permanecem dívidas registradas; aprovação diferencial não é equivalência a 100% verde.',
 ].join('\n')+'\n';
 fs.writeFileSync(path.join(reportDir,'RESUMO.md'),md);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
function selftest(){
 check(allowed.size===64,'allowlist não contém os 64 testes distintos');
 check(Number.isSafeInteger(baselineSpec.historical_contract_count)&&baselineSpec.historical_contract_count>=64,
  'contagem histórica canônica ausente ou inválida');
 check(errorSignature('AssertionError [ERR_ASSERTION]: um contrato\n at foo',1)==='AssertionError [ERR_ASSERTION]: um contrato','parser de assertiva');
 check(errorSignature('✗ A5 faltou\n  ✗ A5 problema',1).includes('A5 faltou'),'parser multi-falha');
 check(errorSignature('Error: outro contrato',1)==='Error: outro contrato','parser erro');
 const sampleDir=fs.mkdtempSync(path.join(os.tmpdir(),'vault-v63-parser-'));
 try{
  const sample=path.join(sampleDir,'test-v63-release-gate.mjs');
  const paths=Array.from({length:64},(_,i)=>`scripts/test-v63-fixture-${i}.cjs`);
  fs.writeFileSync(sample,'const contracts = [\n'+paths.map((x,i)=>'"'+x+'"'+(i===paths.length-1?'':',')+(i%4===3?'\n':i%4===1?' /* lado a lado */ ':' ')).join('')+'\n];\n');
  check(listContracts(sample).length===64,'parser AST falhou na lista compacta com comentários');
  fs.writeFileSync(sample,'const contracts = ['+paths.map(x=>'"'+x+'",').join('')+'process.exit(0)];');
  let rejected=false;try{listContracts(sample);}catch{rejected=true;}
  check(rejected,'parser AST precisa recusar expressões executáveis');
  fs.writeFileSync(sample,'const contracts = ['+paths.map(x=>'"'+x+'",').join('')+'"'+paths[0]+'"];');
  rejected=false;try{listContracts(sample);}catch{rejected=true;}
  check(rejected,'parser AST precisa recusar duplicação');
 }finally{fs.rmSync(sampleDir,{recursive:true,force:true});}
 // Also verify the actual gate in the checkout before spending time on 546 suites.
 const actual=path.join(repo,'scripts/test-v63-release-gate.mjs');
 if(fs.existsSync(actual))check(listContracts(actual).length>=baselineSpec.historical_contract_count,
  'gate V63 atual abaixo do mínimo registrado na V29.1');
 console.log('V63 diferencial: parser AST + linhas compactas + rejeições + 64 contratos OK');
}
if(process.argv.includes('--selftest')){selftest();process.exit(0);}

let temp=null,worktree=null;let report={status:'started',baseline_commit:baseline,head:'',tested:0,passed:0,inherited:[],improved:[],blockers:[],hard_ok:false,hard:[],removed:[],errors:[]};
try{
 check(allowed.size===baselineSpec.baseline_count&&allowed.size===64,'allowlist histórica alterada/duplicada');
 const current=git(repo,'rev-parse','HEAD');check(current.status===0,'git HEAD indisponível');
 report.head=current.stdout.trim();
 let basePresent=git(repo,'cat-file','-e',`${baseline}^{commit}`);
 if(basePresent.status!==0){
  const fetched=git(repo,'fetch','--no-tags','--depth=1','origin',baseline);
  check(fetched.status===0,'base imutável não está no checkout e git fetch falhou: '+fetched.stderr);
 }
 // A published baseline must be an ancestor; unrelated histories cannot be compared.
 const ancestor=git(repo,'merge-base','--is-ancestor',baseline,'HEAD');
 check(ancestor.status===0,'base V29.1 não é ancestral do HEAD; reauditar publicação');
 const currentList=listContracts(path.join(repo,'scripts/test-v63-release-gate.mjs'));
 check(currentList.length>=baselineSpec.historical_contract_count,'V63 não pode conter menos contratos que o gate V29.1');
 temp=fs.mkdtempSync(path.join(os.tmpdir(),'vault-v63-audit-'));
 worktree=path.join(temp,'baseline');
 const w=git(repo,'worktree','add','--detach',worktree,baseline);check(w.status===0,'worktree histórico: '+w.stderr);
 const modules=path.join(repo,'node_modules');
 check(fs.existsSync(path.join(modules,'typescript')),'dependências locais ausentes; execute npm ci');
 fs.symlinkSync(modules,path.join(worktree,'node_modules'),'dir');
 const baselineList=listContracts(path.join(worktree,'scripts/test-v63-release-gate.mjs'));
 check(baselineList.length===baselineSpec.historical_contract_count,
  'A contagem do gate V29.1 difere da contagem histórica documentada');
 const currentSet=new Set(currentList);report.removed=baselineList.filter(x=>!currentSet.has(x));
 check(report.removed.length===0,'contratos do V63 histórico removidos: '+report.removed.join(', '));
 check(allowed.size===baselineList.filter(x=>allowed.has(x)).length,'allowlist legada diverge dos contratos históricos');
 const baselines=new Set(baselineList);
 for(let i=0;i<currentList.length;i++){
  const name=currentList[i];report.tested++;
  const x=run(repo,name);
  if(x.pass){report.passed++;if(allowed.has(name))report.improved.push(name);}
  else if(!allowed.has(name))report.blockers.push({test:name,reason:'REPROVACAO_NOVA_OU_FORA_DA_ALLOWLIST',exit:x.exit,signature:x.signature,output:x.output.slice(-2000)});
  else{
   const b=run(worktree,name);
   if(b.pass)report.blockers.push({test:name,reason:'BASE_PASSAVA',exit:x.exit,signature:x.signature,output:x.output.slice(-2000)});
   else if(b.signature!==x.signature)
    report.blockers.push({test:name,reason:'CAUSA_ALTERADA',baseline_signature:b.signature,candidate_signature:x.signature,output:x.output.slice(-2000)});
   else report.inherited.push({test:name,signature:x.signature});
  }
  if(i%25===0||i===currentList.length-1)console.log(`[V63] ${i+1}/${currentList.length} | aprovadas=${report.passed} | herdadas=${report.inherited.length} | novas=${report.blockers.length}`, {flush:true});
 }
 for(const name of HARD){
  const x=run(repo,name);report.hard.push({test:name,pass:x.pass,signature:x.signature,exit:x.exit});
  if(!x.pass)report.blockers.push({test:name,reason:'HARD_GATE_FALHOU',signature:x.signature,output:x.output.slice(-2000)});
 }
 report.hard_ok=report.hard.every(x=>x.pass);
 report.status=report.blockers.length?'blocked':'approved_differential_with_legacy_debt';
}catch(e){report.status='blocked';report.errors.push(e instanceof Error?e.message:String(e));}
finally{
 try{if(worktree&&fs.existsSync(worktree))git(repo,'worktree','remove','--force',worktree);}catch(e){report.errors.push('cleanup worktree: '+String(e));report.status='blocked';}
 try{if(temp)fs.rmSync(temp,{recursive:true,force:true});}catch(e){report.errors.push('cleanup temp: '+String(e));report.status='blocked';}
 writeSummary(report);
 console.log(`V63 FIM | status=${report.status} | executadas=${report.tested} | aprovadas=${report.passed} | herdadas=${report.inherited.length} | melhoradas=${report.improved.length} | novas=${report.blockers.length}`);
 if(report.errors.length)for(const error of report.errors)console.error(error);
 process.exitCode=report.status==='approved_differential_with_legacy_debt'?0:1;
}
