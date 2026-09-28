import fs from "node:fs";

const read = (f) => fs.readFileSync(f, "utf8");

const ok = (value, message) => {
  if (!value) {
    throw new Error(
      `V66 LEGACY CLOSURE: ${message}`
    );
  }
  console.log(`OK: ${message}`);
};

const bio =
  read("components/BiometricLock.tsx");

const nav =
  read("components/BottomNav.tsx");

const v33 =
  read("scripts/test-v33-fechamento-contract.mjs");

const v331 =
  read("scripts/test-v33-1-navigation-contract.mjs");

const v341 =
  read("scripts/test-v34-1-modal-layer-contract.mjs");

const v56 =
  read("scripts/test-v56-final-stability-contract.mjs");

ok(
  bio.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "V66 é a política biométrica atual"
);

ok(
  bio.includes("return <>{children}</>"),
  "BiometricLock permanece boundary passivo"
);

ok(
  !bio.includes("appStateChange"),
  "lifecycle global continua removido"
);

ok(
  !bio.includes("authenticate("),
  "auto-autenticação global continua removida"
);

ok(
  !bio.includes("biometric-locked"),
  "estado global de bloqueio continua removido"
);

ok(
  v33.includes("VAULT_BIOMETRIC_POLICY_V66") &&
    !v33.includes('B.includes("removeListener: (() => void) | undefined")'),
  "V33 não exige lifecycle biométrico antigo"
);

ok(
  v331.includes("VAULT_BIOMETRIC_POLICY_V66") &&
    !v331.includes('bio.includes("removeListener: (() => void) | undefined")'),
  "V33.1 não exige lifecycle biométrico antigo"
);

ok(
  !v341.includes('nav.includes("aria-hidden={isBiometricLocked}")'),
  "V34.1 não exige estado visual biométrico antigo"
);

ok(
  v56.includes("VAULT_BIOMETRIC_POLICY_V66") &&
    !v56.includes('includes("VAULT_BIOMETRIC_POLICY_V53")'),
  "V56 reconhece política V66"
);

ok(
  !nav.includes("isBiometricLocked") &&
    !nav.includes("biometric-locked"),
  "BottomNav não depende do lock biométrico global"
);

console.log(
  "VAULT V66 LEGACY BIOMETRIC CLOSURE: OK"
);
