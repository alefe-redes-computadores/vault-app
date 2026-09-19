import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const ok = (v, m) => {
  if (!v) throw new Error(`V34 CONTRACT FAIL: ${m}`);
};

const quick = read("components/saude/QuickDoseModal.tsx");
const sheet = read("components/ui/BottomSheet.tsx");
const nav = read("components/BottomNav.tsx");

// Contrato estrutural atual: V34 safe-area + V34.1 layer + V34.2 portal.
// Não comparar strings antigas de z-index.
ok(
  /vault-modal-layer[\s\S]{0,180}z-\[100\]/.test(quick),
  "QuickDose perdeu camada z-[100]"
);
ok(
  quick.includes("createPortal(") && quick.includes("document.body"),
  "QuickDose não escapa do stacking context via portal"
);
ok(
  quick.includes("safe-area-inset-bottom"),
  "QuickDose perdeu reserva inferior de safe-area"
);
ok(
  quick.includes("overflow-y-auto") && quick.includes("overscroll-contain"),
  "QuickDose perdeu rolagem interna"
);

ok(
  /vault-modal-layer[\s\S]{0,180}z-\[100\]/.test(sheet),
  "BottomSheet perdeu camada z-[100]"
);
ok(
  sheet.includes("createPortal(") && sheet.includes("document.body"),
  "BottomSheet não escapa do stacking context via portal"
);
ok(
  sheet.includes("safe-area-inset-bottom"),
  "BottomSheet perdeu reserva inferior de safe-area"
);
ok(
  sheet.includes("overflow-y-auto") && sheet.includes("overscroll-contain"),
  "BottomSheet perdeu rolagem interna"
);

ok(nav.includes("z-50"), "BottomNav perdeu sua camada base");
ok(
  /if\s*\(\s*!shouldShowNav\s*\(\s*pathname\s*\)\s*\)\s*\{\s*return null;\s*\}/s.test(nav),
  "V31.2 mount por rota regrediu"
);

console.log("V34 MODAL VIEWPORT CONTRACT: OK");
