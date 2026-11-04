#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
let count = 0;
function check(value,label) { assert.ok(value,`M67 HF1: ${label}`);count++; }
const read = file => fs.readFileSync(file,"utf8");
const reviewFile="app/saude/medicamentos/revisao-retroativa/page.tsx";
const detailsFile="app/saude/medicamentos/detalhes/page.tsx";
const helperFile="lib/today/retro-review-navigation.ts";
const gateFile="scripts/test-v63-release-gate.mjs";
for(const file of [reviewFile,detailsFile,helperFile]) {
  const src=read(file);
  const ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(ast.parseDiagnostics.length===0,`TS/TSX válido: ${file}`);
}
const compiled=ts.transpileModule(read(helperFile),{fileName:helperFile,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
check(compiled.diagnostics.length===0,"helper de navegação transpila");
const m=new Module(path.resolve(helperFile),module);
m._compile(compiled.outputText,path.resolve(helperFile));
const {retroReviewExitAction:exit}=m.exports;
const cases=[
  ["manual","detalhes","back"],
  ["manual",null,"replace"],
  ["manual","outro","replace"],
  ["added",null,"replace"],
  ["counted",null,"replace"],
  ["added","detalhes","replace"],
  ["counted","detalhes","replace"],
];
for(const [mode,origin,expected] of cases) check(exit(mode,origin)===expected,`saída ${mode}/${origin||"direta"} = ${expected}`);
const review=read(reviewFile),details=read(detailsFile),gate=read(gateFile);
check(review.includes('import { retroReviewExitAction } from "@/lib/today/retro-review-navigation"'),"tela usa a decisão canônica");
const goBack=review.match(/function goBack\(\)\s*\{([\s\S]*?)\n  \}/)?.[1]||"";
check(goBack.includes('if (saving) return;'),"não fecha durante gravação");
check(goBack.includes('retroReviewExitAction(stockMode, search.get("origem"))'),"leitura de origem explícita");
check(goBack.includes('router.back();')&&goBack.includes('router.replace(returnTo);'),"sem empilhar detalhes na saída");
check(!review.includes('router.push(returnTo)'),"nunca empilha o retorno");
check(review.includes('onClick={goBack} aria-label="Voltar ao medicamento"'),"seta do cabeçalho compartilha decisão");
check(review.includes('onClick={goBack} className="min-h-12 rounded-2xl')&&review.includes('Agora não'),"Agora não compartilha decisão");
check(review.includes('onClick={goBack} disabled={saving}')&&review.includes('Concluir ou revisar depois'),"conclusão compartilha decisão");
check(review.includes('router.replace("/saude/medicamentos")')&&review.includes('Outro medicamento'),"outra medicação não deixa revisão no histórico");
check(details.includes('router.push(`${retroReviewHref(med.id!)}&origem=detalhes`);'),"entrada pelos detalhes marca origem sem modificar link canônico");
check(details.includes('const handleSafeBack')&&details.includes('router.back();')&&details.includes('"/saude/medicamentos"'),"voltar dos detalhes mantém histórico normal e fallback");
for(const fragment of [
 'doseLogsRepository.setStatus({', 'onlyIfPending: true', 'adjustStock: debit',
 'requireRegisteredStock: debit','setConfirmReal(false)',
 'savedSnapshot.personId === activePersonId','stockMode === "counted"',
 'Revisar doses','Recebimento registrado'
]) check(review.includes(fragment),`contrato clínico original ${fragment}`);
check(gate.includes('"scripts/test-vault-m67-retro-navigation.cjs"')&&gate.includes('"scripts/test-vault-m62-retro-batch.cjs"')&&gate.includes('"scripts/test-vault-m67-final-certification.cjs"'),"gate global protege novo + M62 + M67");
// Navigation-state simulation: the real resolver dictates the operation.
function simulate(seed,mode,origin,destination="details") {
 const stack=seed.slice(), current=stack.at(-1);
 assert.equal(current,"review");
 if(destination==="list") stack[stack.length-1]="list";
 else if(exit(mode,origin)==="back") stack.pop();
 else stack[stack.length-1]="details";
 return stack;
}
const manual=simulate(["list","details","review"],"manual","detalhes");
check(manual.join("/")==="list/details","manual: revisão volta aos mesmos detalhes sem duplicar página");
manual.pop();check(manual.at(-1)==="list","manual: segunda volta retorna à lista, não à revisão");
const acquisition=simulate(["list","acquisition","review"],"added",null);
check(acquisition.join("/")==="list/acquisition/details","recebimento: convite é substituído por detalhes");
check(!acquisition.includes("review"),"recebimento: revisão dispensada não permanece na pilha");
check(simulate(["list","details","review"],"manual","detalhes","list").at(-1)==="list","outro medicamento substitui revisão");
console.log(`VAULT M67 HF1: ${count} verificações de navegação, histórico, idempotência e segurança aprovadas.`);
