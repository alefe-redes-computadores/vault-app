"use client";

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
  return cache ?? (cache = emptyCache());
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
