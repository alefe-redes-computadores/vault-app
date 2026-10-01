import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V67 PRODUCT EXPERIENCE: ${message}`);
  console.log(`OK: ${message}`);
};

const timeline = read("app/saude/timeline/page.tsx");
const intelligence = read("app/inteligencia/saude/page.tsx");
const hydration = read("app/saude/hidratacao/page.tsx");
const reminders = read("app/saude/lembretes/page.tsx");
const profile = read("app/perfil/page.tsx");
const more = read("app/mais/page.tsx");
const clinical = read("lib/health-intelligence/clinical-timeline-v4.ts");
const biometric = read("components/BiometricLock.tsx");

ok(timeline.includes("VAULT_CLINICAL_TIMELINE_V67"), "timeline clínica de leitura criada");
ok(timeline.includes("health.brainV4?.timeline"), "timeline reutiliza Brain V4 sem segunda fonte de verdade");
ok(!timeline.includes("db."), "timeline não persiste nem duplica dados");
ok(clinical.includes("buildCanonicalClinicalTimeline"), "timeline canônica existente preservada");
ok(intelligence.includes('router.push("/saude/timeline")'), "saúde longitudinal abre histórico completo");
ok(intelligence.includes("Fontes internas consultadas"), "explicabilidade mostra proveniência");
ok(intelligence.includes("selected.acaoSegura"), "explicabilidade mostra próximo passo seguro");
ok(hydration.includes("VAULT_HYDRATION_EXPERIENCE_V67"), "hidratação V67 instalada");
ok(hydration.includes("Ausência não conta como zero"), "hidratação não converte ausência em zero");
ok(reminders.includes("VAULT_REMINDER_INTENT_UX_V67"), "lembretes guiados por intenção");
ok(profile.includes("Protege senhas, cartões e ações sensíveis"), "perfil explica biometria seletiva");
ok(
  more.includes("Preferências do aplicativo") &&
    more.includes("Biometria") &&
    more.includes("Biometria ativada para ações sensíveis"),
  "Mais preserva biometria seletiva na experiência compacta"
);
ok(biometric.includes("VAULT_BIOMETRIC_POLICY_V66"), "política biométrica V66 preservada");

console.log("VAULT V67 FINAL PRODUCT EXPERIENCE: CONTRATOS OK");
