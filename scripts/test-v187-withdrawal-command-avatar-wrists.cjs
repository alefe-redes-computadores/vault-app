const assert = require("node:assert/strict");
const fs = require("node:fs");

const withdrawals = fs.readFileSync("app/saude/retiradas/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

assert(withdrawals.includes("ClinicalListSummary"), "withdrawal command needs compact operational summary");
assert(withdrawals.includes('status === "hoje"'), "today must be an exact operational filter");
assert(withdrawals.includes('status === "atrasada"'), "overdue review must remain explicit");
assert(withdrawals.includes("grouped.some((month) => previous.has(month.key))"), "first available month must open when current month is absent");
assert(withdrawals.includes("withReturnTarget"), "withdrawal flows need contextual return");
assert(withdrawals.includes('aria-pressed={status === key}'), "filters must expose selected state");
assert(withdrawals.includes("WithdrawalPreparationView"), "document and supply preparation must remain visible");
assert(withdrawals.includes("MedicationFormatIcon"), "medication identity must remain visible");

for (const marker of ["V187: punho facetado", "const wristContour=", "const palmContour=", "const phoneGripPad=", "const phoneSideContact="]) {
  assert(avatar.includes(marker), `V187 avatar wrist/grip missing: ${marker}`);
}
assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V187 — WITHDRAWAL COMMAND + AVATAR WRISTS CONTRACT OK");
