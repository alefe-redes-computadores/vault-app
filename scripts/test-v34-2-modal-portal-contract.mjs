import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const assert = (ok, msg) => {
  if (!ok) {
    console.error("V34.2 FAIL:", msg);
    process.exit(1);
  }
};

const quick = read("components/saude/QuickDoseModal.tsx");
const sheet = read("components/ui/BottomSheet.tsx");
const nav = read("components/BottomNav.tsx");
const css = read("app/globals.css");

for (const [name, src] of [["QuickDose", quick], ["BottomSheet", sheet]]) {
  assert(src.includes('from "react-dom"'), `${name}: react-dom ausente`);
  assert(src.includes("createPortal("), `${name}: createPortal ausente`);
  assert(src.includes("document.body"), `${name}: portal não aponta para body`);
  assert(src.includes("portalReady"), `${name}: proteção SSR/hidratação ausente`);
  assert(src.includes("vault-modal-layer"), `${name}: camada modal ausente`);
}

assert(
  quick.includes('role="dialog"') &&
  quick.includes('aria-modal="true"'),
  "QuickDose não participa do contrato semântico de diálogo"
);

assert(
  sheet.includes('role="dialog"') &&
  sheet.includes('aria-modal="true"'),
  "BottomSheet perdeu semântica de diálogo"
);

assert(nav.includes("vault-bottom-nav"), "BottomNav perdeu marcador");
assert(
  nav.includes("if (!shouldShowNav(pathname))"),
  "regressão V31.2: rota deve continuar sendo dona da montagem"
);
assert(
  css.includes('body:has([role="dialog"][aria-modal="true"]) .vault-bottom-nav'),
  "regra global de despriorização da BottomNav ausente"
);
assert(
  css.includes("pointer-events: none"),
  "BottomNav ainda pode capturar toque sob modal"
);

console.log("V34.2 MODAL PORTAL CONTRACT: OK");
