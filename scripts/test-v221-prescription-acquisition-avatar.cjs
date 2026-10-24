const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const read = (file) => fs.readFileSync(file, "utf8");
function loadPure(file) {
  const compiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const box={exports:{}};
  new Function("exports","module","require",compiled)(box.exports,box,()=>({}));
  return box.exports;
}
const policy=loadPure("lib/health-supply/renewal-event.ts");
const recipe={ data:"2026-10-01",preco:null,quantidade:null,tipo_aquisicao:null };
const purchase={ data:"2026-10-01",data_aquisicao:"2026-10-10",preco:48.5,quantidade:2,tipo_aquisicao:"comprado" };
const future={...purchase,data_aquisicao:"2026-11-15"};
const free={...purchase,tipo_aquisicao:"sus",preco:0};
assert.equal(policy.isPrescriptionOnly(recipe),true);
assert.equal(policy.isFutureAcquisition(recipe,"2026-10-22"),false);
assert.equal(policy.isFutureAcquisition(future,"2026-10-22"),true);
assert.equal(policy.isFutureAcquisition(purchase,"2026-10-22"),false);
assert.equal(policy.realizedAcquisitionExpense(recipe,"2026-10-22"),0);
assert.equal(policy.realizedAcquisitionExpense(future,"2026-10-22"),0);
assert.equal(policy.realizedAcquisitionExpense(purchase,"2026-10-22"),48.5);
assert.equal(policy.realizedAcquisitionExpense(free,"2026-10-22"),0);
assert.equal(policy.realizedAcquisitionExpense({...purchase,preco:NaN},"2026-10-22"),0);
assert.equal(policy.realizedAcquisitionExpense({...purchase,preco:Infinity},"2026-10-22"),0);
assert.equal(policy.realizedAcquisitionExpense(future,"2026-11-15"),48.5);

// Executa a funcao real de receita arquivada com dependencias controladas.
const full=read("lib/health-insights.ts");
const ast=ts.createSourceFile("health-insights.ts",full,ts.ScriptTarget.Latest,true);
const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="analisarReceitaArquivada");
assert.ok(fn,"Função canônica de receita arquivada preservada");
const source=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const archive={exports:{}};
function parseLocalDate(date){if(!date)return null;const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(date);return m?new Date(+m[1],+m[2]-1,+m[3]):null;}
new Function("exports","parseLocalDate","analisarValidadeReceita","RECEITA_VALIDADE_PADRAO_DIAS","isRenovacaoSomenteReceita",source)(archive.exports,parseLocalDate,()=>({status:"valida"}),30,policy.isPrescriptionOnly);
const archived=archive.exports.analisarReceitaArquivada;
assert.equal(archived("2026-10-01",{data_receita:"2026-10-01"},[purchase])?.status,"valida","compra nao renova receita");
assert.equal(archived("2026-10-01",{data_receita:"2026-10-01"},[recipe,{...recipe,data:"2026-10-13"}])?.status,"renovada_historico");
assert.equal(archived("2026-10-01",{data_receita:"2026-10-14"},[purchase])?.status,"renovada_historico");

const detail=read("app/saude/medicamentos/detalhes/page.tsx");
const list=read("app/saude/renovacao/page.tsx");
const avatar=read("components/saude/HealthAvatar3D.tsx");
assert.match(detail,/somenteReceita \? \(/);
assert.match(detail,/aquisicaoFutura \? \(/);
assert(detail.includes("summarizeMedicationCosts(renovacoes, diaFinanceiro)")||/realizedAcquisitionExpense\(item, diaFinanceiro\)/.test(detail));
assert.match(list,/totalCompras = useMemo\(\(\) => comprasComValor\.reduce/);
assert.match(list,/isFutureAcquisition\(item, hojeISO\)/);
assert.match(full,/if \(!isRenovacaoSomenteReceita\(renovacao\)\) return false/);
assert.match(avatar,/V221: olhos de baixo relevo/);
assert.match(avatar,/materials\.eyeWhite/);
assert.match(avatar,/materials\.watchAccent/);
assert.match(avatar,/expressionLidScaleY\.get\(object\)/);
assert.doesNotMatch(avatar,/\[-\.15,2\.14,\.01,\.266\]/);
assert.doesNotMatch(avatar,/\[\.15,2\.14,\.01,\.266\]/);
assert.doesNotMatch(avatar,/const hand=mesh\(new THREE\.BoxGeometry\(\.038,\.009/);
assert.match(avatar,/renderer\.forceContextLoss\(\)/);
assert.doesNotMatch(avatar,/requestAnimationFrame\(animate\)/);
console.log("VAULT V221 R3 — receita/aquisicao, gasto efetivado, historico, olhos, relogio e traves: OK");
