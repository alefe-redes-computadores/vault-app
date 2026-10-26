const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");
const ok=(value,label)=>{if(!value)throw Error(`V274: ${label}`);console.log("OK:",label)};

const list=read("app/saude/medicamentos/page.tsx");
const journey=read("components/saude/MedicationJourneySummary.tsx");
const supply=read("app/saude/fornecimento/page.tsx");
const health=read("app/saude/minha-saude/page.tsx");
const workspace=read("components/saude/AvatarCareWorkspace.tsx");

ok(list.includes('supplyRoute?.mode === "hybrid"'),"lista mostra origem somente quando a rota híbrida exige atenção");
ok(list.includes('careDecision.stage !== "stable" && !careAction'),"lista não repete badge e ação do mesmo cuidado");
ok(journey.includes("divide-y")&&journey.includes("ChevronRight"),"detalhe usa jornada linear navegável");
ok(journey.includes("Receita, aquisição e retirada são eventos independentes"),"autoridades operacionais continuam separadas");
ok(supply.includes("Histórico e relações do processo")&&supply.includes("vault-deferred"),"fornecimento recolhe histórico pesado sem removê-lo");
ok(workspace.includes("AvatarCareReadiness")&&workspace.includes("CareContinuityAvatarSummary")&&workspace.includes("AvatarAssociationSummary"),"Avatar consolida ação e evidências em um workspace");
ok(workspace.includes("Contexto e evidências do Avatar")&&workspace.includes("<details"),"evidências secundárias usam divulgação progressiva");
ok(health.includes("<AvatarCareWorkspace")&&!health.includes("<TemporaryCourseAvatarSummary"),"página do Avatar não empilha painéis paralelos");

console.log("\nVAULT V274 — MEDICAMENTOS + FORNECIMENTO + AVATAR WORKSPACE: OK");
