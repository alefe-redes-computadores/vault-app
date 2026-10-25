#!/usr/bin/env node
// VAULT SURGERY 2.1 — conservative preflight; fast checks NEVER replace full gate.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { canonical, buildReverseGraph, reachableImporters, rankTests, resolveImport } from './impact-core.mjs';

const repo = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const argv = process.argv.slice(2);
const json = argv.includes('--json');
const all = argv.includes('--all');
const changedArgs = argv.flatMap((v,i)=>v==='--changed' && argv[i+1] ? [argv[i+1]] : []);
const fastLimit = Number(argv.find(v=>v.startsWith('--limit='))?.slice(8) ?? 16);
if (!Number.isInteger(fastLimit) || fastLimit < 1 || fastLimit > 2000) throw new Error('Limite inválido');
const runGit = (...args) => execFileSync('git', args, {cwd:repo, encoding:'utf8', maxBuffer: 12_000_000}).trim();
let files = [];
try { files = runGit('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(Boolean).map(canonical); }
catch { throw new Error('Execute dentro de repositório Git acessível.'); }
const known = new Set(files.filter(f=>fs.existsSync(path.join(repo,f))));
const isCode = f=>/\.[cm]?[jt]sx?$/.test(f);
const isTest = f=>/^scripts\/test-[\w.-]+\.(?:[cm]?js|mjs)$/.test(f);
const gateText = fs.readFileSync(path.join(repo,'scripts/test-v63-release-gate.mjs'),'utf8');
const gateTests = [...gateText.matchAll(/["'](scripts\/test-[\w.-]+\.(?:cjs|mjs|js))["']/g)].map(m=>m[1]);
const tests = [...new Set([...gateTests,...files.filter(isTest)])].filter(f=>known.has(f));
function staticImports(file, content) {
  const ast = ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const specs = [];
  function walk(node){
    if ((ts.isImportDeclaration(node)||ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specs.push(node.moduleSpecifier.text);
    if(ts.isCallExpression(node) && node.arguments.length===1 && ts.isStringLiteral(node.arguments[0]) && ((ts.isIdentifier(node.expression)&&['require','import'].includes(node.expression.text)) || node.expression.kind===ts.SyntaxKind.ImportKeyword)) specs.push(node.arguments[0].text);
    ts.forEachChild(node,walk);
  }
  walk(ast);return specs;
}
const entries = files.filter(isCode).filter(f=>known.has(f));
const fileSpecs = Object.fromEntries(entries.map(f=>[f,staticImports(f,fs.readFileSync(path.join(repo,f),'utf8'))]));
const reverse = buildReverseGraph(fileSpecs,known);
let changed = changedArgs.map(canonical);
if (!changed.length) {
  const parts = ['diff --name-only -z HEAD'.split(' '),'diff --cached --name-only -z'.split(' '),'ls-files --others --exclude-standard -z'.split(' ')];
  changed = [...new Set(parts.flatMap(args=>{try{return runGit(...args).split('\0').filter(Boolean).map(canonical)}catch{return[]}}))];
}
const reachable = reachableImporters(changed,reverse);
const textByTest = Object.fromEntries(tests.map(f=>[f,fs.readFileSync(path.join(repo,f),'utf8')]));
const importedByTest = Object.fromEntries(tests.map(f=>[f,new Set((fileSpecs[f]??[]).map(spec=>resolveImport(f,spec,known)).filter(Boolean))]));
const ranked = rankTests(tests,textByTest,changed,reachable,importedByTest);
const selected = all ? ranked : ranked.slice(0,fastLimit);
const report={version:'2.1',base:runGit('rev-parse','HEAD'),changed,affectedModules:reachable.size,contractCount:gateTests.length,scannedTests:tests.length,selected,skippedByFastBudget:ranked.length-selected.length,diagnosticOnly:true,fullGateMandatory:true,warnings:[
  'Grafo estático não conhece dependências de runtime, fixtures dinâmicas ou mocks ocultos.',
  'Testes afetados são gate rápido; execute SEMPRE o gate V63 completo antes de considerar aprovado.'
]};
if(json) console.log(JSON.stringify(report,null,2));else {
  console.log(`Surgery 2.1 · HEAD ${report.base.slice(0,12)} · ${changed.length} alterações · ${tests.length} testes mapeados · ${selected.length} candidatos`);
  for(const item of selected) console.log(`  [${item.confidence}] ${item.test} — ${item.reasons.join('; ')}`);
  if(!selected.length) console.log('Nenhuma dependência direta identificada; gate completo continua OBRIGATÓRIO.');
  if(report.skippedByFastBudget)console.log(`Mais ${report.skippedByFastBudget} teste(s) candidatos; usar --all para listar.`);
}
