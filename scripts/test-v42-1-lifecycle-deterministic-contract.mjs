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
  if (!value) throw new Error(`V42.1/V66: ${message}`);
  console.log(`OK: ${message}`);
};

ok(
  bio.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "boundary biométrico usa política V66"
);

ok(
  !bio.includes("backgroundedAtRef"),
  "controle de background global removido"
);

ok(
  !bio.includes("filePickerArmedAtRef"),
  "picker não precisa mais de exceção biométrica global"
);

ok(
  !bio.includes("nativeUiTransitionRef"),
  "máquina de transição nativa global removida"
);

ok(
  secure.includes("VAULT_SECURE_SCREEN_V66"),
  "secure screen compatível com V66"
);

ok(
  !secure.includes("appStateChange"),
  "secure screen não cria segunda autoridade"
);

console.log("V42.1 -> V66 LIFECYCLE CONTRACT: OK");
