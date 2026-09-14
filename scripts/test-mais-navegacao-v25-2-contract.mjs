import fs from "node:fs";

const read = (file) =>
  fs.readFileSync(file, "utf8");

const checks = [];

const ok = (label, value) => {
  if (!value) {
    throw new Error("FALHOU: " + label);
  }

  checks.push(label);
  console.log("OK:", label);
};

const mais = read("app/mais/page.tsx");
const biometric = read("hooks/useBiometric.ts");
const bottom = read("components/BottomNav.tsx");
const header = read("components/list/ListPageHeader.tsx");
const submit = read("hooks/useSubmitAction.ts");
const pkg = JSON.parse(read("package.json"));

ok(
  "Mais usa versão coerente",
  mais.includes('APP_VERSION = "1.1.0"') &&
  pkg.version === "1.1.0"
);

ok(
  "tema possui três escolhas explícitas",
  mais.includes('"Claro"') &&
  mais.includes('"Escuro"') &&
  mais.includes('"Sistema"') &&
  mais.includes('setTheme(option.id)')
);

ok(
  "ajuda possui roteiro guiado",
  mais.includes("HELP_STEPS") &&
  mais.includes("Conheça o Vault") &&
  mais.includes("Avançar") &&
  mais.includes("Concluir")
);

ok(
  "diagnóstico é condicionado ao proprietário",
  mais.includes("isDiagnosticOwner &&") &&
  mais.includes("DIAGNOSTIC_OWNER_EMAIL")
);

ok(
  "biometria não é anunciada no navegador",
  biometric.includes("setIsAvailable(false)") &&
  biometric.includes("setBiometricType('none')") &&
  biometric.includes("!Capacitor.isNativePlatform()")
);

ok(
  "Mais avisa quando biometria exige aplicativo",
  mais.includes("somente no aplicativo instalado")
);

const navigationBlock =
  bottom.slice(
    bottom.indexOf("const handleNavigate"),
    bottom.indexOf("const isActive")
  );

ok(
  "abas principais substituem histórico",
  navigationBlock.includes("router.replace(path)") &&
  !navigationBlock.includes("router.push(path)")
);

ok(
  "ações de adicionar continuam empilhando corretamente",
  bottom.includes("router.push(\n          composeOptions[0].path") &&
  bottom.includes("router.push(\n        option.path")
);

ok(
  "cabeçalho não depende de router.back",
  header.includes("getCanonicalBackUrl") &&
  header.includes("router.replace") &&
  !header.includes("router.back(")
);

ok(
  "salvamento possui destino determinístico",
  submit.includes("successUrl?: string") &&
  submit.includes("getCanonicalSubmitUrl") &&
  !submit.includes("router.back(")
);

ok(
  "cirurgia não altera Dexie",
  !mais.includes(".version(40)") &&
  !biometric.includes(".version(40)")
);

console.log(
  "CONTRATOS MAIS/NAVEGAÇÃO V25.2: OK (" +
  checks.length +
  ")"
);
