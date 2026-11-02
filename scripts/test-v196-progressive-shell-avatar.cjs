const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const globals = read("app/globals.css");
const home = read("app/page.tsx");
const today = read("app/hoje/page.tsx");
const doseCard = read("components/hoje/TodayDoseTimelineCard.tsx");
const appointmentCard = read("components/hoje/TodayAppointmentCard.tsx");
const more = read("app/mais/page.tsx");
const command = read("components/home/HomeCommandCenter.tsx");
const avatar = read("components/saude/HealthAvatar3D.tsx");

assert(globals.includes(".vault-deferred"));
assert(globals.includes("content-visibility: auto"));
assert(globals.includes("contain-intrinsic-size: auto 520px"));

assert(home.includes("min-[380px]:grid-cols-4"));
assert(home.includes("const medicamentosById"));
assert(home.includes("medicamentosById.get(retirada.medicamento_id)"));
assert(home.includes('className="vault-deferred-lg space-y-3"'));

assert(today.includes("new Map<string, any>"));
assert(today.includes("<TodayDoseTimelineCard") && doseCard.includes("? medicamentosById.get(item.medicamentoId)"));
assert(!today.includes("medicamentos.find"));
assert(today.includes('className="vault-deferred-lg space-y-2"'));
assert(today.includes("<TodayAppointmentCard"),"Today: extracted appointment card is mounted");
assert(appointmentCard.includes("rounded-[20px] border p-3.5"),"Today: original appointment card radius and padding preserved");
assert(appointmentCard.includes("onClick={onOpen}") && appointmentCard.includes("motion-reduce:transform-none"),"Today: navigable card action and reduced motion preserved");

assert(more.match(/className="vault-deferred/g)?.length >= 5);
assert(command.includes('className="vault-deferred-lg space-y-3"')&&command.includes('<ClinicalDisclosure'));
assert(command.includes("rounded-[20px]"));

assert(avatar.includes("V196: o mesmo orçamento de meshes"));
assert(avatar.includes("taperedBox(.205,.264,.108,.398)"));
assert(avatar.includes("[.128,.057,.14]"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

// Critical medication semantics remain under their repository-owned paths.
assert(today.includes("await marcarDose("));
assert(today.includes("hasKnownEmptyMedicationStock"));

console.log("VAULT V196 — PROGRESSIVE SHELL + AVATAR CONTRACT OK");
