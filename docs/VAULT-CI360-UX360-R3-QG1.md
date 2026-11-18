# VAULT UX360 R3 — Quality Gate 360 QG1 + D3 canonical

## Diagnostic input

V63: 501 listed / 509 executed, **500 pass / 9 fail**. The nine failures were all historical assertions of the new **100px Home cards** versus old 84/72/76px classes, or the catalog **31** versus hardcoded **22**. No failed TypeScript/compile gate was reported in this diagnostic. This is not proof of visual Android acceptance.

## Correction without regression concealment

The original UX360 R2 visual changes are preserved. Eight historical tests now use `vault-qg1-touch-contract.cjs` to inspect the component-specific root button and resolve minimum heights at 320, 360, 393 and 430px, including responsive and `!important` override detection, checking >/=84px minimum, actual click destination and theme policy. A dedicated QG1 contract contains negative fixtures proving 72/76px targets are rejected.

The ninth test verifies all nine added CareFlow routes, 31+ unique catalog entries and preservation of the original 22. No routes or clinical authorities were deleted to fake green gates.

## QG1 initial deliverable

- *Global* — all V63 contracts, extras, tsc and diff --check in isolated clone, never stopped by an individual failure.
- *Intelligent* — actual UI element contract, device-width simulations, connected Hub and canonical D3 checks.
- *Fast* — selective preflight after global diagnostic, identifying regressions in the affected files. No claim of a real-device layout engine; Android verification remains required.
- `QG1-ESTATISTICAS.txt` — top slowest tests, total runtime, category tally and all failures; no suppression or fabricated coverage percentage.
- Public labels remain human-facing; CI360/QG1/R3 identifiers are internal only.

No database migration, no mutation to stock, prescription, dose, report, owners or medical events. All edits guarded; no `git add -A`, `reset --hard`, or force push. If the V63 has moved, the HEAD check stops safely.
