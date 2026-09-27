import fs from "node:fs";

const read = p => fs.readFileSync(p, "utf8");

function ok(v, msg) {
  if (!v) throw new Error("PRE-APK NAV: " + msg);
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

const labelPos =
  med.indexOf('aria-label="Voltar"');

ok(
  labelPos >= 0,
  "medicamento possui botão Voltar"
);

const medRegion =
  med.slice(
    Math.max(0, labelPos - 1200),
    labelPos
  );

ok(
  medRegion.includes("router.replace"),
  "Voltar do medicamento usa navegação determinística"
);

ok(
  medRegion.includes("/saude/medicamentos"),
  "Voltar do medicamento aponta para a lista"
);

ok(
  med.includes("VAULT_MEDICATION_BACK_CONTRACT_V65"),
  "contrato de retorno do medicamento presente"
);

ok(
  central.includes('router.replace("/mais")'),
  "Central retorna para Mais"
);

ok(
  central.includes('router.push("/inteligencia/saude")'),
  "Central abre Saúde longitudinal"
);

ok(
  health.includes('router.replace("/inteligencia")'),
  "Saúde longitudinal retorna para Central"
);

ok(
  bottom.includes("VAULT_INTELLIGENCE_NAV_CONTEXT_V65"),
  "BottomNav conhece contexto da Inteligência"
);

ok(
  bottom.includes("/inteligencia"),
  "Inteligência pertence ao contexto do menu inferior"
);

ok(
  providers.includes("VAULT_SYNC_BACKGROUND_V64"),
  "sync background preservado"
);

ok(
  providers.includes('phase: "background"'),
  "pull longo possui estado background"
);

ok(
  indicator.includes('syncRuntime.phase === "background"'),
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
