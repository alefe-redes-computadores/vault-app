"use strict";
/** M100 P1 — hermético: sem Android, sem Dexie real, sem rede, sem Supabase. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
let count=0;
const ok=(v,label)=>{assert.ok(v,`M100 P1: ${label}`);count++;console.log(`OK ${count}: ${label}`);};
const read=p=>fs.readFileSync(p,"utf8");
function compile(p) {
  const source=read(p);
  const ast=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true,p.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(ast.parseDiagnostics.length===0,`sintaxe TS/TSX ${p}`);
  const result=ts.transpileModule(source,{fileName:p,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  ok((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length===0,`transpilação ${p}`);
  return result.outputText;
}
function loadPure(p, mocks={}) {
  const mod=new Module(path.resolve(p),module);
  mod.filename=path.resolve(p);
  mod.paths=Module._nodeModulePaths(path.dirname(mod.filename));
  mod.require=id=>Object.prototype.hasOwnProperty.call(mocks,id)?mocks[id]:require(id);
  mod._compile(compile(p),mod.filename);
  return mod.exports;
}
for(const p of [
  "app/pessoas/page.tsx", "components/PersonSelector.tsx", "components/FamilyProfileInlineM100.tsx",
  "lib/family/local-profile-m100.ts", "lib/health-connect/evidence-m100.ts",
  "components/saude/HealthConnectPanel.tsx", "components/saude/HealthConnectEvidenceM100.tsx",
  "components/saude/HealthMetricDetails.tsx"
])compile(p);
const events=[];
const store=new Map();
global.window={localStorage:{getItem:key=>store.get(key)||null,setItem:(key,v)=>store.set(key,v)},dispatchEvent:e=>events.push(e.type)};
global.Event=class {constructor(type){this.type=type;}};
const family=loadPure("lib/family/local-profile-m100.ts");
ok(family.FAMILY_PROFILE_REMOTE_ACCESS_M100===false,"nenhum papel libera acesso remoto");
ok(family.getFamilyProfileM100("ownerA","p1").relation==="nao_informado","sem papel implícito");
ok(!family.setFamilyProfileM100("","p1",{relation:"titular",routine:"organizo"}),"conta vazia rejeitada");
ok(!family.setFamilyProfileM100("ownerA","",{relation:"titular",routine:"organizo"}),"pessoa vazia rejeitada");
ok(!family.setFamilyProfileM100("ownerA","p1",{relation:"admin",routine:"organizo"}),"papel administrativo não suportado");
ok(family.setFamilyProfileM100("ownerA","p1",{relation:"filho_filha",routine:"organizo"}),"classificação local salva");
ok(family.getFamilyProfileM100("ownerA","p1").relation==="filho_filha","mesma conta e pessoa lê classificação");
ok(family.getFamilyProfileM100("ownerB","p1").relation==="nao_informado","outra conta não lê classificação");
ok(family.getFamilyProfileM100("ownerA","p2").relation==="nao_informado","outra pessoa não herda classificação");
ok(events.includes(family.VAULT_FAMILY_PROFILE_EVENT_M100),"evento de atualização de UI emitido");
ok(family.clearFamilyProfileM100("ownerA","p1")&&family.getFamilyProfileM100("ownerA","p1").relation==="nao_informado","remoção local após exclusão");
store.set("vault_m100_local_family_profiles_v1", "{corrompido");
ok(family.getFamilyProfileM100("ownerA","p1").routine==="nao_informado","localStorage corrompido não quebra aplicação");
const ev=loadPure("lib/health-connect/evidence-m100.ts");
const status={availability:"available",granted:["sono","peso"]};
const connection={user_id:"u",person_id:"p1",types:["sono","peso","oxigenacao"],last_synced:"2026-11-07T12:00:00.000Z",last_error:null};
const now=Date.parse("2026-11-08T12:00:00Z");
let evidence=ev.projectConnectEvidenceM100(connection,status,"p1",now);
ok(evidence.linked&&evidence.permissionState==="partial"&&evidence.permittedMetrics===2,"permissões reais não confundidas com tipos solicitados");
ok(evidence.lastImportAt===connection.last_synced&&evidence.recentImport,"última importação recente, sem afirmar atualidade da medição");
ok(!ev.projectConnectEvidenceM100(connection,status,"p2",now).linked,"Health Connect não vaza contexto entre pessoas");
ok(ev.projectConnectEvidenceM100({...connection,last_synced:"2032-01-01T12:00:00Z"},status,"p1",now).lastImportAt===null,"importação futura inválida");
ok(!ev.projectConnectEvidenceM100({...connection,last_synced:"2026-10-01T12:00:00Z"},status,"p1",now).recentImport,"importação antiga não é apresentada como recente");
ok(ev.projectConnectEvidenceM100({...connection,last_error:"erro"},status,"p1",now).message.includes("alerta"),"falha de sincronização sinalizada");
ok(!ev.UNSUPPORTED_CONNECT_METRICS_M100.includes("HRV")&&ev.UNSUPPORTED_CONNECT_METRICS_M100.includes("Estágios do sono")&&ev.HEALTH_CONNECT_SOURCE_WARNING_M100.includes("não é comprovada"),"HRV opt-in avançou, estágios e origem de sensor não são presumidos");
const persons=read("app/pessoas/page.tsx");
ok(persons.includes("<FamilyProfileInlineM100 personId={personId} />")&&persons.includes("clearFamilyProfileM100(user.id, id)"),"página Pessoas integrada e limpeza após exclusão");
const selector=read("components/PersonSelector.tsx");
ok(selector.includes('db.persons.where("user_id").equals(user.id).toArray()')&&!selector.includes('db.persons.toArray()'),"seletor consulta apenas perfis da conta autenticada");
ok(selector.includes("VAULT_FAMILY_PROFILE_EVENT_M100")&&selector.includes("familyRelationLabelM100"),"badge de relação acompanha seleção");
const panel=read("components/saude/HealthConnectPanel.tsx");
ok(panel.includes("<HealthConnectEvidenceM100 connection={linked ? connection : undefined} status={status} personId={personId} />"),"diagnóstico da origem integrado ao painel existente");
ok(read("components/saude/HealthMetricDetails.tsx").includes('row.source === "health_connect"'),"histórico distingue origem do aplicativo e sensor");
const gate=read("scripts/test-v63-release-gate.mjs");
ok(gate.includes('"scripts/test-vault-m100-p1-family-health.cjs"')&&gate.includes('"scripts/test-vault-m99-p3-final.cjs"'),"gate conserva M99 e inclui M100");
const familyUi=read("components/FamilyProfileInlineM100.tsx");
ok(!/<select\b/i.test(familyUi),"V112: painel familiar sem select nativo visível");
ok((familyUi.match(/type="radio"/g)||[]).length===2 && familyUi.includes("<fieldset") && familyUi.includes("<legend"),"grupos de escolha acessíveis e controlados");
const source=read("lib/family/local-profile-m100.ts")+read("components/FamilyProfileInlineM100.tsx");
ok(!/doseLogsRepository|supabase\.from\(|enfileirarOperacao|requestPermissions\(/.test(source),"classificação não altera dados clínicos nem pede permissões");
console.log(`M100 P1: ${count} verificações aprovadas (Android e build produtivo exigem homologação).`);
