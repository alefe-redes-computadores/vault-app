import fs from "node:fs";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const ts=createRequire(import.meta.url)("typescript");
const r=f=>fs.readFileSync(f,"utf8"),ok=(v,m)=>{if(!v)throw Error("V56: "+m);console.log("OK: "+m)};
const runtime=r("lib/sync/runtime-status.ts"),indicator=r("components/SyncStatusIndicator.tsx"),mais=r("app/mais/page.tsx");
ok(runtime.includes("VAULT_SYNC_UX_V56"),"runtime Sync UX V2");
ok(runtime.includes("lastSyncedAt")&&runtime.includes("vault_last_sync"),"última sync persistida");
ok(indicator.includes("VAULT_SYNC_INDICATOR_V56"),"indicador V56");
ok(indicator.includes('router.push("/diagnostico")'),"diagnóstico usa rota real");
ok(!indicator.includes("window.location.hash"),"hash morto removido");
ok(indicator.includes("lastSyncLabel"),"horário da última sync");
ok(!mais.includes("item travado")&&!mais.includes("itens travados"),"pendência não é chamada de travada");
// V56 R04 reconciliation: execute the real contextual fallback instead of requiring a literal router call.
function verifyMedicationCreateContextR04(source,route){
  const ast=ts.createSourceFile('medication-create.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  ok(ast.parseDiagnostics.length===0,'R04 medication-create TSX parses');
  const declarations=[];
  function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='returnFromCreateR04'&&n.initializer)declarations.push(n);ts.forEachChild(n,visit)}visit(ast);
  ok(declarations.length===1,'R04 exactly one real return helper');
  const cache=new Map();
  function loadNavigation(file){
    if(cache.has(file))return cache.get(file);
    const code=ts.transpileModule(r(file),{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
    ok(!(code.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),'R04 navigation module compiles '+file);
    const m={exports:{}};new Function('module','exports','require',code.outputText)(m,m.exports,id=>{if(id==='@/lib/navigation/return-context')return loadNavigation('lib/navigation/return-context.ts');throw Error('unexpected navigation dependency '+id)});cache.set(file,m.exports);return m.exports;
  }
  const {safeClinicalReturnM150}=loadNavigation('lib/navigation/clinical-return-m150.ts');
  const declaration=ts.transpileModule('const '+declarations[0].getText(ast)+';', {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const evaluate=search=>new Function('safeClinicalReturnM150','window',declaration+'\nreturn returnFromCreateR04();')(safeClinicalReturnM150,{location:{search}});
  const cases=[
    [null,route],['',route],['/', '/'],['/hoje?tab=rotina#doses','/hoje?tab=rotina#doses'],
    ['/saude/medicamentos?tab=ativos#lista','/saude/medicamentos?tab=ativos#lista'],
    ['/saude/consultas/detalhes?id=a%2Fb','/saude/consultas/detalhes?id=a%2Fb'],
    ['/saude/medicamentos/novo?x=1',route],['/saude/medicamentos/%6eovo/',route],
    ['https://outside.invalid',route],['//outside.invalid',route],['/%61pi/private',route],
    ['/saude/../api/private',route],['/saude/%ZZ',route],
    ['/hoje?tab=rotina&return_to=https%3A%2F%2Foutside.invalid#doses','/hoje?tab=rotina#doses']
  ];
  for(const [origin,want] of cases){const search=origin===null?'':'?'+new URLSearchParams({return_to:origin});assert.equal(evaluate(search),want,`R04 contextual return ${String(origin)}`)}
  ok(source.includes('onConfirm={()=>{setShowDraftExitR04(false);router.replace(returnFromCreateR04());}}'),'R04 discard confirmation executes contextual return');
  ok(source.includes('() => setShowDraftExitR04(true)')&&source.includes('onClose={()=>setShowDraftExitR04(false)}'),'R04 cancel/back retains draft until explicit confirmation');
  for(const key of ['linkedConsultationOnSaveD2','linkedConsultationD2']){
    ok(source.includes('router.replace('+key)&&source.includes('`/saude/consultas/detalhes?id=${encodeURIComponent('+key+')}`'),'R04 linked consultation retained '+key);
  }
  ok(source.split(': returnFromCreateR04());').length===3,'R04 ordinary save and postponed retroactive review use actual contextual return');
  console.log('V56_R04_CONTEXTUAL_RETURN_PASS='+cases.length);
}

const canonical={"app/documentos/novo/page.tsx":"/documentos","app/pessoas/novo/page.tsx":"/pessoas","app/saude/medicos/novo/page.tsx":"/saude/medicos","app/saude/farmacias/novo/page.tsx":"/saude/farmacias","app/saude/documentos/novo/page.tsx":"/saude/documentos","app/saude/exames/novo/page.tsx":"/saude/exames","app/saude/cirurgias/nova/page.tsx":"/saude/cirurgias","app/saude/medicamentos/novo/page.tsx":"/saude/medicamentos","app/saude/consultas/nova/page.tsx":"/saude/consultas","app/saude/locais/novo/page.tsx":"/saude/locais","app/saude/registros/novo/page.tsx":"/saude/registros","app/saude/renovacao/nova/page.tsx":"/saude/renovacao","app/saude/hospitais/novo/page.tsx":"/saude/hospitais","app/saude/cids/novo/page.tsx":"/saude/cids"};
for(const [file,route] of Object.entries(canonical)){if(!fs.existsSync(file))continue;const s=r(file);ok(!s.includes("router.back()"),`${file}: sem back cego`);const hasDirectFallback=s.includes(`router.replace("${route}")`);const hasSafeReturnTo=s.includes("router.replace(returnTo)")&&s.includes(`: "${route}"`);const hasContextualFallback=s.includes(`useReturnContext("${route}")`)&&s.includes("router.replace(backTarget)");if(file==="app/saude/medicamentos/novo/page.tsx"){verifyMedicationCreateContextR04(s,route);ok(true,`${file}: fallback canônico`)}else{ok(hasDirectFallback||hasSafeReturnTo||hasContextualFallback,`${file}: fallback canônico`)}}
ok(r("components/Providers.tsx").includes("VAULT_SYNC_TERMINAL_STATE_V50_1_1"),"sync V50.1.1 preservado");
ok(r("components/BiometricLock.tsx").includes("VAULT_BIOMETRIC_POLICY_V66"),"biometria seletiva V66 preservada");
console.log("V56 FINAL STABILITY CONTRACT: OK");
