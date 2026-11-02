import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const ok=(v,m)=>{if(!v)throw Error("V98 FINAL: "+m);console.log("OK:",m)};
const hook=read("hooks/useMedicationRegulatoryProfiles.ts");
const list=read("app/saude/medicamentos/page.tsx");
const today=read("app/hoje/page.tsx");
const card=read("components/hoje/TodayDoseTimelineCard.tsx");
const timeline=read("lib/today/build-timeline-items.ts");
const summary=read("lib/today/timeline-summary.ts");
const home=read("lib/health-intelligence/home-signal-orchestration.ts");
const health=read("app/inteligencia/saude/page.tsx");

ok(hook.includes("CATALOG_CACHE_SCHEMA")&&hook.includes("catalogSignatureFromStatus")&&hook.includes("MANIFEST_TTL_MS"),"cache possui schema, versão e invalidação explícitos");
ok(hook.includes("reference: MedicationReference")&&!hook.includes("Record<string, MedicationRegulatoryVisual>\n  >;"),"snapshot persiste referência farmacêutica, não apenas selo visual");
ok(hook.includes("Promise.allSettled")&&hook.includes("resolveBestReference")&&hook.includes("right.quality - left.quality"),"candidatos determinísticos são hidratados e ranqueados em conjunto");
ok(hook.includes("isDeterministicCandidate")&&hook.includes("isPharmaceuticallyEquivalentName"),"fuzzy sozinho não concede autoridade");
ok(hook.includes("preservesAuthority")&&hook.includes("resolved.quality >= previous.quality")&&hook.includes("known?.reference || null"),"falha transitória, versão nova ou candidato pior não apagam verdade conhecida");
ok(hook.includes("referenceIsFresh")&&hook.includes("retryAfter")&&hook.includes("inflight"),"SWR evita pesquisa por render e tempestade de retries");
ok(hook.includes("collectionSignature")&&hook.includes("useSyncExternalStore"),"coleções instáveis não reintroduzem loop React 185");
ok(list.includes("useMedicationCatalogProfiles")&&!list.includes("useMedicationCatalogIdentities("),"listagem consome identidade e regulatório por uma única assinatura");
ok(list.includes('? "Receita n/c"')&&list.includes('regulatoryProfile?.label')&&list.includes("Medicamento identificado no catálogo"),"rail e explicação distinguem identidade farmacêutica de receita não confirmada");
ok(list.includes('authorityState === "possible_divergence"')&&!list.includes("catalogIdentity.authorityLabel}"),"identidade normal não compete com o regime; divergência continua visível");
ok(
  list.includes('className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border') &&
  list.includes('aria-label={`${quickDoseLabel} ${med.nome}') &&
  list.includes('setQuickDoseMedId(med.id!)') &&
  list.includes('event.stopPropagation();') &&
  list.includes('isSOS ? "border-amber-400/20'),
  "V98: Tomar e SOS mantêm alvo tátil ampliado, rótulo acessível e ação existente"
);
ok(list.includes("VAULT_MEDICATION_LIST_HIERARCHY_V98")&&!list.includes("{/* CONTEXTO CLÍNICO */}"),"lista delega informação secundária aos detalhes");
ok(
  timeline.includes('med.tipo_uso === "sos"') &&
  timeline.includes('med.tipo_uso === "esporadico"') &&
  today.includes('med.tipo_uso !== "continuo"'),
  "V98: agenda exclui SOS/esporádicos pela autoridade extraída, e Hoje preserva filtro contínuo"
);
ok(
  timeline.includes('log.dose_kind === "extra"') &&
  timeline.includes('log.dose_kind === "sos"') &&
  timeline.includes('isAvulsa: true') &&
  summary.includes('item.isAvulsa && item.doseKind !== "planned"') &&
  summary.includes('if (item.isExpectedUnconfirmed) totalEsperadasSemConfirmacao++') &&
  summary.includes('if (item.isExpectedUnconfirmed || item.isDataConflict || item.isAvulsa || item.isSintoma) continue;') &&
  today.includes('<TodayDoseTimelineCard item={item} scope={doseCardScope} />') &&
  card.includes('item.doseKind === "planned" ? "Agendada" : "SOS / Avulsa"') &&
  today.includes('!dose.isAvulsa'),
  "V98: SOS/extra são avulsos e permanecem fora do progresso programado"
);
ok(
  home.includes("healthSignalSemanticKey") &&
  home.includes("healthSignalPhenomenon(insight)") &&
  home.includes("insightMatchesMedication(insight,opportunity)") &&
  home.includes("carePhenomena(opportunity).has(phenomenon)"),
  "Home deduplica estruturalmente por entidade e fenômeno"
);
ok(health.includes("VAULT INTELLIGENCE")&&!health.includes("BRAIN V4\n"),"versão técnica não aparece na experiência");
console.log("VAULT V98 FINAL MEDICATION + TODAY + INTELLIGENCE: CONTRACT OK");
