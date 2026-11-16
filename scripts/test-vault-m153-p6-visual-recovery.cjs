const fs = require("node:fs");
const assert = require("node:assert/strict");

const read = path => fs.readFileSync(path, "utf8");
const ok = (name, fn) => { fn(); console.log("✓", name); };

const pending = read("components/PendingDosesModal.tsx");
const medications = read("app/saude/medicamentos/page.tsx");
const listCard = read("components/list/ListCard.tsx");
const operational = read("components/saude/MedicationOperationalStrip.tsx");
const hero = read("components/home/HomeDailyHero.tsx");
const alert = read("components/home/HomeAlertRow.tsx");
const attention = read("components/home/HomeAttentionRail.tsx");
const home = read("app/page.tsx");

ok("modal distingue caminho padrão da exceção", () => {
  assert.match(pending, /border-emerald-300 bg-emerald-300/);
  assert.match(pending, /border-surface-border bg-surface-raised\/45/);
  assert.match(pending, /Confirmar horários programados[\s\S]*Confirmar como tomadas agora/);
});
ok("modal preserva safe area e contraste", () => {
  assert.match(pending, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(pending, /text-\[10px\] leading-relaxed text-ink-muted">Cada medicamento é revisado individualmente/);
  assert.match(pending, /min-h-11 w-full rounded-xl[\s\S]*Revisar individualmente/);
});
ok("tarja regulatória é lateral, textual e clicável", () => {
  assert.match(listCard, /railSize\?: "standard" \| "slim" \| "label"/);
  assert.match(medications, /railSize="label"/);
  assert.match(medications, /writing-mode:vertical-rl/);
  assert.match(medications, /setSelectedRegulatory/);
  assert.doesNotMatch(medications, />Fonte confirmada</);
});
ok("compacto preserva princípio ativo, laboratório e origem", () => {
  assert.match(medications, /compactCards && \(activeIngredient \|\| latestManufacturer/);
  assert.match(medications, /\[activeIngredient, latestManufacturer \|\| med\.laboratorio_etiqueta/);
});
ok("saldo vazio não cria equivalência visual redundante", () => {
  assert.match(operational, /redundantEmptyDetail/);
  assert.match(operational, /!redundantEmptyDetail/);
});
ok("rotina recupera contexto visual sem recalcular autoridade", () => {
  assert.match(hero, /Clock3/);
  assert.match(hero, /contextLabel/);
  assert.match(hero, /line-clamp-2/);
});
ok("agenda mostra três retiradas ricas e ícones relacionais", () => {
  assert.match(home, /retiradasAgendaM147\.slice\(0, 3\)/);
  assert.match(home, /isSusWithdrawal \? <Landmark/);
  assert.match(home, /isPurchasedWithdrawal \? <Store/);
  assert.match(home, /Ver mais \{retiradasAgendaM147\.length - 3\} na Agenda/);
});
ok("atenção usa superfície neutra e entidade sem banho monocromático", () => {
  assert.match(attention, /border-surface-border\/65 bg-surface\/70/);
  assert.match(alert, /case "estoque"[\s\S]*<Package size=\{17\}/);
  assert.match(alert, /border-surface-border\/65 bg-surface/);
  assert.doesNotMatch(alert, /borderColor:/);
});
ok("Brain lido deixa a primeira dobra usando autoridade existente", () => {
  assert.match(home, /quantityFollowUpFeedback/);
  assert.match(home, /feedback === "already_knew"/);
  assert.match(home, /quantityFollowUpInsight && !quantityFollowUpChecked/);
});

console.log("VAULT M153 P6 VISUAL RECOVERY — OK");
