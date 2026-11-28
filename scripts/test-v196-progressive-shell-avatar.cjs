const qg1=require('./vault-qg1-touch-contract.cjs');
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
assert(home.includes("medicationsForOwner(medicamentosTodas, activePersonId, user?.id)") && home.includes("openWithdrawalsDueBy(retiradas, hoje)"));
// V34X: a Home mede a altura real e não reserva 520px antes do primeiro paint.
// O utilitário continua disponível para superfícies que realmente precisam dele.
assert(!home.includes('className="vault-deferred-lg space-y-3"'));

assert(today.includes("new Map<string, any>"));
assert(today.includes("<TodayDoseTimelineCard") && doseCard.includes('scope.medicamentosById.get(item.medicamentoId)'));
assert(!today.includes("medicamentos.find"));
assert(today.includes('className="vault-deferred-lg space-y-2"'));
assert(today.includes("<TodayAppointmentCard"),"Today: extracted appointment card is mounted");
assert(appointmentCard.includes("rounded-[20px] border p-3.5"),"Today: original appointment card radius and padding preserved");
assert(appointmentCard.includes("onClick={onOpen}") && appointmentCard.includes("motion-reduce:transform-none"),"Today: navigable card action and reduced motion preserved");

assert(more.match(/<MoreArea id=/g)?.length >= 5 && read("components/MoreSectionIndex.tsx").includes("<details id="));
assert(command.includes('className="vault-deferred-lg space-y-3"')&&command.includes('<ClinicalDisclosure'));
// M131 R5: o cartão único de 20px foi substituído por dois destinos premium.
// Valida os novos alvos visíveis, o raio, as rotas e a identidade verde da Minha Saúde.
const homeMedClasses=qg1.extractClassAfter(command,'onClick={() => go("/saude/medicamentos")}');
assert(command.includes('grid min-w-0 grid-cols-2 gap-2') &&
  homeMedClasses.includes('min-h-[76px]') &&
  homeMedClasses.includes('rounded-[18px]') &&
  /viva\s*\?\s*"h-auto self-start"\s*:\s*"h-full"/.test(homeMedClasses) &&
  qg1.homePrimaryMinHeightQG1(command,76) &&
  /<HomeClinicalAreaTile\s+label="Minha saúde"\s+description="CareFlow, exames, sinais e dossiê"\s+path="\/saude\/minha-saude"/.test(command) &&
  /tone="border-coral\/20 bg-coral\/\[0\.06\] text-coral"\s+onNavigate=\{go\}/.test(command));


assert(avatar.includes("V196: o mesmo orçamento de meshes"));
assert(avatar.includes("taperedBox(.205,.264,.108,.398)"));
assert(avatar.includes("[.128,.057,.14]"));
assert(!avatar.includes("requestAnimationFrame(animate)"));

// Critical medication semantics remain under their repository-owned paths.
assert(today.includes('await doseLogsRepository.setStatus(')&&today.includes('expected:review.expected')&&today.includes('openIndividualReview(item)'));
assert(today.includes("hasKnownEmptyMedicationStock"));

console.log("VAULT V196 — PROGRESSIVE SHELL + AVATAR CONTRACT OK");
