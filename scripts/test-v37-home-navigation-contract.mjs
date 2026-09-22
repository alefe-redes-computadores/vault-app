import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const ok = (value, message) => {
  if (!value) throw new Error(message);
};

const nav = read("components/BottomNav.tsx");
const providers = read("components/Providers.tsx");
const home = read("app/page.tsx");
const native = read("scripts/patch-android-edge-to-edge-v28.mjs");

ok( nav.includes("normalizeNavPathname(window.location.pathname)") || nav.includes('window.location.pathname !== "/"'), "Fallback da Home precisa verificar a rota antes de recarregar" );
ok(
  nav.includes('window.location.assign("/")'),
  "Fallback real da raiz ausente"
);
ok(
  nav.includes("if (!shouldShowNav(pathname))"),
  "V31.2 BottomNav regrediu"
);
ok(
  providers.includes('Capacitor.getPlatform() !== "android"'),
  "V30.5 StatusBar regrediu"
);
ok(
  providers.includes('localStorage.getItem(key) === "1"'),
  "V33 seletor de perfil regrediu"
);
ok(
  home.includes('useActivePersonId'),
  "Home perdeu vínculo com pessoa ativa"
);
ok(
  native.includes("VAULT_EDGE_TO_EDGE_V28"),
  "V28 edge-to-edge regrediu"
);

console.log("V37 HOME NAVIGATION CONTRACT: OK");
