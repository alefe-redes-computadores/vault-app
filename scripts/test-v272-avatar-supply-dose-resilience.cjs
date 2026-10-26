#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");
const ok=(value,label)=>{if(!value)throw new Error(`V272: ${label}`);console.log("OK:",label)};

const avatar=read("components/saude/HealthAvatar3D.tsx");
ok(avatar.includes("expressionHighlightScale")&&avatar.includes("object.scale.copy(base).multiplyScalar"),"brilho ocular preserva escala microscópica");
ok(!avatar.includes("expressionHighlights){object.position.y=restY")&&!avatar.includes("object.scale.setScalar(value===\"reflective\"?.82:1)"),"bolha gigante do Avatar não pode regressar");

const nav=read("components/BottomNav.tsx");
ok(nav.includes('normalizedPathname === "/saude/fornecimento"')&&nav.includes('/saude/fornecimento?action=novo'),"Fornecimento usa criação contextual da barra inferior");
ok(nav.includes('"/saude/fornecimento",'),"barra inferior permanece disponível no Fornecimento");

const supply=read("app/saude/fornecimento/page.tsx");
ok(!supply.includes('rightAction={<button')&&supply.includes('params.get("action") === "novo"'),"cabeçalho não duplica ação Novo");
ok(supply.includes("overflow-x-hidden")&&supply.includes("grid-cols-1 gap-2 sm:grid-cols-2"),"layout de Fornecimento é responsivo sem trilho cortado");
ok(supply.includes("Ajuda e catálogo SUS")&&!supply.includes("Como organizar o fornecimento</summary>"),"ajuda redundante foi consolidada");
ok(!supply.includes("[requestedProcessId, requestedCycleId, medId, params]"),"efeito de URL não depende da identidade instável de searchParams");

const pending=read("components/PendingDosesModal.tsx");
ok(pending.includes("Escolher horário das tomadas")&&pending.includes("Nada será registrado até você escolher"),"lote de doses explica a segunda etapa antes de registrar");
ok(pending.includes("Confirmar horários programados")&&pending.includes("Confirmar como tomadas agora"),"ações finais de dose são inequívocas");

const boundary=read("app/error.tsx");
ok(boundary.includes("Tentar novamente")&&boundary.includes("window.location.reload()"),"falha transitória possui recuperação sem apagar dados");

console.log("\nVAULT V272 — AVATAR + FORNECIMENTO + DOSES + RESILIÊNCIA: OK");
