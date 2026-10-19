const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");

const ui=fs.readFileSync("app/saude/lembretes/page.tsx","utf8");
const scene=fs.readFileSync("components/saude/HealthAvatar3D.tsx","utf8");
const source=fs.readFileSync("lib/health-reminders/domain.ts","utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleBox={exports:{}};new Function("require","module","exports",js)(require,moduleBox,moduleBox.exports);
const {nextHealthReminderOccurrence}=moduleBox.exports;

const base=new Date(2026,9,19,9,0,0);
const daily={status:"active",time:"10:00",frequency:"daily",weekdays:[]};
assert.equal(nextHealthReminderOccurrence(daily,base).getTime(),new Date(2026,9,19,10,0,0).getTime());
assert.equal(nextHealthReminderOccurrence({...daily,time:"08:00"},base).getTime(),new Date(2026,9,20,8,0,0).getTime());
assert.equal(nextHealthReminderOccurrence({...daily,status:"paused"},base),null);
assert.equal(nextHealthReminderOccurrence({...daily,frequency:"weekly",weekdays:[2]},base).getDay(),2);

assert(ui.includes("Próximo lembrete")&&ui.includes("nextHealthReminderOccurrence"));
assert(ui.includes("preserveReturn(reminder.target_route)"));
assert(ui.includes('document.addEventListener("visibilitychange",refresh)'));
assert(ui.includes("presentation.paused")&&ui.includes("showPaused"));
assert(ui.includes("ConfirmationModal")&&!ui.includes("window.confirm"));
assert(ui.includes("Os registros de saúde existentes não serão alterados"));
assert(scene.includes("iris: new THREE.MeshStandardMaterial"));
assert(scene.includes("Olhos em três planos"));
assert(scene.includes("[.042,.019,.014]")&&scene.includes("[.007,.009,.004]"));
assert(scene.includes("renderer.forceContextLoss()"));

console.log("VAULT V182 — HEALTH ROUTINE + AVATAR FACE CONTRACT OK");
