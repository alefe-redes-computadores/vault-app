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
assert(today.includes("<TodayDoseTimelineCard") && doseCard.includes('scope.medicamentosById.get(item.medicamentoId)'));
assert(!today.includes("medicamentos.find"));
assert(today.includes('className="vault-deferred-lg space-y-2"'));
assert(today.includes("<TodayAppointmentCard"),"Today: extracted appointment card is mounted");
assert(appointmentCard.includes("rounded-[20px] border p-3.5"),"Today: original appointment card radius and padding preserved");
assert(appointmentCard.includes("onClick={onOpen}") && appointmentCard.includes("motion-reduce:transform-none"),"Today: navigable card action and reduced motion preserved");

assert(more.match(/className="vault-deferred/g)?.length >= 5);
assert(command.includes('className="vault-deferred-lg space-y-3"')&&command.includes('<ClinicalDisclosure'));
// M131 R5: o cartão único de 20px foi substituído por dois destinos premium.
// Valida os novos alvos visíveis, o raio, as rotas e a identidade verde da Minha Saúde.
assert(command.includes('grid min-w-0 grid-cols-2 gap-2') &&
  /<button[^>]*onClick=\{\(\) => go\("\/saude\/medicamentos"\)\}[^>]*className="[^"]*min-h-\[84px\][^"]*rounded-\[18px\]/.test(command) &&
  command.includes('<HomeClinicalAreaTile label="Minha saúde" description="Perfil, sono e medidas" path="/saude/minha-saude"') &&
  command.includes('tone="border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400" onNavigate={go}'));


assert(avatar.includes("V196: o mesmo orçamento de meshes"));
assert(avatar.includes("taperedBox(.205,.264,.108,.398)"));
assert(avatar.includes("[.128,.057,.14]"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

// Critical medication semantics remain under their repository-owned paths.
assert(today.includes("await marcarDose("));
assert(today.includes("hasKnownEmptyMedicationStock"));

console.log("VAULT V196 — PROGRESSIVE SHELL + AVATAR CONTRACT OK");
