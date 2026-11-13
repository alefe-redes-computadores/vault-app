#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");

const detail=read("app/saude/medicamentos/detalhes/page.tsx");
const viewer=read("components/saude/PrescriptionAttachmentViewerM143.tsx");
const meds=read("app/saude/medicamentos/page.tsx");
const today=read("app/hoje/page.tsx");
const home=read("app/page.tsx");
const agenda=read("components/hoje/TodayAgendaOverview.tsx");
const queue=read("components/saude/MedicationCareOpportunityQueue.tsx");
const gate=read("scripts/test-v63-release-gate.mjs");

assert.ok(detail.includes("<PrescriptionAttachmentViewerM143"));
assert.ok(viewer.includes("Ajustar à tela"));
assert.ok(viewer.includes('fileType !== "image"'));
assert.ok(viewer.includes("onTouchMove"));
assert.ok(meds.includes("setUnifiedList] = useState(true)"));
assert.ok(meds.includes("setUnifiedVisibleCount] = useState(24)"));
assert.ok(meds.includes("Buscar medicamento pelo nome ou princípio ativo"));
assert.ok(today.includes("Como você está se sentindo?"));
assert.equal(today.split('id="hoje-diario"').length,2);
assert.ok(today.indexOf('id="hoje-diario"')<today.indexOf('id="hoje-mes"'));
assert.ok(home.includes('<div id="home-continuity-other">'));
assert.ok(home.includes('withdrawalDaysOverdue(retirada.data, hoje) === 1'));
assert.ok(agenda.includes("PackageCheck"));
assert.ok(queue.includes("items[0].medicamentoNome"));
assert.ok(gate.includes('"scripts/test-vault-m142-documents.cjs"'));
assert.ok(gate.includes('"scripts/test-vault-m143-p1-r3.cjs"'));

for(const file of [
 "app/saude/medicamentos/detalhes/page.tsx",
 "app/saude/medicamentos/page.tsx",
 "app/hoje/page.tsx",
 "app/page.tsx",
 "components/hoje/TodayAgendaOverview.tsx",
 "components/saude/MedicationCareOpportunityQueue.tsx",
 "components/saude/PrescriptionAttachmentViewerM143.tsx"
]){
 const parsed=ts.createSourceFile(file,read(file),
   ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(parsed.parseDiagnostics.length,0,
   "TSX invalido "+file);
}
console.log("M143 P1 R3: CONTRATOS VISUAIS OK");
