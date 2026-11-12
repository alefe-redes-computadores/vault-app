import fs from "node:fs";
const r = (f) => fs.readFileSync(f, "utf8");
const ok = (v,m) => { if (!v) throw new Error(`FALHOU: ${m}`); console.log(`OK: ${m}`); };
const c = r("components/vault-intelligence/ContextualHealthIntelligence.tsx");
ok(c.includes("<VaultBrainIdentity compact context=\"Insight\" />"), "identidade Vault Insight preservada");
ok(c.includes('getInsightsForEntity'), "nome do cérebro");
ok(c.includes("getInsightsForEntity"), "API contextual");
ok(c.includes("HealthInsightSheet"), "explicabilidade");
for (const [f,t] of [
  ["app/saude/medicamentos/detalhes/page.tsx","medicamento"],
  ["app/saude/tratamentos/detalhes/page.tsx","tratamento"],
  ["app/saude/consultas/detalhes/page.tsx","consulta"],
  ["app/saude/exames/detalhes/page.tsx","exame"],
  ["app/saude/retiradas/detalhes/page.tsx","retirada"],
]) {
  const s = r(f);
  ok(s.includes("ContextualHealthIntelligence"), `${t}: superfície`);
  ok(s.includes(`entityType="${t}"`), `${t}: identidade`);
}
ok(r("app/inteligencia/page.tsx").includes(">VAULT Brain</p>") && r("app/inteligencia/page.tsx").includes(">Central do Brain</h1>"), "Central mantém identidade VAULT Brain e o destino contextual");
console.log("VAULT V58 — CONTRATO OK");
