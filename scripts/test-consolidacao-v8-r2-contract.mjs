import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const checks = [];
const ok = (label, value) => { if (!value) throw new Error(`FALHOU: ${label}`); checks.push(label); };

const today = read("app/hoje/page.tsx");
const home = read("app/page.tsx");
const more = read("app/mais/page.tsx");
const intelligence = read("app/inteligencia/page.tsx");
const engine = read("lib/vault-intelligence/engine.ts");
const repo = read("lib/repositories/vaultIntelligence.ts");

ok("Hoje consulta lembretes da pessoa ativa", today.includes("useHealthReminders") && today.includes("remindersDoDia"));
ok("frequência do lembrete é respeitada", today.includes("reminderRunsOnWeekday"));
ok("lembrete não é chamado de adesão", today.includes("não mede adesão"));
ok("lembrete abre destino canônico", today.includes("router.push(reminder.target_route)"));
ok("versículo saiu da Home", !home.includes("<VersiculoDia"));
ok("versículo encerra a Hoje", today.includes("<VersiculoDia"));
ok("retiradas possuem rota visível", home.includes('path:\n        "/saude/retiradas"'));
ok("inteligência geral fica no Mais", more.includes('router.push("/inteligencia")'));
ok("inteligência possui página explicável", intelligence.includes("VaultInsightSheet") && intelligence.includes("evidências"));
ok("motor não descriptografa segredos", !engine.includes("decryptPassword") && !repo.includes("decryptPassword"));
ok("escopo usa pessoa e usuário", repo.includes("personId") && repo.includes("userId"));
ok("postura não promete segurança absoluta", intelligence.includes("não afirma segurança absoluta"));

for (const label of checks) console.log(`OK: ${label}`);
console.log(`CONTRATOS CONSOLIDAÇÃO V8-R2: OK (${checks.length})`);
