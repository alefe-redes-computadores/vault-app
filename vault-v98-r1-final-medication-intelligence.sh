#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/projects/vault-app"
EXPECTED_HEAD="51aca7cbb6c72b235daccadfd2a1aac9c9de84a4"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROJECT/.vault-backups/v98-final-medication-intelligence-$STAMP"

cd "$PROJECT"

test -f package.json || { echo "ERRO: package.json ausente em $PROJECT"; exit 1; }
grep -q '"name"[[:space:]]*:[[:space:]]*"vault"' package.json || { echo "ERRO: este diretório não é o Vault."; exit 1; }
git merge-base --is-ancestor "$EXPECTED_HEAD" HEAD || { echo "ERRO: V97.2 R1 ($EXPECTED_HEAD) não está na base atual."; exit 1; }
test ! -e scripts/test-v98-final-medication-intelligence-contract.mjs || {
  echo "ERRO: contrato V98 já existe. Restaure/avalie a tentativa anterior antes de reaplicar."
  exit 1
}

FILES=(
  hooks/useMedicationRegulatoryProfiles.ts
  app/saude/medicamentos/page.tsx
  app/inteligencia/saude/page.tsx
  app/inteligencia/page.tsx
  app/mais/page.tsx
  app/saude/rede/page.tsx
  app/page.tsx
  scripts/test-v34-medication-identity-density-contract.mjs
  scripts/test-v75-global-experience-contract.mjs
  scripts/test-v95-2-medication-experience-sync-contract.mjs
  scripts/test-v95-3-catalog-authority-contract.mjs
  scripts/test-v97-2-r1-regulatory-stability-card-rhythm-contract.mjs
)

mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  test -f "$file" || { echo "ERRO: arquivo esperado ausente: $file"; exit 1; }
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -p "$file" "$BACKUP/$file"
done

rollback() {
  local code=$?
  if (( code != 0 )); then
    echo "Falha detectada. Restaurando arquivos anteriores..."
    for file in "${FILES[@]}"; do
      cp -p "$BACKUP/$file" "$file"
    done
    rm -f scripts/test-v98-final-medication-intelligence-contract.mjs
    echo "Rollback concluído."
  fi
  exit "$code"
}
trap rollback EXIT

python3 <<'PY'
from pathlib import Path

hook = r'''"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Medicamento } from "@/lib/types";
import type { MedicationReference } from "@/lib/medication-intelligence/types";
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";
import { supabaseMedicationCatalogProvider } from "@/lib/medication-catalog";
import {
  getMedicationCatalogAuthority,
  type MedicationCatalogAuthorityState,
} from "@/lib/medication-catalog/authority";
import { isPharmaceuticallyEquivalentName } from "@/lib/medication-catalog/pharmaceutical-equivalence";
import {
  resolveMedicationRegulatoryVisual,
  type MedicationRegulatoryVisual,
} from "@/lib/medication-regulatory-visual";

// VAULT_CATALOG_SWR_V98
// Persiste a referência farmacêutica que sustenta a UI, nunca apenas o selo visual.
const CATALOG_CACHE_KEY = "@vault:medication_catalog_resolution:v98";
const CATALOG_CACHE_SCHEMA = 98;
const REFERENCE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MANIFEST_TTL_MS = 24 * 60 * 60 * 1000;
const RETRY_TTL_MS = 15 * 60 * 1000;

type PersistedReference = {
  lookupKey: string;
  reference: MedicationReference;
  catalogSignature: string | null;
  resolvedAt: number;
  quality: number;
  matchKind: "exact" | "pharmaceutical_equivalence";
};

type ResolvedReference = {
  reference: MedicationReference;
  quality: number;
  matchKind: PersistedReference["matchKind"];
};

type CatalogResolutionCache = {
  schema: number;
  catalogSignature: string | null;
  manifestCheckedAt: number;
  manifestRetryAfter: number;
  entries: Record<string, PersistedReference>;
  retryAfter: Record<string, number>;
};

type StoreSnapshot = { revision: number };

const emptyCache = (): CatalogResolutionCache => ({
  schema: CATALOG_CACHE_SCHEMA,
  catalogSignature: null,
  manifestCheckedAt: 0,
  manifestRetryAfter: 0,
  entries: {},
  retryAfter: {},
});

let cache: CatalogResolutionCache | null = null;
let storeSnapshot: StoreSnapshot = { revision: 0 };
const serverSnapshot: StoreSnapshot = { revision: 0 };
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<MedicationReference | null>>();
let manifestInflight: Promise<string | null> | null = null;

function loadCache(): CatalogResolutionCache {
  if (cache) return cache;
  cache = emptyCache();
  if (typeof window === "undefined") return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CATALOG_CACHE_KEY) || "null");
    if (
      parsed &&
      parsed.schema === CATALOG_CACHE_SCHEMA &&
      parsed.entries &&
      typeof parsed.entries === "object"
    ) {
      cache = {
        ...emptyCache(),
        ...parsed,
        entries: parsed.entries,
        retryAfter: parsed.retryAfter || {},
      };
    }
  } catch {
    cache = emptyCache();
  }
  return cache;
}

function persistCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(loadCache()));
  } catch {
    // Cache é aceleração; storage indisponível nunca bloqueia o Vault.
  }
}

function emit(): void {
  storeSnapshot = { revision: storeSnapshot.revision + 1 };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreSnapshot {
  loadCache();
  return storeSnapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return serverSnapshot;
}

function lookupKeyFor(medication: Medicamento): string {
  return normalizeMedicationText(medication.nome);
}

function medicationFingerprint(medication: Medicamento): string {
  return [
    medication.id || "",
    lookupKeyFor(medication),
    medication.dosagem || "",
    medication.formato || "",
    medication.forma_farmaceutica || "",
    medication.tipo_receita || "",
  ].join("|");
}

function catalogSignatureFromStatus(status: Awaited<ReturnType<typeof supabaseMedicationCatalogProvider.getStatus>>): string {
  return status.sources
    .map((source) => `${source.id}:${source.version || ""}:${source.verifiedAt || ""}`)
    .sort()
    .join("|");
}

async function refreshCatalogManifest(): Promise<string | null> {
  const current = loadCache();
  const now = Date.now();
  if (current.manifestCheckedAt && now - current.manifestCheckedAt < MANIFEST_TTL_MS) {
    return current.catalogSignature;
  }
  if (current.manifestRetryAfter > now) return current.catalogSignature;
  if (manifestInflight) return manifestInflight;

  manifestInflight = (async () => {
    try {
      const status = await supabaseMedicationCatalogProvider.getStatus();
      const signature = catalogSignatureFromStatus(status);
      const target = loadCache();
      target.catalogSignature = signature || null;
      target.manifestCheckedAt = Date.now();
      target.manifestRetryAfter = 0;
      persistCache();
      return target.catalogSignature;
    } catch {
      const target = loadCache();
      target.manifestRetryAfter = Date.now() + RETRY_TTL_MS;
      persistCache();
      return target.catalogSignature;
    } finally {
      manifestInflight = null;
    }
  })();

  return manifestInflight;
}

function isDeterministicCandidate(
  medication: Medicamento,
  candidate: { matchedText: string; canonicalName: string }
): boolean {
  const key = lookupKeyFor(medication);
  return (
    normalizeMedicationText(candidate.matchedText) === key ||
    normalizeMedicationText(candidate.canonicalName) === key ||
    isPharmaceuticallyEquivalentName(candidate.matchedText, medication.nome) ||
    isPharmaceuticallyEquivalentName(candidate.canonicalName, medication.nome)
  );
}

function referenceQuality(
  medication: Medicamento,
  reference: MedicationReference,
  matchedText: string,
  searchScore: number
): { quality: number; matchKind: PersistedReference["matchKind"] } {
  const key = lookupKeyFor(medication);
  const exact =
    normalizeMedicationText(matchedText) === key ||
    normalizeMedicationText(reference.canonicalName) === key;
  const regulatory = resolveMedicationRegulatoryVisual(medication, reference);
  const officialSource = reference.sources.some(
    (source) => source.authority === "anvisa" || source.authority === "ministerio_saude"
  );
  const product = reference.regulatoryIdentity?.referenceType === "product";
  const ingredients = reference.activeIngredients?.length || (reference.activeIngredient ? 1 : 0);

  return {
    quality:
      (exact ? 1000 : 600) +
      (regulatory.verified ? 400 : 0) +
      (officialSource ? 100 : 0) +
      (product ? 40 : 0) +
      (ingredients ? 20 : 0) +
      Math.round(searchScore * 10),
    matchKind: exact ? "exact" : "pharmaceutical_equivalence",
  };
}

async function resolveBestReference(
  medication: Medicamento
): Promise<ResolvedReference | null> {
  const quick = await supabaseMedicationCatalogProvider.searchLight(medication.nome, {
    limit: 8,
    minimumScore: 0.5,
  });

  // Fuzzy descobre; somente candidatos determinísticos podem ser hidratados como autoridade.
  const deterministic = quick.filter((candidate) =>
    isDeterministicCandidate(medication, candidate)
  );
  if (!deterministic.length) return null;

  const settled = await Promise.allSettled(
    deterministic.map(async (candidate) => {
      const hydrated = await supabaseMedicationCatalogProvider.hydrateQuickResult(candidate);
      if (!hydrated?.reference) return null;
      const rank = referenceQuality(
        medication,
        hydrated.reference,
        hydrated.matchedText,
        hydrated.score
      );
      return { reference: hydrated.reference, ...rank };
    })
  );

  return settled
    .filter(
      (result): result is PromiseFulfilledResult<ResolvedReference> =>
        result.status === "fulfilled" && Boolean(result.value)
    )
    .map((result) => result.value)
    .sort((left, right) => right.quality - left.quality)[0] || null;
}

function referenceIsFresh(entry: PersistedReference, signature: string | null): boolean {
  // Quando o manifesto está disponível, snapshots sem assinatura também precisam revalidar.
  const sameCatalog = !signature || entry.catalogSignature === signature;
  return sameCatalog && Date.now() - entry.resolvedAt < REFERENCE_TTL_MS;
}

async function ensureReference(
  medication: Medicamento,
  signature: string | null
): Promise<MedicationReference | null> {
  const key = lookupKeyFor(medication);
  if (!key) return null;
  const current = loadCache();
  const known = current.entries[key];
  if (known && referenceIsFresh(known, signature)) return known.reference;
  if (current.retryAfter[key] && current.retryAfter[key] > Date.now()) {
    return known?.reference || null;
  }
  const running = inflight.get(key);
  if (running) return running;

  const request = (async () => {
    try {
      const resolved = await resolveBestReference(medication);
      if (!resolved) {
        loadCache().retryAfter[key] = Date.now() + RETRY_TTL_MS;
        persistCache();
        return known?.reference || null;
      }

      // Atualização atômica e monotônica: nem uma nova versão do catálogo pode
      // rebaixar uma verdade regulatória confirmada para um candidato sem regra.
      const previous = loadCache().entries[key];
      const previousVerified = previous
        ? resolveMedicationRegulatoryVisual(medication, previous.reference).verified
        : false;
      const resolvedVerified = resolveMedicationRegulatoryVisual(
        medication,
        resolved.reference
      ).verified;
      const catalogChanged = previous?.catalogSignature !== signature;
      const preservesAuthority = !previousVerified || resolvedVerified;
      const mayReplace =
        !previous ||
        (preservesAuthority && (catalogChanged || resolved.quality >= previous.quality));

      if (mayReplace) {
        loadCache().entries[key] = {
          lookupKey: key,
          reference: resolved.reference,
          catalogSignature: signature,
          resolvedAt: Date.now(),
          quality: resolved.quality,
          matchKind: resolved.matchKind,
        };
        delete loadCache().retryAfter[key];
        persistCache();
        emit();
        return resolved.reference;
      }
      return previous.reference;
    } catch {
      loadCache().retryAfter[key] = Date.now() + RETRY_TTL_MS;
      persistCache();
      return known?.reference || null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

async function ensureMedicationBatch(medications: Medicamento[]): Promise<void> {
  const signature = await refreshCatalogManifest();
  const unique = new Map<string, Medicamento>();
  for (const medication of medications) {
    const key = lookupKeyFor(medication);
    if (key && medication.id) unique.set(key, medication);
  }
  await Promise.allSettled(
    [...unique.values()].map((medication) => ensureReference(medication, signature))
  );
}

export type MedicationCatalogIdentity = {
  activeIngredient: string | null;
  activeIngredients: string[];
  canonicalName: string | null;
  sourceLabel: string | null;
  authorityState: MedicationCatalogAuthorityState;
  authorityLabel: string;
  authorityDetail: string;
  referenceType: "product" | "substance" | null;
  registrationNumber: string | null;
  manufacturer: string | null;
  presentationCount: number;
};

function identityFor(medication: Medicamento, reference: MedicationReference | null): MedicationCatalogIdentity {
  const authority = getMedicationCatalogAuthority(medication.nome, reference);
  return {
    activeIngredient: authority.activeIngredients[0] || null,
    activeIngredients: authority.activeIngredients,
    canonicalName: reference?.canonicalName || null,
    sourceLabel: authority.sourceLabel,
    authorityState: authority.state,
    authorityLabel: authority.label,
    authorityDetail: authority.detail,
    referenceType: authority.referenceType,
    registrationNumber: authority.registrationNumber,
    manufacturer: authority.manufacturer,
    presentationCount: authority.presentationCount,
  };
}

export function useMedicationCatalogProfiles(medications: Medicamento[]): {
  regulatoryProfiles: Record<string, MedicationRegulatoryVisual>;
  catalogIdentities: Record<string, MedicationCatalogIdentity>;
} {
  const latestMedications = useRef(medications);
  latestMedications.current = medications;
  const collectionSignature = medications.map(medicationFingerprint).sort().join("::");
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void ensureMedicationBatch(latestMedications.current);
  }, [collectionSignature]);

  return useMemo(() => {
    const regulatoryProfiles: Record<string, MedicationRegulatoryVisual> = {};
    const catalogIdentities: Record<string, MedicationCatalogIdentity> = {};
    // Evita mismatch de hidratação: o snapshot persistente entra assim que
    // useSyncExternalStore conclui a ponte cliente, antes da revalidação remota.
    const current = state === serverSnapshot ? emptyCache() : loadCache();

    for (const medication of medications) {
      if (!medication.id) continue;
      const reference = current.entries[lookupKeyFor(medication)]?.reference || null;
      regulatoryProfiles[medication.id] = resolveMedicationRegulatoryVisual(medication, reference);
      catalogIdentities[medication.id] = identityFor(medication, reference);
    }

    return { regulatoryProfiles, catalogIdentities };
  }, [collectionSignature, state.revision]);
}

export function useMedicationRegulatoryProfiles(
  medications: Medicamento[]
): Record<string, MedicationRegulatoryVisual> {
  return useMedicationCatalogProfiles(medications).regulatoryProfiles;
}

export function useMedicationCatalogIdentities(
  medications: Medicamento[]
): Record<string, MedicationCatalogIdentity> {
  return useMedicationCatalogProfiles(medications).catalogIdentities;
}
'''

Path("hooks/useMedicationRegulatoryProfiles.ts").write_text(hook, encoding="utf-8")

def replace_exact(path: str, old: str, new: str, label: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"V98: {label}: esperado 1 ponto, encontrado {count}")
    target.write_text(text.replace(old, new), encoding="utf-8")

page = "app/saude/medicamentos/page.tsx"

replace_exact(page, "  Stethoscope,\n", "", "import visual médico aposentado")
replace_exact(
    page,
    '''  useMedicationCatalogIdentities,
  useMedicationRegulatoryProfiles,
''',
    '''  useMedicationCatalogProfiles,
''',
    "resolver compartilhado importado uma vez",
)
replace_exact(
    page,
    '''import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  getClinicalTheme,
} from "@/lib/health-utils";

''',
    "",
    "dependências de contexto clínico delegadas",
)
replace_exact(
    page,
    '''  const {
    tratamentos,
  } =
    useTratamentos();

  const tratamentosPorId =
    useMemo(
      () =>
        new Map(
          (tratamentos || [])
            .filter(
              (tratamento) =>
                Boolean(
                  tratamento.id
                )
            )
            .map(
              (tratamento) => [
                tratamento.id!,
                tratamento,
              ]
            )
        ),
      [
        tratamentos,
      ]
    );

''',
    "",
    "consulta de tratamentos removida da listagem",
)
replace_exact(
    page,
    '''      const tratamentosVinculados =
        (
          med.tratamento_ids ||
          []
        )
          .map(
            (tratamentoId) =>
              tratamentosPorId.get(
                tratamentoId
              )
          )
          .filter(
            (
              tratamento
            ): tratamento is NonNullable<typeof tratamento> =>
              Boolean(
                tratamento
              )
          );

      const tratamentoThemes =
        tratamentosVinculados.map(
          (tratamento) => ({
            tratamento,
            theme:
              getClinicalTheme(
                tratamento.nome ||
                  ""
              ),
          })
        );

''',
    "",
    "derivação clínica removida da listagem",
)
replace_exact(
    page,
    '''  const regulatoryProfiles =
    useMedicationRegulatoryProfiles(
      medicamentosDaPessoa
    );

  const catalogIdentities =
    useMedicationCatalogIdentities(
      medicamentosDaPessoa
    );
''',
    '''  const {
    regulatoryProfiles,
    catalogIdentities,
  } = useMedicationCatalogProfiles(
    medicamentosDaPessoa
  );
''',
    "um único consumidor do registro farmacêutico",
)

replace_exact(
    page,
    '''                  {catalogIdentity?.authorityState &&
                    catalogIdentity.authorityState !== "unvalidated" && (
                    <span
                      title={catalogIdentity.authorityDetail}
                      className={`inline-flex h-6 shrink-0 items-center rounded-lg border px-2 text-[9px] font-bold uppercase tracking-wide ${
                        catalogIdentity.authorityState === "possible_divergence"
                          ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-300"
                          : "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300/80"
                      }`}
                    >
                      {catalogIdentity.authorityLabel}
                    </span>
                  )}''',
    '''                  {catalogIdentity?.authorityState === "possible_divergence" && (
                    <span
                      title={catalogIdentity.authorityDetail}
                      className="inline-flex h-6 shrink-0 items-center rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-2 text-[9px] font-bold text-amber-300"
                    >
                      Revisar identidade
                    </span>
                  )}''',
    "identidade farmacêutica excepcional",
)

replace_exact(
    page,
    '''                  {med.medico && (
                    <span className="hidden h-5.5 max-w-[132px] items-center gap-1 rounded-lg border border-surface-border/40 bg-surface-raised/55 px-2 text-[9px] font-semibold text-ink-muted min-[390px]:inline-flex">
                      <Stethoscope
                        size={
                          10
                        }
                        className="shrink-0 opacity-60"
                      />

                      <span className="truncate">
                        {
                          med.medico
                        }
                      </span>
                    </span>
                  )}

''',
    "",
    "médico delegado aos detalhes",
)

replace_exact(
    page,
    '''            {/* CONTEXTO CLÍNICO */}
            {tratamentoThemes.length >
              0 && (
              <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                {tratamentoThemes
                  .slice(
                    0,
                    2
                  )
                  .map(
                    (
                      item
                    ) => (
                      <span
                        key={
                          item.tratamento.id
                        }
                        className="inline-flex h-5 min-w-0 max-w-[150px] items-center rounded-lg border px-2 text-[9px] font-semibold"
                        style={{
                          color:
                            item.theme.hex,
                          borderColor:
                            `${item.theme.hex}30`,
                          backgroundColor:
                            `${item.theme.hex}0D`,
                        }}
                      >
                        <span className="truncate">
                          {
                            item.tratamento.nome
                          }
                        </span>
                      </span>
                    )
                  )}

                {tratamentoThemes.length >
                  2 && (
                  <span className="shrink-0 text-[9px] font-semibold text-ink-faint">
                    +{
                      tratamentoThemes.length -
                      2
                    }
                  </span>
                )}
              </div>
            )}

''',
    '''            {/* VAULT_MEDICATION_LIST_HIERARCHY_V98
                Indicações, médico e tratamentos ficam nos Detalhes.
                A lista preserva apenas identidade, rotina, estoque e exceções. */}

''',
    "contexto clínico delegado",
)

replace_exact(
    page,
    'className={`mt-1 inline-flex h-5.5 items-center gap-1 rounded-lg border px-2 text-[8px] font-black transition-all active:scale-[0.97] ${',
    'className={`mt-1 inline-flex min-h-8 items-center gap-1.5 rounded-xl border px-3 text-[9px] font-black transition-all active:scale-[0.97] ${',
    "touch target Tomar/SOS",
)

text = Path(page).read_text(encoding="utf-8")
text = text.replace('? "Informado"', '? "Não conf."')
Path(page).write_text(text, encoding="utf-8")

# Nomenclatura técnica permanece no código, mas não aparece para a pessoa usuária.
ui_replacements = {
    "app/inteligencia/saude/page.tsx": {
        "BRAIN V4": "VAULT INTELLIGENCE",
        "O Brain V4 usa somente dados registrados no Vault.": "O Vault Intelligence usa somente dados registrados no Vault.",
        "funcionamento do Brain": "como a inteligência funciona",
        "Saúde do cérebro": "Saúde da inteligência",
    },
    "app/mais/page.tsx": {
        "Brain V4 · inteligência local, longitudinal e explicável": "Inteligência local, longitudinal e explicável",
    },
    "app/saude/rede/page.tsx": {
        "Brain V4 · contexto, padrões e preparação para consulta": "Contexto, padrões e preparação para consulta",
    },
    "app/page.tsx": {
        "Abrir Central do Cérebro": "Abrir Central de Inteligência",
    },
}
for filename, replacements in ui_replacements.items():
    target = Path(filename)
    value = target.read_text(encoding="utf-8")
    for old, new in replacements.items():
        if old not in value:
            raise SystemExit(f"V98: texto esperado ausente em {filename}: {old}")
        value = value.replace(old, new)
    target.write_text(value, encoding="utf-8")

# Contratos antigos passam a validar o produto atual, não decisões visuais aposentadas.
v34 = r'''import fs from "node:fs";
const page=fs.readFileSync("app/saude/medicamentos/page.tsx","utf8");
const ok=(v,m)=>{if(!v)throw Error("V34/V98: "+m);console.log("OK:",m)};
ok(page.includes('density="compact"'),"densidade compacta preservada");
ok(page.includes("Princípio ativo ·"),"princípio ativo discreto preservado");
ok(page.includes("VAULT_MEDICATION_LIST_HIERARCHY_V98"),"contexto secundário delegado aos detalhes");
ok(!page.includes("{/* CONTEXTO CLÍNICO */}"),"tratamentos não variam a altura da lista");
ok(page.includes("PAINEL OPERACIONAL COMPACTO"),"rotina e estoque continuam operacionais");
console.log("V34/V98 MEDICATION IDENTITY DENSITY: OK");
'''
Path("scripts/test-v34-medication-identity-density-contract.mjs").write_text(v34, encoding="utf-8")

for filename in [
    "scripts/test-v75-global-experience-contract.mjs",
    "scripts/test-v95-2-medication-experience-sync-contract.mjs",
    "scripts/test-v95-3-catalog-authority-contract.mjs",
    "scripts/test-v97-2-r1-regulatory-stability-card-rhythm-contract.mjs",
]:
    target = Path(filename)
    value = target.read_text(encoding="utf-8")
    value = value.replace(
        'intelligence.includes(">Brain V4<") && healthIntelligence.includes("BRAIN V4")',
        'intelligence.includes("Central de Inteligência") && healthIntelligence.includes("VAULT INTELLIGENCE")',
    )
    value = value.replace('"referenceInflight"', '"inflight"')
    value = value.replace('l.includes("authorityLabel")', 'l.includes(\'authorityState === "possible_divergence"\')')
    value = value.replace('? "Informado"', '? "Não conf."')
    value = value.replace('h.includes("minimumScore: 0.5")', 'h.includes("minimumScore: 0.5") && h.includes("resolveBestReference")')
    value = value.replace('"REGULATORY_SNAPSHOT_KEY"', '"CATALOG_CACHE_KEY"')
    value = value.replace('"readRegulatorySnapshot"', '"loadCache"')
    value = value.replace('"writeRegulatorySnapshot"', '"persistCache"')
    target.write_text(value, encoding="utf-8")

contract = r'''import fs from "node:fs";
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
'''
Path("scripts/test-v98-final-medication-intelligence-contract.mjs").write_text(contract, encoding="utf-8")
PY

node scripts/test-v98-final-medication-intelligence-contract.mjs
node scripts/test-v97-2-r1-regulatory-stability-card-rhythm-contract.mjs
node scripts/test-v97-r1-intelligence-experience-contract.mjs
node scripts/test-v97-medication-today-experience-contract.mjs
node scripts/test-v95-3-catalog-authority-contract.mjs
node scripts/test-v95-2-medication-experience-sync-contract.mjs
node scripts/test-v96-intelligence-orchestration-contract.mjs
node scripts/test-seguranca-regulatoria-v16-contract.mjs
node scripts/test-v34-medication-identity-density-contract.mjs
node scripts/test-v75-global-experience-contract.mjs
npm run test:release
node node_modules/typescript/bin/tsc --noEmit
git diff --check

trap - EXIT

echo
echo "============================================================"
echo " VAULT V98 R1 FINAL MEDICATION + TODAY + INTELLIGENCE — ZERO ERROS"
echo "============================================================"
echo "✓ causa raiz do catálogo instável corrigida"
echo "✓ Clorpromazina não depende mais do primeiro candidato da RPC"
echo "✓ referência farmacêutica persistida com versão e TTL"
echo "✓ stale-while-revalidate preserva verdade conhecida"
echo "✓ lista não reconsulta catálogo em toda abertura/render"
echo "✓ identidade farmacêutica separada do regime regulatório"
echo "✓ cards compactos delegam contexto secundário aos detalhes"
echo "✓ Tomar/SOS possuem alvo tátil adequado"
echo "✓ Hoje preserva agenda, SOS, idempotência e estoque"
echo "✓ Vault Intelligence não expõe versão técnica"
echo "✓ release gate, TypeScript e git diff validados"
echo "Backup: $BACKUP"
echo "Nenhum build, commit ou push foi executado."
echo
git diff --stat
