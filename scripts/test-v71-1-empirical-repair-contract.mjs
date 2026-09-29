import fs from "node:fs";

const r = (p) => fs.readFileSync(p, "utf8");

function ok(value, message) {
  if (!value) {
    throw new Error(`V71.1: ${message}`);
  }

  console.log("OK:", message);
}

const med = r(
  "app/saude/medicamentos/detalhes/page.tsx"
);

const doctor = r(
  "app/saude/medicos/detalhes/page.tsx"
);

const network = r(
  "app/saude/rede/page.tsx"
);

const withdrawal = r(
  "app/saude/retiradas/detalhes/page.tsx"
);

const bottom = r(
  "components/BottomNav.tsx"
);

ok(
  med.includes("VAULT_SAFE_BACK_V71_1") &&
    med.includes("/saude/medicamentos"),
  "Medicamento possui back com fallback"
);

ok(
  !doctor.includes("/saude/cid/detalhes") &&
    doctor.includes("/saude/cids/detalhes"),
  "Médico -> CID usa rota existente"
);

ok(
  network.includes("<ListSearch"),
  "Rede usa busca compartilhada compacta"
);

ok(
  withdrawal.includes("MedicationFormatIcon") &&
    withdrawal.includes("medicamento?.formato") &&
    withdrawal.includes("medicamento?.cores"),
  "Retirada herda identidade do medicamento"
);

ok(
  bottom.includes(
    "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
  ),
  "BottomNav preserva safe-area V31"
);

console.log(
  "VAULT V71.1 — EMPIRICAL REPAIR CONTRACT: OK"
);
