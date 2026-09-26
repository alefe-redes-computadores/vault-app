import fs from "node:fs";
const r=p=>fs.readFileSync(p,"utf8");
const ok=(v,m)=>{if(!v)throw new Error(`V60: ${m}`);console.log(`OK: ${m}`)};
const h=r("app/hoje/page.tsx");
const m=r("app/saude/medicamentos/detalhes/page.tsx");
const t=r("app/saude/tratamentos/detalhes/page.tsx");
const c=r("components/vault-intelligence/ContextualHealthIntelligence.tsx");
const z=r("app/inteligencia/page.tsx");

ok(h.includes("useMedicationRegulatoryProfiles")&&h.includes("regulatorySurface.rail"),"Hoje regulatório");
ok(m.includes("useMedicationRegulatoryProfiles")&&m.includes("regulatorySurface.rail"),"Detalhe regulatório");
ok(t.includes("useMedicationRegulatoryProfiles")&&t.includes("getMedicationRegulatorySurface"),"Tratamento regulatório");
ok(c.includes("VAULT_CONTEXTUAL_SURFACE_V60")&&c.includes("VAULT INSIGHT"),"Insight V60");
ok(c.includes('router.push("/inteligencia")'),"Insight abre Central");
ok(z.includes("VAULT INSIGHT"),"Central V60");

console.log("VAULT SUPER V60 R2 — CONTRATO OK");
