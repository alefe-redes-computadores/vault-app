import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(
    path,
    "utf8"
  );

const ok = (
  condition,
  message
) => {
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

ok(
  memory.includes(
    "getHealthInsightSemanticKey"
  ) &&
    memory.includes(
      "shouldDeliverHealthInsight"
    ) &&
    memory.includes(
      "recordHealthInsightDelivery"
    ),
  "memória comportamental instalada"
);

ok(
  memory.includes(
    "state_escalated"
  ) &&
    memory.includes(
      "cooldown"
    ),
  "memória diferencia escalada e cooldown"
);

ok(
  policy.includes(
    "rankHealthInsightNotificationCandidates"
  ),
  "política ranqueia múltiplos candidatos"
);

ok(
  policy.includes(
    'insight.categoria === "agenda"'
  ),
  "agenda fica fora do push comportamental"
);

ok(
  policy.includes(
    "gravidadeSeguranca"
  ) &&
    policy.includes(
      "urgencia"
    ) &&
    policy.includes(
      "confianca"
    ) &&
    policy.includes(
      "amostra"
    ),
  "ranking considera gravidade, urgência, confiança e amostra"
);

ok(
  reconciler.includes(
    "rankHealthInsightNotificationCandidates"
  ),
  "reconciliador usa ranking V61"
);

ok(
  reconciler.includes(
    "shouldDeliverHealthInsight"
  ),
  "reconciliador consulta memória antes do push"
);

ok(
  reconciler.includes(
    "recordHealthInsightDelivery"
  ),
  "reconciliador registra entrega"
);

/*
 * A checagem anterior estava pegando a
 * ocorrência do nome da função no import,
 * por isso dizia falsamente que o record
 * vinha antes do schedule.
 *
 * Agora procuramos as CHAMADAS reais.
 */
const scheduleCall =
  reconciler.lastIndexOf(
    "await LocalNotifications.schedule"
  );

const recordCall =
  reconciler.lastIndexOf(
    "recordHealthInsightDelivery("
  );

ok(
  scheduleCall >= 0,
  "agendamento nativo existe"
);

ok(
  recordCall >= 0,
  "registro de memória existe"
);

ok(
  recordCall >
    scheduleCall,
  "memória só é gravada após agendamento aceito"
);

ok(
  policy.includes("getHealthInsightNotificationRoute") &&
    policy.includes('return "/inteligencia"'),
  "fallback contextual aponta para Central de Inteligência"
);

console.log(
  "VAULT V61.2 BRAIN MEMORY — CONTRATO OK"
);
