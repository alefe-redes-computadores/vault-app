const assert=require("node:assert/strict");
const fs=require("node:fs");
const page=fs.readFileSync("app/hoje/page.tsx","utf8");
const groups=fs.readFileSync("components/saude/DoseScheduleGroups.tsx","utf8");

assert(groups.includes("[content-visibility:auto]"));
assert(groups.includes("slots.slice(0,4)"));
assert(groups.includes('aria-label={`Doses das ${slots[0].horario}`}'));
assert(groups.includes("Revisar {pending.length} juntas"));
const sheet=fs.readFileSync('components/ui/BottomSheet.tsx','utf8');
assert(page.includes('import { BottomSheet } from "@/components/ui/BottomSheet"')&&page.includes('<BottomSheet isOpen={isBatchTimeModalOpen'));
assert(sheet.includes('max-h-[90dvh]')&&sheet.includes('overflow-y-auto overscroll-contain')&&sheet.includes('env(safe-area-inset-bottom,0px)'));
assert(!page.includes('safe-area-inset-top'));
assert(/Saldo zerado não confirma que a dose não foi tomada/.test(page));
assert(page.includes("Confirmar que não tomei as selecionadas por falta de estoque"));
assert(page.includes("batchReadyEntries")&&page.includes("stockNonTakeEntries")&&page.includes("requireKnownEmptyStock:true"));
assert(page.includes("batchOperationLock.current"));
assert(page.includes("const entries=[...frozenEntries]")&&page.includes("setBatchFrozen({context:doseIdentityContext,entries})"));

console.log("V175 today dose command + stock review contract: OK");
