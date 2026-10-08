import fs from "node:fs";
const page=fs.readFileSync("app/saude/medicamentos/page.tsx","utf8");
const ok=(v,m)=>{if(!v)throw Error("V34/V98: "+m);console.log("OK:",m)};
ok(page.includes('density="compact"'),"densidade compacta preservada");
ok(page.includes("Princípio ativo ·"),"princípio ativo discreto preservado");
ok(page.includes("VAULT_MEDICATION_LIST_HIERARCHY_V98"),"contexto secundário delegado aos detalhes");
ok(!page.includes("{/* CONTEXTO CLÍNICO */}"),"tratamentos não variam a altura da lista");
ok(page.includes("PAINEL OPERACIONAL COMPACTO"),"rotina e estoque continuam operacionais");
console.log("V34/V98 MEDICATION IDENTITY DENSITY: OK");
