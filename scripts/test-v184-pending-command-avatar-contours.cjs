const assert = require("node:assert/strict");
const fs = require("node:fs");

const pending = fs.readFileSync("components/PendingDosesModal.tsx", "utf8");
const avatar = fs.readFileSync("components/saude/HealthAvatar3D.tsx", "utf8");

// The command sheet must summarize and group the routine without changing dose semantics.
assert(pending.includes('aria-label="Resumo das doses pendentes"'));
assert(pending.includes('label: "Pendências anteriores"') && pending.includes('label: "Hoje"'));
assert(pending.includes('className="sticky -top-3'));
assert(pending.includes('aria-live="polite"'));
assert(pending.includes('requireRegisteredStock:true'));
assert(pending.includes('motivo:"sem_estoque"'));
assert(pending.includes('Ficam fora do registro em lote.'));
assert(pending.includes('resolutionLock.current'));

// V184 facial contours add planes/shadows without adding a renderer loop.
for (const marker of ["skinShade", "cheek volume follows the jaw plane", "const temple=", "const cheekbone=", "const lowerLid="]) {
  assert(avatar.includes(marker), `V184 avatar contour missing: ${marker}`);
}
assert(avatar.includes('powerPreference: "low-power"'));
assert(avatar.includes("IntersectionObserver"));
assert(avatar.includes("renderer.forceContextLoss()"));

console.log("VAULT V184 — PENDING COMMAND + AVATAR CONTOURS CONTRACT OK");
