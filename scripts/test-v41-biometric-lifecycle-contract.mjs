import fs from "node:fs";

const s = fs.readFileSync(
  "components/BiometricLock.tsx",
  "utf8"
);

const ok = (value, message) => {
  if (!value) throw new Error(`V41/V66: ${message}`);
  console.log(`OK: ${message}`);
};

ok(
  s.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "política seletiva V66 presente"
);

ok(
  !s.includes('App.addListener("appStateChange"'),
  "BiometricLock não observa lifecycle"
);

ok(
  !s.includes("authenticate("),
  "BiometricLock não autentica globalmente"
);

ok(
  !s.includes("biometric-locked"),
  "BiometricLock não cria estado global bloqueado"
);

ok(
  s.includes("return <>{children}</>"),
  "árvore do Vault permanece sempre disponível"
);

console.log("V41 -> V66 BIOMETRIC LIFECYCLE CONTRACT: OK");
