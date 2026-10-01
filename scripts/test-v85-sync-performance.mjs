import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ok = (value, message) => { if (!value) throw new Error(`V85: ${message}`); };

const providers = read("components/Providers.tsx");
const realtime = read("hooks/useSupabaseRealtime.ts");
const coordinator = read("lib/sync/coordinator.ts");
const feedback = read("components/GlobalSyncIssueAlert.tsx");

ok(providers.includes("runVaultPullSingleFlight"), "pull global não está deduplicado");
ok(providers.includes("useSupabaseRealtime(user?.id)"), "Realtime não reutiliza a identidade do AuthProvider");
ok(!realtime.includes("auth.getUser"), "Realtime ainda faz validação remota duplicada");
ok(!realtime.includes("onAuthStateChange"), "Realtime ainda instala listener de autenticação duplicado");
ok(coordinator.includes("activePulls"), "coordenador single-flight ausente");
ok(coordinator.includes("yieldToFirstPaint"), "primeiro paint não foi priorizado");
ok(feedback.includes("ACTIVITY_DELAY_MS = 700"), "feedback não respeita janela silenciosa");
ok(feedback.includes("animate-ping"), "indicador pulsante ausente");
ok(feedback.includes('router.push("/diagnostico")'), "falha não leva ao diagnóstico");

console.log("V85 SYNC PERFORMANCE — CONTRATO OK");
