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

// V299 R2: nome e dosagem ocupam a largura inteira; ações são botões
// independentes abaixo da identidade, mantendo seus destinos e a dose rápida.
const identityStart = medicine.indexOf("VAULT_V318_COMPACT_IDENTITY");
const identityEnd = medicine.indexOf("VAULT_MEDICATION_LIST_HIERARCHY_V98", identityStart);
assert(identityStart > 0 && identityEnd > identityStart, "hierarquia do card presente");
const identity = medicine.slice(identityStart, identityEnd);
assert.match(identity, /flex min-w-0 flex-col gap-1/, "cabeçalho vertical preserva largura do nome");
assert.match(identity, /line-clamp-2 break-words font-display/, "nome não truncado");
assert.doesNotMatch(identity, /grid-cols-\[minmax\(0,1fr\)_auto\]/, "coluna rígida não pode retornar");
assert.match(identity, /mt-1 flex min-w-0 flex-wrap items-center gap-1\.5/, "ações com faixa separada");
assert.match(identity, /careAction && \(\s*[\s\S]*?<button[\s\S]*?router\.push\(\s*careAction\.href/, "pendência navega para seu destino");
assert.match(identity, /canQuickDose &&[\s\S]*?quickDoseLabel[\s\S]*?<button[\s\S]*?setQuickDoseMedId\(/, "registro rápido continua independente");

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
