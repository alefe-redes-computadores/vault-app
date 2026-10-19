const assert = require("node:assert/strict");
const fs = require("node:fs");

const timeline = fs.readFileSync("app/saude/timeline/page.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

assert(timeline.includes("VAULT_CLINICAL_TIMELINE_V188"));
assert(timeline.includes("ClinicalListSummary"), "timeline needs compact summary");
assert(timeline.includes("content-visibility:auto"), "long timeline needs deferred rendering");
assert(timeline.includes("withReturnTarget"), "event details need contextual return");
assert(timeline.includes("normalize(\`${event.label}"), "accent-insensitive multi-field search must remain");
assert(timeline.includes("civilTime(getLocalTodayISO())"), "period must use the local civil day");
assert(timeline.includes('period === 3650'), "all history must remain unbounded");
assert(timeline.includes('"Todo histórico"'));
assert(timeline.includes("TYPE_META"), "event categories need distinct visual identity");
assert(timeline.includes('aria-pressed={type === filter.value}'));

for (const marker of ["V188: the shoulder girdle", "const clavicleBridge=", "const shoulderCap=", "const deltoidSeam=", "const scapulaPlane="]) {
  assert(avatar.includes(marker), `V188 avatar shoulder missing: ${marker}`);
}
assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V188 — CLINICAL TIMELINE + AVATAR SHOULDERS CONTRACT OK");
