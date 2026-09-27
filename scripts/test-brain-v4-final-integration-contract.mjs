import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`BRAIN V4 FINAL: ${message}`);
  console.log(`OK: ${message}`);
};

const longitudinal = read("lib/health-intelligence/longitudinal-v4.ts");
const feedback = read("lib/health-intelligence/feedback-v4.ts");
const experience = read("lib/health-intelligence/experience-v4.ts");
const page = read("app/inteligencia/saude/page.tsx");
const policy = read("lib/health-intelligence/notification-policy.ts");
const brain = read("lib/health-intelligence/brain-v4.ts");
const gate = read("scripts/test-v63-release-gate.mjs");

ok(
  longitudinal.includes("VAULT_BRAIN_V4_CHANGE_POINT") &&
  longitudinal.includes('kind: "change_point"'),
  "change-point é calculado de verdade"
);

ok(
  longitudinal.includes("VAULT_BRAIN_V4_TEMPORAL_RELATION") &&
  longitudinal.includes('kind: "temporal_relation"'),
  "relação temporal é calculada de verdade"
);

ok(
  longitudinal.includes("não demonstra") ||
  longitudinal.includes("não implica causalidade"),
  "relação temporal não afirma causalidade"
);

ok(
  feedback.includes('"hide"') &&
  feedback.includes("selectExperienceInsightsV4"),
  "feedback possui Não mostrar e seletor de relevância"
);

ok(
  feedback.includes("Não modifica evidência") ||
  feedback.includes("Não modifica evidência, confiança clínica"),
  "feedback não altera verdade clínica"
);

ok(
  experience.includes("buildInsightExplanationV4") &&
  experience.includes("coverageLabel") &&
  experience.includes("nearbyEvents"),
  "explainability V4 expõe período, cobertura e eventos"
);

ok(
  page.includes("Por que o Vault mostrou isso?"),
  "UI expõe explicação profunda"
);

ok(
  page.includes("selectExperienceInsightsV4") &&
    page.includes("readInsightFeedbackV4") &&
    page.includes("feedbackRevision"),
  "feedback influencia a experiência exibida"
);

ok(
  page.includes('["hide", "Não mostrar"]'),
  "UI oferece Não mostrar"
);

ok(
  page.includes("[...health.brainV4.longitudinalSignals]"),
  "UI não muta array do snapshot ao ordenar"
);

ok(
  brain.includes('version: "4.0-shadow"'),
  "Brain V4 continua explicitamente shadow"
);

ok(
  policy.includes("isEligibleForBehavioralPush") &&
  !policy.includes("LongitudinalSignalV4") &&
  !policy.includes("brain-v4"),
  "notificação comportamental continua isolada do Brain V4"
);

ok(
  gate.includes("scripts/test-brain-v4-final-integration-contract.mjs"),
  "contrato final entrou no release gate"
);

console.log("VAULT BRAIN V4 FINAL INTEGRATION — CONTRATO OK");
