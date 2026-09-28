import fs from "node:fs";

const bio = fs.readFileSync(
  "components/BiometricLock.tsx",
  "utf8"
);

const secure = fs.readFileSync(
  "hooks/useSecureScreen.ts",
  "utf8"
);

const ok = (value, message) => {
  if (!value) throw new Error(`V53/V66: ${message}`);
  console.log(`OK: ${message}`);
};

ok(
  bio.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "política biométrica seletiva presente"
);

ok(
  !bio.includes("REAL_BACKGROUND_THRESHOLD_MS"),
  "grace global deixou de existir"
);

ok(
  !bio.includes("hasAutoPrompted"),
  "auto-prompt global removido"
);

ok(
  !bio.includes("runBiometricAuthentication"),
  "runner biométrico global removido"
);

ok(
  !bio.includes("fixed inset-0"),
  "overlay biométrico global removido"
);

ok(
  secure.includes("VAULT_SECURE_SCREEN_V66"),
  "shim de segurança atualizado"
);

console.log("V53 -> V66 BIOMETRIC POLICY CONTRACT: OK");
