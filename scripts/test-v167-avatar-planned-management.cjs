const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const today = read("app/hoje/page.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

assert.match(today, /handleCancelPlannedDose/);
assert.match(today, /await removerDosePorId\(item\.logId\)/);
assert.match(today, /O estoque não será alterado/);
assert.match(today, /Agendamento cancelado\. O estoque não foi alterado/);
assert.match(today, /item\.doseKind === "planned"/);
assert.match(today, /Cancelar agendamento/);
assert.match(today, /!item\.ignorada &&\s+isHoje &&/);

assert.match(avatar, /V167: face planes/);
assert.match(avatar, /fingerIndex<4/);
assert.match(avatar, /const toe=oval/);
assert.ok(/\.52:\.49/.test(avatar) || /\.47:\.44/.test(avatar) || /\.43:\.40/.test(avatar) || /\.32:\.30/.test(avatar), "aba frontal preservada com proporção versionada");
assert.match(avatar, /const underBrim=mesh/);
assert.match(avatar, /powerPreference: "low-power"/);
assert.match(avatar, /IntersectionObserver/);
assert.match(avatar, /renderer\.forceContextLoss\(\)/);

console.log("V167 avatar + planned dose management contract: OK");
