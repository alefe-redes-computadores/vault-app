#!/usr/bin/env node
"use strict";
const fs = require("fs"), assert = require("node:assert/strict"), ts = require("typescript");
const read = p => fs.readFileSync(p, "utf8");
let checks = 0;
function ok(name, fn) { fn(); checks++; console.log(`OK M153 P1 ${checks}: ${name}`); }
function loadModule(file, deps = {}) {
  const compiled = ts.transpileModule(read(file), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports:{}};
  new Function("module","exports","require", compiled)(module,module.exports,name => {if(name in deps)return deps[name];throw new Error(`Unexpected import ${name}`)});
  return module.exports;
}
const core = loadModule("lib/health-intelligence/active-probing/core.ts");
const policy = loadModule("lib/health-intelligence/active-probing/policy-m153.ts",{"./core":core});
const allow={enabled:true, manufacturer:false,confirmedSos:true,temporaryCourse:false,fourAxes:false,consentVersion:1};
const mk=(id,type="confirmed_sos_use",person="p",owner="u",day="2026-11-15")=>({id,idempotency_key:id,user_id:owner,person_id:person,trigger_type:type,created_at:`${day}T12:00:00Z`,due_at:`${day}T12:00:00Z`,consent_version:1});
const now="2026-11-15T20:00:00Z";
ok("off bloqueia tudo",()=>assert.deepEqual(policy.selectConsentGatedProbes([mk("a")],[],{...allow,enabled:false},"u","p",now),[]));
ok("consentimento invalido bloqueia",()=>assert.deepEqual(policy.selectConsentGatedProbes([mk("a")],[],{...allow,consentVersion:0},"u","p",now),[]));
ok("separacao de pessoa e titular",()=>assert.deepEqual(policy.selectConsentGatedProbes([mk("a","confirmed_sos_use","p2"),mk("b","confirmed_sos_use","p","u2")],[],allow,"u","p",now),[]));
ok("eixos e fabricantes independentes",()=>assert.deepEqual(policy.selectConsentGatedProbes([mk("a","manufacturer_lot_started")],[],allow,"u","p",now),[]));
ok("SOS confirmado permitdo",()=>assert.equal(policy.selectConsentGatedProbes([mk("a")],[],allow,"u","p",now).length,1));
ok("idempotencia usa mesma chave",()=>assert.deepEqual(policy.selectConsentGatedProbes([mk("a")],[mk("a")],allow,"u","p",now),[]));
ok("cap semanal 2",()=>assert.equal(policy.selectConsentGatedProbes([mk("a"),mk("b"),mk("c")],[],allow,"u","p",now).length,2));
ok("cap considera existentes",()=>assert.equal(policy.selectConsentGatedProbes([mk("c")],[mk("a"),mk("b")],allow,"u","p",now).length,0));
ok("sem herdar consentimento de outra pessoa",()=>assert.equal(policy.selectConsentGatedProbes([mk("c")],[mk("a","confirmed_sos_use","outra"),mk("b","confirmed_sos_use","outra")],allow,"u","p",now).length,1));
const feature=read("lib/health-intelligence/active-probing/feature.ts");
ok("flag de compilacao e localStorage nao habilita",()=>{assert(feature.includes('NEXT_PUBLIC_BRAIN_ACTIVE_PROBING !== "true"'));assert(!feature.includes("window.localStorage"));});
const consent=read("lib/health-intelligence/active-probing/consent-m153.ts");
ok("preferencia por owner e person, default OFF",()=>{assert(consent.includes("user_id: userId, person_id: personId"));assert(consent.includes("enabled: false"));});
const card=read("components/health-intelligence/BrainActiveProbeCard.tsx");
ok("UI depende de consentimento",()=>{assert(card.includes("BrainActiveProbeConsentPanel"));assert(card.includes("preferences.enabled"));});
const repo=read("lib/repositories/activeProbes.ts");
ok("repository impõe gate de escrita",()=>{assert(repo.includes("selectConsentGatedProbes"));assert(repo.includes("loadActiveProbePreferences"));});
const reconcile=read("lib/health-intelligence/active-probing/reconcile.ts");
ok("ciclo temporario requer resolucao integral",()=>assert(reconcile.includes("settled.length!==rows.length")));
const sql=read("docs/VAULT-M153-P1-RLS-REVIEW-ONLY.sql");
ok("SQL qualifica pessoa da resposta",()=>{assert(sql.includes("q.person_id = brain_active_probe_responses.person_id"));assert(sql.includes("to authenticated"));});
for(const file of ["components/health-intelligence/BrainActiveProbeCard.tsx","components/health-intelligence/BrainActiveProbeConsentPanelM153.tsx","lib/repositories/activeProbes.ts","lib/health-intelligence/active-probing/policy-m153.ts","lib/health-intelligence/active-probing/consent-m153.ts"]){
 ok(`parser TS ${file}`,()=>{const src=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(src.parseDiagnostics.length,0,src.parseDiagnostics.map(x=>x.messageText).join(" | "))});
}
console.log(`M153 P1: ${checks} checks PASS; tests nao substituem RLS canario ou Android real.`);
