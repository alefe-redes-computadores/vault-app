import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(`V32/V66: ${message}`);
  console.log(`OK: ${message}`);
};

const bio = read("components/BiometricLock.tsx");
const layout = read("app/layout.tsx");
const more = read("app/mais/page.tsx");
const cards = read("app/cartoes/detalhes/page.tsx");

const passwords = [
  "app/senhas/page.tsx",
  "app/senhas/detalhes/page.tsx",
  "app/senhas/editar/page.tsx",
  "app/senhas/novo/page.tsx",
].map(read).join("\n");

// V32 foi originalmente criado quando biometria significava lock global.
// V66 mantém a segurança, mas desloca autenticação para a ação sensível.
ok(
  bio.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "política biométrica seletiva V66 presente"
);

ok(
  bio.includes("return <>{children}</>"),
  "abertura normal do Vault não é bloqueada"
);

ok(
  !bio.includes("appStateChange"),
  "retorno do background não dispara autenticação global"
);

ok(
  !bio.includes("authenticate("),
  "boundary global não chama biometria"
);

ok(
  !bio.includes("biometric-locked"),
  "estado global biometric-locked foi aposentado"
);

ok(
  layout.includes("<BiometricLock>"),
  "boundary estrutural continua estável no layout"
);

ok(
  passwords.includes("useBiometric"),
  "senhas continuam protegidas localmente"
);

ok(
  cards.includes("useBiometric"),
  "cartões continuam protegidos localmente"
);

ok(
  more.includes("useBiometric"),
  "ações sensíveis de Mais continuam com biometria"
);

ok(
  more.includes("VAULT_CLEAR_DATA_BIOMETRIC_V32"),
  "confirmação biométrica de exclusão destrutiva foi preservada"
);

console.log("V32 -> V66 BIOMETRIA/SEGURANÇA CONTRATOS OK");
