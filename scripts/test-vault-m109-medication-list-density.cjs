"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");

const read = (path) => fs.readFileSync(path, "utf8");
const paths = [
  "app/saude/medicamentos/page.tsx",
  "components/saude/MedicationOperationalStrip.tsx",
  "components/saude/ClinicalCollectionGroup.tsx",
  "components/list/ListCard.tsx",
  "hooks/useMedicationRegulatoryProfiles.ts",
  "lib/medication-catalog/snapshot-fingerprint.ts",
  "lib/medication-regulatory-visual.ts",
];

for (const file of paths) {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, `${file} deve ter sintaxe válida`);
}

const page = read(paths[0]);
const strip = read(paths[1]);
const group = read(paths[2]);
const card = read(paths[3]);
const hook = read(paths[4]);
const fingerprint = read(paths[5]);
const regulatory = read(paths[6]);

assert(page.includes('className="min-h-0"'), "cards não devem manter altura mínima artificial");
assert(page.includes('railSize="slim"') && page.includes('writingMode: "vertical-rl"'), "classificação regulatória usa faixa vertical fina");
assert(page.includes('Ver classificação da receita:') && page.includes('medicationRegulatoryShortLabel'), "autoridade regulatória permanece acessível e abreviada");
assert(card.includes('railSize?: "standard" | "slim"') && card.includes('railSize === "slim" ? "w-4"'), "faixa fina é opt-in e não altera outros cards");
assert(regulatory.includes('return "Notif. A"') && regulatory.includes('return "Notif. B"') && regulatory.includes('return "Especial"'), "abreviações regulatórias são determinísticas");
assert(hook.includes('medicationCatalogSnapshotFingerprint(medication)'), "perfil reage à hidratação persistida do catálogo");
assert(fingerprint.includes('activeIngredients: reference.activeIngredients') && fingerprint.includes('regulatoryIdentity: reference.regulatoryIdentity'), "princípio ativo e receita participam da assinatura reativa");
assert(page.includes('MedicationOperationalStrip') && page.includes('aria-label="Ações do medicamento"'), "resumo e ações continuam preservados");
assert(page.includes('title="SOS / conforme necessidade"') && !page.includes('tone="sos" defaultOpen='), "SOS fica recolhido no panorama comum");
assert(strip.includes('flex min-w-0 flex-wrap') && !strip.includes('grid-cols-2'), "estado diário e estoque formam uma linha operacional compacta");
assert(strip.includes('aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}.'), "resumo compacto conserva leitura assistiva completa");
assert(group.includes('pageSize=3'), "grupos longos devem revelar apenas três medicamentos inicialmente");
assert(group.includes('Mostrar mais') && group.includes('Recolher lista'), "paginação visual continua reversível");
assert(read('scripts/test-v63-release-gate.mjs').includes('test-vault-m109-medication-list-density.cjs'), "contrato M109 participa do gate global");

console.log("VAULT M109 R2 — LISTAGEM COMPACTA, FAIXA FINA E CATÁLOGO REATIVO: CONTRATOS OK");
