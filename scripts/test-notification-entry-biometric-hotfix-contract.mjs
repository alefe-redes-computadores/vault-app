import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const ok=(v,m)=>{ if(!v) throw new Error(`HOTFIX NOTIFICAÇÃO: ${m}`); console.log(`OK: ${m}`); };

const bio=read("components/BiometricLock.tsx");
const providers=read("components/Providers.tsx");
const health=read("components/HealthReminderReconciler.tsx");
const policy=read("lib/health-intelligence/notification-policy.ts");
const central=read("app/inteligencia/page.tsx");
const nav=read("lib/notification-navigation.ts");
const gate=read("scripts/test-v63-release-gate.mjs");

ok(bio.includes("authenticationInFlightRef"),"biometria possui trava de autenticação concorrente");
ok(bio.includes("if (authenticationInFlightRef.current) return;"),"segundo prompt é bloqueado enquanto o primeiro está ativo");
ok(bio.includes("VAULT_NOTIFICATION_BIOMETRIC_ENTRY_HOTFIX"),"lifecycle reconhece retorno da UI biométrica");
ok(nav.includes("VAULT_NOTIFICATION_UNLOCK_GATE_V1"),"deep-link possui gate de unlock");
ok(nav.includes('"biometric:lockchange"'),"destino aguarda desbloqueio real");
ok(providers.includes("runAfterVaultBiometricUnlock"),"dose/documento/renovação usam gate de unlock");
ok(health.includes("type?: string;"),"payload agrupado possui contrato TypeScript");
ok(health.includes("runAfterVaultBiometricUnlock"),"agenda/insight/grupo usam gate de unlock");
ok(health.includes("/inteligencia?healthInsight="),"listener abre insight exato inclusive para notificações antigas com insightId");
ok(policy.includes("VAULT_INSIGHT_EXACT_ENTRY_V1"),"policy de insight usa entrada exata");
ok(policy.includes("encodeURIComponent(insightId)"),"id do insight é codificado no deep-link");
ok(central.includes('get("healthInsight")'),"Central lê deep-link do insight");
ok(central.includes("health.insights.find"),"Central resolve o insight no cérebro atual");
ok(central.includes("setSelectedHealth(match)"),"Central abre HealthInsightSheet");
ok(gate.includes("test-pre-apk-grouped-dose-notifications.mjs"),"contrato de doses agrupadas entrou no release gate");
ok(gate.includes("test-notification-entry-biometric-hotfix-contract.mjs"),"hotfix entrou no release gate");

console.log("VAULT NOTIFICATION ENTRY + BIOMETRIC HOTFIX CONTRACT: OK");
