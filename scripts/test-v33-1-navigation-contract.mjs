import fs from "node:fs";

const read = (f) => fs.readFileSync(f, "utf8");
const ok = (v, m) => { if (!v) throw new Error(m); };

const canonical = [
  ["app/senhas/detalhes/page.tsx", 'router.replace("/senhas");'],
  ["app/senhas/novo/page.tsx", 'router.replace("/senhas");'],
  ["app/cartoes/detalhes/page.tsx", 'router.replace("/cartoes");'],
  ["app/cartoes/novo/page.tsx", 'router.replace("/cartoes");'],
  ["app/contas/detalhes/page.tsx", 'router.replace("/contas");'],
  ["app/contas/novo/page.tsx", 'router.replace("/contas");'],
  ["app/vaults/detalhes/page.tsx", 'router.replace("/vaults");'],
  ["app/vaults/novo/page.tsx", 'router.replace("/vaults");'],
];

for (const [file, marker] of canonical) {
  ok(read(file).includes(marker), `${file}: retorno canônico ausente`);
}

const bottom = read("components/BottomNav.tsx");
ok(bottom.includes("router.replace(path);"), "BottomNav: tabs devem usar replace");
ok(bottom.includes("router.push("), "BottomNav: drill-down/compose deve continuar push");
ok(bottom.includes("if (!shouldShowNav(pathname))"), "BottomNav V31.2 regrediu");

const providers = read("components/Providers.tsx");
ok(providers.includes('Capacitor.getPlatform() !== "android"'), "V30.5 StatusBar regrediu");
ok(providers.includes('localStorage.getItem(key) === "1"'), "V33 perfil persistente regrediu");

const pending = read("components/PendingDosesModal.tsx");
ok(pending.includes("const handleResolveAll ="), "V33 doses em lote regrediu");

const bio = read("components/BiometricLock.tsx");
ok(bio.includes("removeListener: (() => void) | undefined"), "V32.1 biometria regrediu");

console.log("V33.1 NAVIGATION CONTRACT: OK");
