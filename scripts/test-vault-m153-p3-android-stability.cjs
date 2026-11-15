#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");
const ok=(name,fn)=>{fn();console.log(`✓ M153 P3 ${name}`)};
const files=["hooks/useAndroidModalViewport.ts","components/ui/BottomSheet.tsx","components/saude/QuickDoseModal.tsx","hooks/useDoseLogs.ts","lib/withdrawal-agenda.ts"];
for(const file of files) ok(`parse ${file}`,()=>{const src=read(file),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(ast.parseDiagnostics.length,0,ast.parseDiagnostics.map(x=>x.messageText).join("; "))});
const viewport=read(files[0]),sheet=read(files[1]),quick=read(files[2]),dose=read(files[3]),withdrawal=read(files[4]),css=read("app/globals.css");
ok("viewport acompanha teclado sem bloquear zoom",()=>{assert(viewport.includes("window.visualViewport"));assert(viewport.includes("scrollIntoView"));assert(!viewport.includes("user-scalable=no"))});
ok("BottomSheet usa viewport e safe area",()=>{assert(sheet.includes("useAndroidModalViewport"));assert(sheet.includes("data-keyboard-open"));assert(sheet.includes("layerStyle"));assert(sheet.includes("safe-area-inset-bottom"))});
ok("QuickDose usa a mesma autoridade",()=>{assert(quick.includes("useAndroidModalViewport"));assert(quick.includes("data-keyboard-open"));assert(quick.includes("layerStyle"));assert(quick.includes("portalReady"))});
ok("snapshot não pisca e nunca cruza pessoa/conta/data",()=>{assert(dose.includes("stableDoseRows"));assert(dose.includes("rememberStableDoseRows"));assert(dose.includes("stableScopeKey"));assert(dose.includes("doseLogsLive.personId === activePersonId"));assert(dose.includes("doseLogsLive.ownerId === ownerUserId"))});
ok("retirada concluída não volta a ser CTA",()=>{assert(withdrawal.includes("renovacao_realizada_id"));assert(withdrawal.includes("realizada_em"));assert(withdrawal.includes("status"));assert(withdrawal.includes("realizada"))});
ok("camada pública opaca e teclado auditável",()=>{assert(css.includes("VAULT_M153_P3_ANDROID_MODAL"));assert(css.includes('vault-modal-layer[data-keyboard-open="true"]'));assert(css.includes("scroll-margin-block: 5rem"));assert(quick.includes("backdrop-blur"));assert(sheet.includes("backdrop-blur"))});
ok("gate registra contrato uma vez",()=>assert.equal(read("scripts/test-v63-release-gate.mjs").split('"scripts/test-vault-m153-p3-android-stability.cjs"').length-1,1));
console.log("M153 P3 — NÚCLEO DE ESTABILIDADE ANDROID OK");
