#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
const r=p=>fs.readFileSync(p,"utf8");let n=0;
const check=(name,fn)=>{fn();console.log(`OK M153 P2 ${++n}: ${name}`)};
const sql=r("supabase/migrations/20261115130748_vault_m153_p2_probe_responses_rls_owner_link.sql");
check("versionamento igual a migracao aplicada",()=>assert.match(sql,/M153 P2 - HISTORICO CANONICO: versao 20261115130748/));
check("RLS da resposta so authenticated",()=>assert.match(sql,/for all to authenticated/));
check("vinculo pessoa-probe no read e write",()=>assert.equal((sql.match(/q.person_id = brain_active_probe_responses.person_id/g)||[]).length,2));
check("anti-regressao de predicado anterior",()=>{assert.match(sql,/with_check like '%q.person_id = q.person_id%'/);assert.ok(!/and q.person_id = q.person_id\s*\)/.test(sql))});
check("preflight checa owner, tabelas e RLS",()=>{assert.match(sql,/mismatched response ownership/);assert.match(sql,/RLS not enabled/);assert.match(sql,/expected legacy RLS predicate/)});
check("sem DML clinico",()=>assert.ok(!/\b(insert into|update public\.|delete from public\.|truncate)\b/i.test(sql)));
const lot=r("components/health-intelligence/ManufacturerLotStartM152.tsx");
check("lote depende de consentimento e flag",()=>{assert.match(lot,/brainActiveProbingEnabled/);assert.match(lot,/loadActiveProbePreferences/);assert.match(lot,/preferenceAllows\("manufacturer_lot_started"/)});
check("evento de lote tem idempotencia estavel",()=>{assert.ok(lot.includes('event_id:`lot:${acquisitionId}`'));assert.ok(!lot.includes('event_id:`lot:${acquisitionId}:${at.slice'))});
check("confirmacao somente depois da persistencia local",()=>{const p=lot.indexOf("const persisted=expected.some"),s=lot.indexOf("setSaved(true)");assert.ok(p>=0&&s>p);assert.match(lot,/if\(!persisted\)throw/)});
check("erro claro, sem afirmar sincronizacao",()=>{assert.match(lot,/role="alert"/);assert.ok(!lot.includes("sincronizado"))});
check("TSX parse",()=>{const src=ts.createSourceFile("component.tsx",lot,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(src.parseDiagnostics.length,0,src.parseDiagnostics.map(x=>x.messageText).join(" | "))});
console.log(`M153 P2: ${n} contratos aprovados; auditoria estrutural NAO substitui teste com JWT ou Android.`);
