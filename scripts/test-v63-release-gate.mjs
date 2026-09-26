// scripts/test-v63-release-gate.mjs
import { spawnSync } from "node:child_process";

const contracts = [
  "scripts/test-pre-apk-v25-contract.mjs",
  "scripts/test-v28-perfis-edge-to-edge-contract.mjs",
  "scripts/test-v29-native-runtime-contract.mjs",
  "scripts/test-v30-2-native-contract.mjs",
  "scripts/test-v31-layout-nav-contract.mjs",
  "scripts/test-v32-biometria-seguranca-contract.mjs",
  "scripts/test-v33-fechamento-contract.mjs",
  "scripts/test-v33-1-navigation-contract.mjs",
  "scripts/test-v33-2-pending-dose-time-contract.mjs",
  "scripts/test-v34-1-modal-layer-contract.mjs",
  "scripts/test-v34-2-modal-portal-contract.mjs",
  "scripts/test-v35-1-regulatory-border-contract.mjs",
  "scripts/test-v36-1-event-contracts.mjs",
  "scripts/test-v36-2-userid-contract.mjs",
  "scripts/test-v36-notifications-contract.mjs",
  "scripts/test-v37-home-navigation-contract.mjs",
  "scripts/test-v40-bottomnav-normalization-contract.mjs",
  "scripts/test-v41-biometric-lifecycle-contract.mjs",
  "scripts/test-v42-1-lifecycle-deterministic-contract.mjs",
  "scripts/test-v42-lifecycle-single-authority-contract.mjs",
  "scripts/test-v43-overdue-dose-notifications-contract.mjs",
  "scripts/test-v44-contextual-fab-contract.mjs",
  "scripts/test-v45-hoje-doses-contract.mjs",
  "scripts/test-v46-temporal-engine-contract.mjs",
  "scripts/test-v47-clinical-stock-contract.mjs",
  "scripts/test-v48-clinical-time-contract.mjs",
  "scripts/test-v49-today-v3-contract.mjs",
  "scripts/test-v50-1-sync-contract.mjs",
  "scripts/test-v50-1-1-sync-terminal-state-contract.mjs",
  "scripts/test-v50-brain-v2-contract.mjs",
  "scripts/test-v51-notifications-v2-contract.mjs",
  "scripts/test-v52-notification-brain-contract.mjs",
  "scripts/test-v53-biometric-policy-contract.mjs",
  "scripts/test-v54-financial-intelligence-contract.mjs",
  "scripts/test-v55-health-intelligence-v3-contract.mjs",
  "scripts/test-v56-final-stability-contract.mjs",
  "scripts/test-v57-1-hotfix-contract.mjs",
  "scripts/test-v57-brain-v3-contract.mjs",
  "scripts/test-v58-contextual-brain-contract.mjs",
  "scripts/test-v59-regulatory-identity-contract.mjs",
  "scripts/test-v60-coherence-contract.mjs",
  "scripts/test-v61-behavioral-memory-contract.mjs",
  "scripts/test-v61-brain-memory-contract.mjs",
  "scripts/test-v61-final-contract.mjs",
  "scripts/test-v62-final-experience-contract.mjs",
  "scripts/test-v63-sync-truth-contract.mjs",
  "scripts/test-v64-super-final-contract.mjs",
  "scripts/test-vault-auth-singleton-v63-contract.mjs",
  "scripts/test-vault-offline-session-v62-contract.mjs",
];

for (const contract of contracts) {
  console.log(`\n=== ${contract} ===`);
  const result = spawnSync(process.execPath, [contract], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nVAULT RELEASE GATE V63: ${contracts.length} CONTRATOS OK`);
