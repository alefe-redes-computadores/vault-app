import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const ok = (value, message) => {
  if (!value) {
    throw new Error(
      `NOTIFICAÇÃO V66: ${message}`
    );
  }
  console.log(`OK: ${message}`);
};

const bio =
  read("components/BiometricLock.tsx");

const providers =
  read("components/Providers.tsx");

const health =
  read("components/HealthReminderReconciler.tsx");

const policy =
  read("lib/health-intelligence/notification-policy.ts");

const central =
  read("app/inteligencia/page.tsx");

const nav =
  read("lib/notification-navigation.ts");

const gate =
  read("scripts/test-v63-release-gate.mjs");

ok(
  bio.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "lock global substituído por boundary passivo"
);

ok(
  !bio.includes("authenticate("),
  "entrada por notificação não concorre com autenticação global"
);

ok(
  nav.includes("VAULT_NOTIFICATION_NAVIGATION_V66"),
  "navegação de notificação usa política V66"
);

ok(
  !nav.includes("biometric-locked"),
  "deep-link não espera lock global"
);

ok(
  !nav.includes("biometric:lockchange"),
  "deep-link não depende de evento biométrico global"
);

ok(
  providers.includes("runAfterVaultBiometricUnlock"),
  "Providers preserva compatibilidade de deep-links"
);

ok(
  health.includes("runAfterVaultBiometricUnlock"),
  "reconciliador preserva compatibilidade de deep-links"
);

ok(
  health.includes("/inteligencia?healthInsight="),
  "Insight continua abrindo destino exato"
);

ok(
  policy.includes("VAULT_INSIGHT_EXACT_ENTRY_V1"),
  "policy preserva entrada exata do Insight"
);

ok(
  policy.includes("encodeURIComponent(insightId)"),
  "Insight ID continua codificado"
);

ok(
  central.includes('get("healthInsight")'),
  "Central continua lendo Insight do deep-link"
);

ok(
  central.includes("health.insights.find"),
  "Central resolve Insight atual"
);

ok(
  central.includes("setSelectedHealth(match)"),
  "Central abre HealthInsightSheet"
);

ok(
  gate.includes(
    "test-notification-entry-biometric-hotfix-contract.mjs"
  ),
  "contrato permanece no release gate"
);

console.log(
  "VAULT NOTIFICATION ENTRY V66 CONTRACT: OK"
);
