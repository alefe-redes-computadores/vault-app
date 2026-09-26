import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (file) =>
  fs.readFileSync(
    path.join(root, file),
    "utf8"
  );

const ok = (condition, message) => {
  if (!condition) {
    throw new Error(
      `V61: ${message}`
    );
  }

  console.log(
    `OK: ${message}`
  );
};

const memory = read(
  "lib/health-intelligence/insight-memory.ts"
);

const policy = read(
  "lib/health-intelligence/notification-policy.ts"
);

const reconciler = read(
  "components/InsightNotificationReconciler.tsx"
);

// ------------------------------------------------------------
// Memória
// ------------------------------------------------------------

ok(
  memory.includes(
    "VAULT_INSIGHT_MEMORY_V61"
  ),
  "memória comportamental instalada"
);

ok(
  memory.includes(
    "getHealthInsightSemanticKey"
  ),
  "memória usa identidade semântica"
);

ok(
  memory.includes(
    "state_escalated"
  ),
  "memória diferencia escalada"
);

ok(
  memory.includes(
    "cooldown_elapsed"
  ),
  "memória diferencia cooldown vencido"
);

ok(
  memory.includes(
    "cooldown_active"
  ),
  "memória diferencia cooldown ativo"
);

// ------------------------------------------------------------
// Política
// ------------------------------------------------------------

ok(
  policy.includes(
    "rankHealthInsightNotificationCandidates"
  ),
  "política ranqueia múltiplos candidatos"
);

ok(
  policy.includes(
    'insight.categoria === "agenda"'
  ) && policy.includes("return false"),
  "agenda continua fora do push comportamental"
);

// ------------------------------------------------------------
// Reconciliador
// ------------------------------------------------------------

ok(
  reconciler.includes(
    "shouldDeliverHealthInsight"
  ),
  "reconciliador consulta memória antes de notificar"
);

ok(
  reconciler.includes(
    "recordHealthInsightDelivery"
  ),
  "reconciliador grava memória após entrega"
);

ok(
  reconciler.includes(
    "rankHealthInsightNotificationCandidates"
  ),
  "reconciliador usa ranking de candidatos"
);

ok(
  reconciler.includes(
    "eligible.find"
  ),
  "insight em cooldown não bloqueia o próximo candidato"
);

// ------------------------------------------------------------
// Ordem de execução:
// LocalNotifications.schedule deve aparecer antes da CHAMADA
// de recordHealthInsightDelivery.
// ------------------------------------------------------------

const schedulePos =
  reconciler.indexOf(
    "LocalNotifications.schedule"
  );

const importEnd =
  reconciler.indexOf(
    "export function InsightNotificationReconciler"
  );

const executablePart =
  reconciler.slice(
    importEnd >= 0
      ? importEnd
      : 0
  );

const recordCallPosLocal =
  executablePart.indexOf(
    "recordHealthInsightDelivery("
  );

const recordCallPos =
  recordCallPosLocal >= 0
    ? (
        importEnd >= 0
          ? importEnd
          : 0
      ) + recordCallPosLocal
    : -1;

ok(
  schedulePos >= 0 &&
    recordCallPos > schedulePos,
  "memória só é gravada após agendamento aceito"
);

// ------------------------------------------------------------
// Rota contextual
//
// A implementação atual delega isso para
// getHealthInsightNotificationRoute(...).
// O contrato aceita tanto fallback direto quanto helper.
// ------------------------------------------------------------

const helperName =
  "getHealthInsightNotificationRoute";

const sourceFiles = [
  "components/InsightNotificationReconciler.tsx",
  "lib/health-intelligence/notification-policy.ts",
  "lib/health-intelligence/contextual.ts",
  "lib/health-intelligence/notification-route.ts",
  "lib/notifications.ts",
];

let helperSource = "";

for (const file of sourceFiles) {
  const full =
    path.join(root, file);

  if (!fs.existsSync(full)) {
    continue;
  }

  const text =
    fs.readFileSync(
      full,
      "utf8"
    );

  if (
    text.includes(
      helperName
    )
  ) {
    helperSource +=
      `\n${text}`;
  }
}

const hasCentralFallback =
  reconciler.includes(
    '"/inteligencia"'
  ) ||
  (
    reconciler.includes(
      helperName
    ) &&
    helperSource.includes(
      '"/inteligencia"'
    )
  );

ok(
  hasCentralFallback,
  "fallback contextual aponta para Central de Inteligência"
);

console.log(
  "VAULT V61.3 — CONTRATO OK"
);
