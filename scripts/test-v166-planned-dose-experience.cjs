const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const scheduled = read("lib/dose-notifications.ts");
const overdue = read("lib/overdue-dose-notifications.ts");
const actions = read("hooks/useDoseNotificationActions.ts");
const pending = read("components/PendingDosesModal.tsx");

assert.match(scheduled, /log\.dose_kind !== "planned"/);
assert.match(scheduled, /first\.planned \? \{type:"dose_planned"\} : \{\}/);
assert.match(scheduled, /confirme somente depois de tomar/);
assert.match(scheduled, /extra\?\.type==="dose_planned"/);
assert.match(overdue, /log\.dose_kind!=="planned"/);
assert.match(actions, /extra\.type !== "dose_planned"/);
assert.match(actions, /extra\.type === "dose_planned"/);

assert.match(pending, /Estoque cadastrado zerado/);
assert.match(pending, /Não tomei: medicamento em falta/);
assert.match(pending, /Registra o motivo sem alterar o estoque/);
assert.match(pending, /env\(safe-area-inset-top\)/);
assert.doesNotMatch(pending, /O estoque cadastrado está zerado\. O que aconteceu com esta dose\?/);

console.log("V166 planned dose + pending review contract: OK");
