import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const safety = read("lib/health-intelligence/medication-safety.ts");
const queue = read("lib/sync/queue-health.ts");
const hook = read("hooks/useSyncQueue.ts");
const diagnostic = read("app/diagnostico/page.tsx");
const input = read("components/ui/Input.tsx");
const button = read("components/ui/Button.tsx");
const sheet = read("components/ui/BottomSheet.tsx");
const css = read("app/globals.css");

const checks = [
  ["V19 reconhece classes sem adivinhar qualquer medicamento", safety.includes("const PROFILES") && safety.includes('substance: "lisdexanfetamina"')],
  ["V19 cruza somente tomadas registradas", safety.includes("recent(medicationLogs")],
  ["V19 compara tomadas com horários configurados", safety.includes("estoque_horarios") && safety.includes("tomadas acima da rotina registrada")],
  ["V19 separa triagem de diagnóstico", safety.includes("triagem, não um diagnóstico")],
  ["V19 relaciona somente tratamentos ativos explícitos", safety.includes('treatment.status === "ativo"') && safety.includes("medicamento_ids?.includes")],
  ["V19 possui fonte regulatória auditável", safety.includes("OFFICIAL_METHADONE_LABEL") && safety.includes("OFFICIAL_LISDEXAMFETAMINE_LABEL")],
  ["V19 reserva gravidade crítica para sinais combinados", safety.includes("isCriticalTriage") && safety.includes("closeRepeat")],
  ["V19 não prescreve mudança de dose", safety.includes("não tome dose adicional") || safety.includes("Não tome dose adicional")],
  ["V20 centraliza estados da fila", queue.includes("getSyncQueueState") && queue.includes("SYNC_MAX_RETRIES")],
  ["V20 respeita próxima tentativa", queue.includes('return "deferred"') && hook.includes('getSyncQueueState(item) === "ready"')],
  ["V20 agenda retomada quando só há itens adiados", hook.includes("deferredItems") && hook.includes("nextWakeAt")],
  ["V20 trata cinco tentativas como falha", queue.includes("retries >= SYNC_MAX_RETRIES")],
  ["V20 reset limpa erro e agendamento", queue.includes("next_retry_at: null") && queue.includes("error: null")],
  ["V20 diagnóstico usa a mesma regra", diagnostic.includes("summarizeSyncQueue") && diagnostic.includes("getSyncQueueState")],
  ["V21 input liga label e erro acessível", input.includes("htmlFor={inputId}") && input.includes("aria-invalid")],
  ["V21 botões possuem alvo mínimo e loading explicável", button.includes("min-h-11") && button.includes("loadingLabel")],
  ["V21 sheet fecha pelo fundo e respeita safe area", sheet.includes("event.target ===") && sheet.includes("safe-area-inset-bottom")],
  ["V21 respeita redução de movimento", css.includes("prefers-reduced-motion")],
  ["sem Dexie novo ou persistência clínica", !safety.includes("db.version(") && !queue.includes("db.version(")],
];

console.log("== CONTRATOS VAULT V19–V21 ==");
let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "OK" : "FALHA"}: ${label}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);
console.log(`CONTRATOS VAULT V19–V21: OK (${checks.length})`);
