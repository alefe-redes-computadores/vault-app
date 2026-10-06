import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`BRAIN V4 EXPERIENCE: ${message}`);
  console.log(`OK: ${message}`);
};

const experience = read("lib/health-intelligence/experience-v4.ts");
const feedback = read("lib/health-intelligence/feedback-v4.ts");
const page = read("app/inteligencia/saude/page.tsx");
const central = read("app/inteligencia/page.tsx");
const brain = read("lib/health-intelligence/brain-v4.ts");
const gate = read("scripts/test-v63-release-gate.mjs");

ok(experience.includes("buildDailyBriefingV4"), "Daily Briefing existe");
ok(experience.includes("buildWeeklyReviewV4"), "Weekly Review existe");
ok(experience.includes("buildConsultationPrepV4"), "Preparar consulta existe");
ok(experience.includes("buildBrainHealthV4"), "Brain Health existe");
ok(experience.includes("questionsToRemember"), "consulta usa lembretes seguros, não prescrição");
ok(experience.includes("dataQuality"), "preparação expõe qualidade dos dados");

ok(feedback.includes('"useful"') && feedback.includes('"not_relevant"') && feedback.includes('"already_knew"') && feedback.includes('"remind_later"'), "feedback de relevância possui quatro ações");
ok(feedback.includes("personId") && feedback.includes("insightId"), "feedback é person-scoped e insight-scoped");

ok(page.includes("Briefing de hoje"), "UI mostra briefing");
ok(page.includes("Revisão dos últimos 7 dias"), "UI mostra revisão semanal");
ok(page.includes("Timeline de inteligência"), "UI mostra timeline");
ok(page.includes("Sinais longitudinais"), "UI mostra sinais longitudinais");
ok(page.includes("Preparar consulta"), "UI mostra preparação clínica");
ok(page.includes("Saúde do cérebro"), "UI mostra observabilidade");
ok(page.includes("Ensinar relevância ao Vault"), "UI oferece feedback");
ok(page.includes("não provam causa") && page.includes("não certeza médica"), "UI mantém limites clínicos explícitos");

ok(central.includes('router.push("/inteligencia/alertas")'), "Central possui entrada para o Cérebro V5");
ok(page.includes('router.replace("/inteligencia")'), "Saúde longitudinal V4 permanece integrada à Central");
ok(!central.includes("VAULT INSIGHT · V60"), "branding não exibe versão técnica antiga");

ok(brain.includes('version: "4.0-shadow"'), "motor longitudinal continua shadow para notificações");
ok(gate.includes("scripts/test-brain-v4-experience-clinical-contract.mjs"), "contrato Experience entra no release gate");

console.log("VAULT BRAIN V4 EXPERIENCE + CLINICAL — CONTRATO OK");
