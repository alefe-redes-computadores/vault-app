const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const today = read("app/hoje/page.tsx");
const card = read("components/hoje/TodayDoseTimelineCard.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

assert.match(today, /handleCancelPlannedDose/);
assert.match(today, /await doseLogsRepository\.removeById\(\{personId:expected\.person_id,id:expected\.id,expected,adjustStock:target\.action!=='cancel'\}\)/);
assert.match(today, /Cancelar este agendamento sem alterar o estoque/);
assert.match(today, /expected\.dose_kind!=='planned'\|\|expected\.tomado_em\|\|expected\.ignorado_em/);
assert.match(today, /Correção registrada neste aparelho\. Aguardando sincronização\./);
assert.match(today, /<TodayDoseTimelineCard/);
assert.match(card, /item\.doseKind === "planned"/);
assert.match(card, /Cancelar agendamento/);
assert.match(card, /handleCancelPlannedDose\(item\)/);
assert.match(card, /!item\.ignorada &&\s+isHoje &&/);

assert.match(avatar, /V167: face planes/);
assert.match(avatar, /fingerIndex<4/);
assert.match(avatar, /const toe=oval/);
assert.ok(/\.292:\.278/.test(avatar) && /\.258:\.246/.test(avatar), "aba frontal preservada com proporção versionada e contida");
assert.match(avatar, /const underBrim=mesh/);
assert.match(avatar, /powerPreference: "low-power"/);
assert.match(avatar, /IntersectionObserver/);
assert.match(avatar, /renderer\.forceContextLoss\(\)/);

console.log("V167 avatar + planned dose management contract: OK");
