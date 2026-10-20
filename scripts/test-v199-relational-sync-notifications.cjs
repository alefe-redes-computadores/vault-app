const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function read(file) { return fs.readFileSync(file, "utf8"); }
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (name) => {
    if (name === "@capacitor/local-notifications") return { LocalNotifications: {} };
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
    return require(name);
  };
  mod._compile(ts.transpileModule(read(filename), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return mod.exports;
}

const notifications = load("lib/notification-reconciliation.ts");
const fp = notifications.vaultNotificationFingerprint;
const fingerprint = (value) => ({ vaultReconcileFingerprint: value });
const same = { id: 1, title: "Consulta", body: "A", extra: fingerprint(fp(["a", 1])) };
const changed = { ...same, body: "B", extra: fingerprint(fp(["b", 2])) };
const stale = { id: 2, title: "Antiga", body: "C", extra: fingerprint("stale") };
const fresh = { id: 3, title: "Nova", body: "D", extra: fingerprint("fresh") };
let plan = notifications.planVaultNotificationReconciliation([same, stale], [same, fresh]);
assert.deepEqual(plan.cancelIds, [2]);
assert.deepEqual(plan.schedule.map((item) => item.id), [3]);
assert.equal(plan.kept, 1);
plan = notifications.planVaultNotificationReconciliation([same], [changed]);
assert.deepEqual(plan.cancelIds, [1]);
assert.deepEqual(plan.schedule.map((item) => item.id), [1]);
assert.equal(plan.kept, 0);

const relation = load("lib/health-profile/relation-context.ts");
const hospitalMetadata = relation.buildRelationMetadata("hospital", "u", "p", {
  doctors: [], pharmacies: [], places: [], treatments: [],
  hospitals: [
    { id: "h", user_id: "u", nome: "Hospital Real", endereco: "Rua A", telefone: "123" },
    { id: "foreign", user_id: "x", nome: "Não pode aparecer", endereco: "Segredo" },
  ],
});
assert.equal(hospitalMetadata.h.detail, "Rua A · 123");
assert.equal(hospitalMetadata.foreign, undefined);

const relationPicker = read("components/saude/HealthRelationPicker.tsx");
assert(relationPicker.includes('kind?: "doctor" | "place" | "pharmacy" | "hospital"'));
assert(relationPicker.includes("kind === \"hospital\" ? Building2"));
assert(read("app/saude/retiradas/nova/page.tsx").includes('title="Selecionar hospital" kind="hospital"'));
assert(read("app/saude/retiradas/editar/page.tsx").includes('label === "Hospital" ? "hospital"'));
assert(read("app/saude/fornecimento/page.tsx").includes('key === "hospital_id" ? "hospital"'));

const treatmentOption = read("components/saude/TreatmentRelationOption.tsx");
assert(treatmentOption.includes("treatment.cor"));
assert(treatmentOption.includes("getVaultTreatmentIcon"));
assert(treatmentOption.includes("statusLabel(treatment.status)"));
for (const page of [
  "app/saude/exames/novo/page.tsx", "app/saude/exames/editar/page.tsx",
  "app/saude/consultas/nova/page.tsx", "app/saude/consultas/editar/page.tsx",
  "app/saude/cirurgias/nova/page.tsx", "app/saude/cirurgias/editar/page.tsx",
  "app/saude/registros/novo/page.tsx", "app/saude/registros/editar/page.tsx",
]) assert(read(page).includes("<TreatmentRelationOption"), `${page} sem apresentação relacional canônica`);

const syncStatus = read("components/SyncStatus.tsx");
assert.equal((syncStatus.match(/db\.syncQueue\.toArray\(\)/g) || []).length, 1);
assert(syncStatus.includes("uma única leitura reativa"));
const reminderScheduler = read("lib/health-reminders/scheduler.ts");
const eventScheduler = read("lib/health-reminders/event-scheduler.ts");
for (const scheduler of [reminderScheduler, eventScheduler]) {
  assert(scheduler.includes("reconcileVaultNotificationSet"));
  assert(!scheduler.includes("LocalNotifications.getPending"));
}

const avatar = read("components/saude/HealthAvatar3D.tsx");
assert(avatar.includes("V199: hastes afuniladas"));
assert(avatar.includes("temple.rotation.y=side*.075"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

console.log("VAULT V199 — RELATIONAL FIELDS + DELTA NOTIFICATIONS + SYNC PERFORMANCE CONTRACT OK");
