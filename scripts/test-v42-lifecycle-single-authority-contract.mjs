import fs from "node:fs";

const bio = fs.readFileSync(
  "components/BiometricLock.tsx",
  "utf8"
);

const secure = fs.readFileSync(
  "hooks/useSecureScreen.ts",
  "utf8"
);

const layout = fs.readFileSync(
  "app/layout.tsx",
  "utf8"
);

const ok = (value, message) => {
  if (!value) throw new Error(`V42/V66: ${message}`);
  console.log(`OK: ${message}`);
};

ok(
  layout.includes("<BiometricLock>"),
  "boundary estrutural permanece no layout"
);

ok(
  bio.includes("return <>{children}</>"),
  "boundary é passivo"
);

ok(
  !bio.includes("@capacitor/app"),
  "boundary não controla AppState"
);

ok(
  !bio.includes("useBiometric("),
  "boundary não possui autenticação própria"
);

ok(
  !secure.includes("@capacitor/app") &&
    !secure.includes("authenticate("),
  "secure screen não cria autoridade concorrente"
);

ok(
  layout.includes('content="black-translucent"'),
  "imersão PWA preservada"
);

console.log("V42 -> V66 SINGLE AUTHORITY CONTRACT: OK");
