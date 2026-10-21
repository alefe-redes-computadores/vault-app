const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = path => fs.readFileSync(path, "utf8");
const health = read("app/saude/minha-saude/page.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");
const shell = read("components/saude/HealthAvatar.tsx");
const medicine = read("app/saude/medicamentos/page.tsx");
const quickDose = read("components/saude/QuickDoseModal.tsx");
const repository = read("lib/repositories/doseLogs.ts");
const today = read("app/hoje/page.tsx");
const central = read("components/vault-intelligence/BrainV5DetailSheet.tsx");
const arrivals = read("lib/health-profile/new-data-summary.ts");

// Um toque no peito abre contexto local; só a segunda ação navega.
assert.match(health, /onBrainSelect=.*setSelectedInsight/s);
assert.match(health, /onOpenCentral=.*goFromHealth/s);
assert.doesNotMatch(health, /onBrainSelect=\{\(\)\s*=>\s*router\.push/);
assert.match(avatar, /intersectObject\(model,true\)\.map\([\s\S]*\.find\(data=>data\?\.action\)/);

// Safe area e cena premium permanecem contratos do Avatar expandido.
assert.match(shell, /safe-area-inset-top/);
assert.match(avatar, /taperedBox/);
assert.match(avatar, /capBrim|brim/);
assert.match(avatar, /phone|telefone/i);

// Receita e ação possuem coluna própria: a ação não volta à faixa flexível.
assert.match(medicine, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
assert.match(medicine, /min-w-\[6\.75rem\][\s\S]*accessAction[\s\S]*quickDoseLabel/);

// Uma dose futura é pendência, não tomada: não movimenta estoque ao agendar.
assert.match(quickDose, /willScheduleAdHoc/);
assert.match(quickDose, /agendarDoseAvulsa/);
assert.match(quickDose, /Nenhuma unidade será retirada do estoque/);
const scheduleMethod = repository.slice(repository.indexOf("async agendarDoseAvulsa"), repository.indexOf("async registrarTomadaAvulsa"));
assert.match(scheduleMethod, /dose_kind:\s*"planned"/);
assert.doesNotMatch(scheduleMethod, /applyStockDelta/);
assert.match(today, /doseKind === "planned"/);

// Chegadas usam identidade estável e só fontes locais de integração permitidas.
assert.match(arrivals, /source_record_id/);
assert.match(arrivals, /health_connect/);
assert.match(arrivals, /samsung_manual/);
assert.match(arrivals, /36/);

// Detalhe do Brain preserva evidência, segurança, fonte e explicabilidade.
for (const label of ["Evidências", "Limitações e segurança", "Fontes regulatórias", "não representam novas ocorrências clínicas"]) {
  assert(central.includes(label), `hierarquia ausente: ${label}`);
}

console.log("V165 contextual health, medication layout and scheduling contracts: OK");
