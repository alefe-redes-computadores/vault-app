const assert=require("node:assert/strict");
const fs=require("node:fs");
const page=fs.readFileSync("app/hoje/page.tsx","utf8");
const groups=fs.readFileSync("components/saude/DoseScheduleGroups.tsx","utf8");

assert(groups.includes("[content-visibility:auto]"));
assert(groups.includes("slots.slice(0,4)"));
assert(groups.includes('aria-label={`Doses das ${slots[0].horario}`}'));
assert(groups.includes("Revisar {pending.length} juntas"));
assert(page.includes("max-h-[calc(100dvh-env(safe-area-inset-bottom)-8rem)]"));
assert(!page.includes("safe-area-inset-top"));
assert(page.includes("overflow-y-auto overscroll-contain"));
assert(page.includes("Saldo zerado não comprova que a dose deixou de ser tomada"));
assert(page.includes("Confirmar que não tomei por falta de estoque"));
assert(page.includes("dosesComEstoqueNoLote"));
assert(page.includes("batchOperationLock.current"));
assert(page.includes("snapshotLote = [...dosesComEstoqueNoLote]"));

console.log("V175 today dose command + stock review contract: OK");
