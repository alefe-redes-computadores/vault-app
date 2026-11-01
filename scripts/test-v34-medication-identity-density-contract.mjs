import fs from "node:fs";
const page=fs.readFileSync("app/saude/medicamentos/page.tsx","utf8");
const ok=(v,m)=>{if(!v)throw Error("V34/V98: "+m);console.log("OK:",m)};
ok(page.includes('density="compact"'),"densidade compacta preservada");
ok(
  page.includes('showActiveIngredient && (') &&
  page.includes('className="sr-only" title={`Princípio ativo: ${activeIngredient}`}') &&
  page.includes('Princípio ativo: {activeIngredient}') &&
  page.includes('catalogIdentity?.authorityState === "possible_divergence"') &&
  page.includes('Revisar identidade'),
  "V98: princípio ativo disponível à acessibilidade, identidade divergente visível e sem poluir card compacto"
);
ok(page.includes("VAULT_MEDICATION_LIST_HIERARCHY_V98"),"contexto secundário delegado aos detalhes");
ok(!page.includes("{/* CONTEXTO CLÍNICO */}"),"tratamentos não variam a altura da lista");
const strip = fs.readFileSync("components/saude/MedicationOperationalStrip.tsx", "utf8");
ok(
  page.includes('<MedicationOperationalStrip today={todayStatus}') &&
  page.includes('stockLabel={humanizeStockText(textoEstoquePrincipal)}') &&
  page.includes('stockDetail={textoEstoqueSecundario || estoqueStatus}') &&
  page.includes('stockTone={isEstoqueZerado?"empty":isEstoqueCritico?"low":"known"}') &&
  page.includes('doseOutcome={dosesIgnoradasHoje>0&&!isSOS?"ignored":rotinaConcluida||sosTomadoHoje?"completed":"unconfirmed"}') &&
  strip.includes('aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}') &&
  strip.includes('stockTone==="empty"') &&
  strip.includes('doseOutcome==="ignored"'),
  "V98: rotina e estoque operacionais, acessíveis e sem confirmação inventada"
);
console.log("V34/V98 MEDICATION IDENTITY DENSITY: OK");
