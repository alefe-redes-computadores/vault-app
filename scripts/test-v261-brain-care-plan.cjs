const fs = require("node:fs");
const assert = require("node:assert/strict");

const read = file => fs.readFileSync(file, "utf8");
const plan = read("lib/health-intelligence/care-plan.ts");
const command = read("lib/health-intelligence/care-command.ts");
const central = read("app/inteligencia/page.tsx");
const component = read("components/health-intelligence/BrainCarePlan.tsx");
const avatar = read("components/saude/AvatarCareReadiness.tsx");
const version = read("lib/health-intelligence/version.ts");
const manifest = JSON.parse(read("scripts/surgery21/manifests/v261.json"));
const ok = (value, label) => { assert.ok(value, label); console.log("OK:", label); };

ok(plan.includes('"recorded" | "projected" | "association" | "missing_data"'), "autoridade da evidência permanece explícita");
ok(plan.includes('É uma associação temporal, não prova causa nem efeito de tratamento.'), "associação cautelosa não vira causalidade");
ok(plan.includes('state === "ready"') && plan.includes("medicationAlreadyPlanned"), "plano não duplica medicamento nem cria pendência pronta");
ok(plan.includes("plannedKnownCost + month.expectedRefillCost"), "projeção financeira mantém custo conhecido e reposição separados na origem");
ok(plan.includes("nextConsultation") && plan.includes("daysSinceLastCompletedConsultation"), "consulta recebe janela longitudinal");
ok(plan.includes("status !== \"cancelada\"") && plan.includes("item.data >= forecast.generatedFor"), "consulta futura exclui cancelada e respeita dia civil");
ok(command.includes("buildBrainCarePlan") && command.includes("plan: BrainCarePlan"), "comando compartilhado é a fonte única do plano");
ok(central.includes("<BrainCarePlan plan={health.careCommand.plan}"), "Central apresenta o plano compartilhado");
ok(component.includes("fato registrado, projeção e padrão") && component.includes("projectedCostCoverage30d"), "UI explica evidência e cobertura financeira");
ok((avatar.includes("command?.plan.focus[0]") || avatar.includes("command?.decision")) && avatar.includes("planFocus?.href"), "Avatar abre a etapa contextual real");
ok(/BRAIN_VERSION = "6\.[0-9]+"/.test(version), "Brain V6 possui versão canônica");
ok(manifest.base === "0837f97dd955499c86924ca8c97272154ba8a11f" && manifest.publish === false && manifest.database.migrations.length === 0, "manifesto Surgery 2.1 fixa base, banco e publicação separada");

console.log("\nVAULT V261 — BRAIN V6 CARE PLAN: OK");
