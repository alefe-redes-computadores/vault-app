#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
let count=0;
const read=file=>fs.readFileSync(file,"utf8");
const ok=(value,label)=>{assert.ok(value,`M130: ${label}`);count++;};
const files=[
  "components/saude/AvatarEvidenceLensM122.tsx",
  "app/saude/medicamentos/page.tsx",
  "app/saude/medicamentos/detalhes/page.tsx",
  "app/saude/medicamentos/revisao-retroativa/page.tsx",
  "app/page.tsx",
];
for(const file of files){
  const source=read(file);
  const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  ok(parsed.parseDiagnostics.length===0,`TSX válido: ${file}`);
}
const lens=read(files[0]);
ok(lens.includes("activeDomain")&&lens.includes("setActiveDomain(current=>current===domain.id?null:domain.id)"),"lente usa uma única categoria ativa");
ok(lens.includes("aria-expanded={expanded}")&&lens.includes("aria-controls={`fenix-domain-${domain.id}`}"),"acordeão expõe estado acessível");
ok(lens.includes("self-start")&&!lens.includes("group-open/domain"),"cartão fechado não herda altura ou animação fantasma do vizinho");
ok(lens.includes("opened?buildAvatarEvidenceLensM122")&&lens.includes("evidenceReceiptM119(insight)"),"cálculo sob demanda e autoridade M119 preservados");
const list=read(files[1]),detail=read(files[2]),retro=read(files[3]),home=read(files[4]);
ok(list.includes('return_to=${encodeURIComponent("/saude/medicamentos")}'),"listagem declara proprietário do retorno");
ok(detail.includes('safeReturnTarget(searchParams.get("return_to"), "/saude/medicamentos")')&&!detail.match(/const handleSafeBack[\s\S]{0,900}router\.back\(\)/),"detalhes não confiam no histórico do navegador");
ok(detail.includes("setAttachmentPreviewUrl(url)")&&detail.includes('title="Anexo da receita"')&&detail.includes("Abrir externamente"),"anexo abre primeiro no VAULT com fallback explícito");
ok(detail.includes("withReturnTarget(`${retroReviewHref(med.id!)}&origem=detalhes`,returnTo)"),"revisão recebe retorno explícito");
ok(retro.includes('safeReturnTarget(search.get("return_to")')&&retro.includes("retroReviewExitAction"),"revisão valida retorno sem perder contrato M67");
ok(home.includes("operationalAlerts.filter")&&home.includes("HomeAttentionRail alerts={unifiedAlerts}")&&home.includes("quantityAlreadyInBrain"),"Home deduplica destino principal e acompanhamento já explicado");
for(const token of ["useSharedHealthIntelligence","projectHomeDashboardAlerts","suppressOperationalOverlap","HomeAttentionRail","HomeDoseQuantityFollowUp"])ok(home.includes(token),`autoridade da Home preservada: ${token}`);
ok(!detail.includes("setAttachmentPreviewUrl(url);\n\n      window.open"),"visualização interna não dispara janela externa automaticamente");
console.log(`VAULT M130: ${count} contratos de lente, retorno e deduplicação aprovados`);
