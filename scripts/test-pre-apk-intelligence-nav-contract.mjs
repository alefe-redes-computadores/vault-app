import fs from "node:fs";

const read = p =>
  fs.readFileSync(p, "utf8");

function ok(v, msg) {
  if (!v) {
    throw new Error(
      "PRE-APK NAV: " + msg
    );
  }
  console.log("OK:", msg);
}

const med =
  read("app/saude/medicamentos/detalhes/page.tsx");

const central =
  read("app/inteligencia/page.tsx");

const health =
  read("app/inteligencia/saude/page.tsx");

const bottom =
  read("components/BottomNav.tsx");

const providers =
  read("components/Providers.tsx");

const indicator =
  read("components/SyncStatusIndicator.tsx");

/*
 * VAULT_SAFE_BACK_CONTRACT_V76_1
 *
 * Valida o handleSafeBack real.
 * Não depende de uma janela arbitrária antes
 * do botão Voltar.
 */

const labelPos =
  med.indexOf('aria-label="Voltar"');

ok(
  labelPos >= 0,
  "medicamento possui botão Voltar"
);

const safeBackStart =
  med.indexOf("const handleSafeBack");

ok(
  safeBackStart >= 0,
  "medicamento possui handleSafeBack"
);

const safeBackEnd =
  med.indexOf(
    "const {",
    safeBackStart + 1
  );

ok(
  safeBackEnd > safeBackStart,
  "handleSafeBack possui limite detectável"
);

const medRegion =
  med.slice(
    safeBackStart,
    safeBackEnd
  );

ok(
  medRegion.includes("router.back()"),
  "Voltar tenta histórico interno"
);

ok(
  medRegion.includes("router.replace"),
  "Voltar possui fallback determinístico"
);

ok(
  medRegion.includes("/saude/medicamentos"),
  "Voltar aponta para a lista"
);

ok(
  medRegion.includes(
    "/saude/medicamentos/detalhes"
  ),
  "fallback detecta permanência nos detalhes"
);

ok(
  med.includes(
    "VAULT_MEDICATION_BACK_CONTRACT_V65"
  ),
  "contrato de retorno do medicamento presente"
);

ok(
  central.includes('router.replace("/mais")'),
  "Central retorna para Mais"
);

ok(
  central.includes(
    'router.push("/inteligencia/alertas")'
  ),
  "Central abre Cérebro V5"
);

ok(
  health.includes(
    'router.replace("/inteligencia")'
  ),
  "Saúde longitudinal continua integrada à Central"
);



ok(
  bottom.includes(
    "VAULT_INTELLIGENCE_NAV_CONTEXT_V65"
  ),
  "BottomNav conhece contexto da Inteligência"
);

ok(
  bottom.includes("/inteligencia"),
  "Inteligência pertence ao contexto do menu inferior"
);

ok(
  providers.includes(
    "VAULT_SYNC_BACKGROUND_V64"
  ),
  "sync background preservado"
);

ok(
  providers.includes(
    'phase: "background"'
  ),
  "pull longo possui estado background"
);

ok(
  indicator.includes(
    'syncRuntime.phase === "background"'
  ),
  "indicador representa atualização em background"
);

ok(
  !providers.includes(
    "A atualização da nuvem está demorando mais que o esperado."
  ),
  "pull lento não gera falso erro"
);

ok(
  health.includes("humanSignalSubject"),
  "IDs internos continuam humanizados"
);

ok(
  health.includes("timelineExpanded"),
  "timeline continua compactável"
);

ok(
  health.includes("signalsExpanded"),
  "sinais continuam compactáveis"
);

ok(
  health.includes("brainHealthExpanded"),
  "Brain Health continua compactável"
);

ok(
  health.includes("feedbackExpanded"),
  "feedback continua compactável"
);

console.log(
  "VAULT PRE-APK INTELLIGENCE + NAV: CONTRATOS OK"
);
