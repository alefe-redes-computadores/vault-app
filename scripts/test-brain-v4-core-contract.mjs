import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}
function ok(condition, message) {
  if (!condition) throw new Error(`BRAIN V4 CORE: ${message}`);
  console.log(`OK: ${message}`);
}

const timeline = read("lib/health-intelligence/clinical-timeline-v4.ts");
const ledger = read("lib/health-intelligence/evidence-ledger-v4.ts");
const confidence = read("lib/health-intelligence/confidence-engine-v4.ts");
const longitudinal = read("lib/health-intelligence/longitudinal-v4.ts");
const brain = read("lib/health-intelligence/brain-v4.ts");
const hook = read("hooks/useHealthIntelligence.ts");
const gate = read("scripts/test-v63-release-gate.mjs");

ok(timeline.includes("buildCanonicalClinicalTimeline"), "timeline clínica canônica existe");
ok(timeline.includes('personId: string') && timeline.includes('source: string'), "timeline preserva pessoa e proveniência");
ok(timeline.includes('"dose"') && timeline.includes('"health_record"') && timeline.includes('"appointment"') && timeline.includes('"exam"') && timeline.includes('"pickup"'), "timeline unifica eventos clínicos principais");

ok(ledger.includes("buildEvidenceLedgerV4"), "Evidence Ledger existe");
ok(ledger.includes("coverageRatio") && ledger.includes("missingData") && ledger.includes("provenance"), "ledger registra cobertura, lacunas e proveniência");

ok(confidence.includes("assessInsightConfidenceV4"), "Confidence Engine existe");
ok(confidence.includes("shadowOnly: true"), "confiança V4 opera em shadow mode");
ok(!confidence.includes("insight.confianca ="), "Confidence Engine não sobrescreve confiança estável");

ok(longitudinal.includes('"trend"') && longitudinal.includes('"change_point"') && longitudinal.includes('"persistence"') && longitudinal.includes('"recurrence"'), "contrato longitudinal prevê tendência, mudança, persistência e recorrência");
ok(longitudinal.includes("buildLongitudinalSignalsV4"), "motor longitudinal V4 existe");
ok(longitudinal.includes("shadowOnly: true"), "sinais longitudinais ficam em shadow");

ok(brain.includes("buildBrainV4Snapshot"), "snapshot V4 existe");
ok(brain.includes("replayBrainV4"), "replay histórico existe");
ok(brain.includes("scopeContextForReplay"), "replay evita usar registros temporais futuros");
ok(brain.includes('version: "4.0-shadow"'), "versão shadow explícita");

ok(hook.includes("buildBrainV4Snapshot(context, insights)"), "V4 reutiliza contexto e Insights atuais");
ok(hook.includes("brainV4,") && hook.includes("replayBrainV4:"), "API V4 exposta pelo hook");
ok(gate.includes("scripts/test-brain-v4-core-contract.mjs"), "contrato V4 está no release gate");

console.log("VAULT BRAIN V4 CORE — CONTRATO OK");
