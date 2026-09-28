import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(path, "utf8");

const ok = (value, message) => {
  if (!value) {
    throw new Error(
      `V66 BIOMETRIA SELETIVA: ${message}`
    );
  }
  console.log(`OK: ${message}`);
};

const bio =
  read("components/BiometricLock.tsx");

const nav =
  read("lib/notification-navigation.ts");

const cards =
  read("app/cartoes/detalhes/page.tsx");

const passwords = [
  "app/senhas/page.tsx",
  "app/senhas/detalhes/page.tsx",
  "app/senhas/editar/page.tsx",
  "app/senhas/novo/page.tsx",
].map(read).join("\n");

const more =
  read("app/mais/page.tsx");

const layout =
  read("app/layout.tsx");

ok(
  bio.includes("VAULT_BIOMETRIC_POLICY_V66"),
  "política seletiva instalada"
);

ok(
  bio.includes("return <>{children}</>"),
  "Vault abre sem biometria global"
);

ok(
  !bio.includes("useBiometric("),
  "abertura não chama biometria"
);

ok(
  !bio.includes("appStateChange"),
  "minimizar/voltar não rearma biometria"
);

ok(
  !bio.includes("authenticate("),
  "boundary global não autentica"
);

ok(
  !bio.includes("biometric-locked"),
  "body não recebe lock biométrico global"
);

ok(
  nav.includes("VAULT_NOTIFICATION_NAVIGATION_V66"),
  "notificações navegam sem gate global"
);

ok(
  !nav.includes("biometric:lockchange"),
  "notificações não aguardam segundo prompt"
);

ok(
  cards.includes("useBiometric"),
  "cartões preservam gate biométrico local"
);

ok(
  passwords.includes("useBiometric"),
  "senhas preservam gates biométricos locais"
);

ok(
  more.includes("useBiometric"),
  "ações sensíveis de Mais preservam biometria"
);

ok(
  more.includes("VAULT_CLEAR_DATA_BIOMETRIC_V32"),
  "exclusão destrutiva continua protegida"
);

ok(
  layout.includes("<BiometricLock>"),
  "arquitetura do layout permanece estável"
);

console.log(
  "VAULT V66 BIOMETRIA SELETIVA: CONTRATOS OK"
);
