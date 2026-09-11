// scripts/test-hoje-v6-contract.js
"use strict";
const fs=require("fs");const s=fs.readFileSync("app/hoje/page.tsx","utf8");
function ok(v,m){if(!v)throw new Error("Falhou: "+m);console.log("OK: "+m)}
ok(s.includes('med.tipo_uso === "esporadico"'),"esporádicos não geram slots");
ok(s.includes('med.tipo_uso !== "continuo"'),"alerta sem horário é exclusivo de contínuos");
ok(!s.includes('<header className="sticky top-0 z-20'),"cabeçalho alto não permanece fixo");
ok(s.includes('SOS e doses futuras ficam de fora'),"proteção do Tomar todos preservada");
console.log("HOJE V6 CONTRACT: OK");
