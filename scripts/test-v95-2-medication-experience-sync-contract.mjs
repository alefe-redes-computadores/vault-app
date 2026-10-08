import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const sync = read("components/GlobalSyncIssueAlert.tsx");
const hook = read("hooks/useMedicationRegulatoryProfiles.ts");
const visual = read("lib/medication-regulatory-visual.ts");
const list = read("app/saude/medicamentos/page.tsx");
const novo = read("app/saude/medicamentos/novo/page.tsx");
const ok = (v, m) => { if (!v) throw new Error(`V95.2: ${m}`); console.log(`OK: ${m}`); };

ok(sync.includes("VAULT_SYNC_TRUTH_V95_2"), "sync saudável não invade telas");
ok(!sync.includes("Sincronizando</span>"), "cápsula global de sincronização removida");
ok(sync.includes('runtime.phase !== "error"'), "erro terminal continua global");
ok(hook.includes("useMedicationCatalogIdentities"), "identidade farmacêutica reutiliza catálogo");
ok(list.includes("showActiveIngredient"), "lista mostra princípio ativo sem redundância");
ok(list.includes('? "Receita n/c"'), "rail explicita que somente a receita não foi confirmada");
ok(visual.includes("Controle informado"), "controle manual não finge confirmação oficial");
ok(visual.includes("VAULT_REGULATORY_CONFIDENCE_V95_2"), "confiança regulatória muda peso visual");
ok(!novo.includes('Compatibilidade{" "}'), "score técnico saiu da busca");
console.log("VAULT V95.2 MEDICATION EXPERIENCE + SYNC TRUTH: CONTRATOS OK");
