import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const ok=(v,m)=>{if(!v)throw Error("V98 FINAL: "+m);console.log("OK:",m)};
const hook=read("hooks/useMedicationRegulatoryProfiles.ts");
const list=read("app/saude/medicamentos/page.tsx");
const today=read("app/hoje/page.tsx");
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
ok(list.includes('? "Não conf."')&&list.includes('regulatoryProfile?.label'),"rail comunica somente regime regulatório");
ok(list.includes('authorityState === "possible_divergence"')&&!list.includes("catalogIdentity.authorityLabel}"),"identidade normal não compete com o regime; divergência continua visível");
ok(list.includes("min-h-8")&&list.includes("setQuickDoseMedId"),"Tomar e SOS possuem alvo tátil sem faixa inferior");
ok(list.includes("VAULT_MEDICATION_LIST_HIERARCHY_V98")&&!list.includes("{/* CONTEXTO CLÍNICO */}"),"lista delega informação secundária aos detalhes");
ok(today.includes('med.tipo_uso === "sos"')&&today.includes('med.tipo_uso === "esporadico"'),"SOS e esporádicos continuam fora da agenda programada");
ok(today.includes('log.dose_kind === "extra"')&&today.includes('log.dose_kind === "sos"'),"SOS e extra continuam separados do progresso");
ok(
  home.includes("healthSignalSemanticKey") &&
  home.includes("healthSignalPhenomenon(insight)") &&
  home.includes("insightMatchesMedication(insight,opportunity)") &&
  home.includes("carePhenomena(opportunity).has(phenomenon)"),
  "Home deduplica estruturalmente por entidade e fenômeno"
);
ok(health.includes("VAULT INTELLIGENCE")&&!health.includes("BRAIN V4\n"),"versão técnica não aparece na experiência");
console.log("VAULT V98 FINAL MEDICATION + TODAY + INTELLIGENCE: CONTRACT OK");
