"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Medicamento, MedicationCatalogSnapshot } from "@/lib/types";
import type { MedicationReference } from "@/lib/medication-intelligence/types";
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";
import { supabaseMedicationCatalogProvider } from "@/lib/medication-catalog";
import {
  getMedicationCatalogAuthority,
  type MedicationCatalogAuthorityState,
} from "@/lib/medication-catalog/authority";
import { isPharmaceuticallyEquivalentName } from "@/lib/medication-catalog/pharmaceutical-equivalence";
import { persistMedicationCatalogSnapshot } from "@/lib/medication-catalog/persisted-snapshot";
import { medicationCatalogSnapshotFingerprint } from "@/lib/medication-catalog/snapshot-fingerprint";
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

/** MED-04: cache entries must NOT collide across account/person, medicine or presentation. */
function catalogCacheKeyFor(medication: Medicamento): string {
  return [
    medication.user_id || "", medication.person_id || "", medication.id || "",
    lookupKeyFor(medication), normalizeMedicationText(medication.dosagem || ""),
    normalizeMedicationText(medication.formato || ""),
    normalizeMedicationText(medication.forma_farmaceutica || ""),
  ].join("::");
}

function snapshotReference(medication: Medicamento): PersistedReference | null {
  const snapshot = medication.catalog_snapshot;
  if (
    !snapshot ||
    snapshot.schema !== 1 ||
    !snapshot.reference ||
    typeof snapshot.reference !== "object"
  ) return null;

  const reference = snapshot.reference as MedicationReference;
  if (!reference.canonicalName || !Array.isArray(reference.sources)) return null;
  const resolvedAt = Date.parse(snapshot.resolved_at);
  return {
    lookupKey: snapshot.lookup_key || lookupKeyFor(medication),
    reference,
    catalogSignature: snapshot.catalog_signature,
    resolvedAt: Number.isFinite(resolvedAt) ? resolvedAt : 0,
    quality: snapshot.quality,
    matchKind: snapshot.match_kind,
  };
}

function knownReference(medication: Medicamento): PersistedReference | null {
  const local = loadCache().entries[catalogCacheKeyFor(medication)] || null;
  const persisted = snapshotReference(medication);
  if (!local) return persisted;
  if (!persisted) return local;
  // An official exact snapshot must not lose to an unrelated, unverified cache candidate.
  const savedOfficial = resolveMedicationRegulatoryVisual(
    medication, persisted.reference
  ).verified;
  const localOfficial = resolveMedicationRegulatoryVisual(
    medication, local.reference
  ).verified;
  if (savedOfficial !== localOfficial) return savedOfficial ? persisted : local;
  return local.quality >= persisted.quality ? local : persisted;
}

function medicationFingerprint(medication: Medicamento): string {
  return [
    medication.id || "",
    lookupKeyFor(medication),
    medication.dosagem || "",
    medication.formato || "",
    medication.forma_farmaceutica || "",
    medication.tipo_receita || "",
    medicationCatalogSnapshotFingerprint(medication),
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
  const persisted = snapshotReference(medication)?.reference;
  const authoritativeTerms = [
    medication.nome,
    persisted?.canonicalName,
    persisted?.activeIngredient,
    ...(persisted?.activeIngredients || []),
    ...(persisted?.aliases || []),
  ].map((value) => String(value || "").trim()).filter(Boolean);

  return authoritativeTerms.some((term) => {
    const key = normalizeMedicationText(term);
    return (
      normalizeMedicationText(candidate.matchedText) === key ||
      normalizeMedicationText(candidate.canonicalName) === key ||
      isPharmaceuticallyEquivalentName(candidate.matchedText, term) ||
      isPharmaceuticallyEquivalentName(candidate.canonicalName, term)
    );
  });
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
  const persisted = snapshotReference(medication)?.reference;
  const queries = Array.from(new Set([
    medication.nome,
    persisted?.canonicalName,
    persisted?.activeIngredient,
    ...(persisted?.activeIngredients || []),
  ].map((value) => String(value || "").trim()).filter(Boolean)));

  const searches = await Promise.allSettled(
    queries.map((query) => supabaseMedicationCatalogProvider.searchLight(query, {
      limit: 8,
      minimumScore: 0.5,
    }))
  );
  const quick = searches.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

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

function persistKnownReference(
  medication: Medicamento,
  entry: PersistedReference
): void {
  const current = snapshotReference(medication);
  if (current && current.quality >= entry.quality) return;
  void persistMedicationCatalogSnapshot(
    medication.id || "",
    medication.person_id,
    {
      schema: 1,
      lookup_key: entry.lookupKey,
      catalog_signature: entry.catalogSignature,
      resolved_at: new Date(entry.resolvedAt || Date.now()).toISOString(),
      quality: entry.quality,
      match_kind: entry.matchKind,
      reference: entry.reference,
    }
  );
}

async function ensureReference(
  medication: Medicamento,
  signature: string | null
): Promise<MedicationReference | null> {
  const key = lookupKeyFor(medication);
  if (!key) return null;
  const cacheKey = catalogCacheKeyFor(medication);
  const current = loadCache();
  const known = knownReference(medication);
  if (known && !current.entries[cacheKey]) current.entries[cacheKey] = known;
  if (known && referenceIsFresh(known, signature)) {
    persistKnownReference(medication, known);
    return known.reference;
  }
  if (current.retryAfter[cacheKey] && current.retryAfter[cacheKey] > Date.now()) {
    return known?.reference || null;
  }
  const running = inflight.get(cacheKey);
  if (running) return running;

  const request = (async () => {
    try {
      const resolved = await resolveBestReference(medication);
      if (!resolved) {
        loadCache().retryAfter[cacheKey] = Date.now() + RETRY_TTL_MS;
        persistCache();
        return known?.reference || null;
      }

      // Atualização atômica e monotônica: nem uma nova versão do catálogo pode
      // rebaixar uma verdade regulatória confirmada para um candidato sem regra.
      const previous = loadCache().entries[cacheKey];
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
        const next: PersistedReference = {
          lookupKey: key,
          reference: resolved.reference,
          catalogSignature: signature,
          resolvedAt: Date.now(),
          quality: resolved.quality,
          matchKind: resolved.matchKind,
        };
        loadCache().entries[cacheKey] = next;
        delete loadCache().retryAfter[cacheKey];
        persistCache();
        emit();
        const snapshot: MedicationCatalogSnapshot = {
          schema: 1,
          lookup_key: key,
          catalog_signature: signature,
          resolved_at: new Date(next.resolvedAt).toISOString(),
          quality: next.quality,
          match_kind: next.matchKind,
          reference: next.reference,
        };
        void persistMedicationCatalogSnapshot(
          medication.id || "",
          medication.person_id,
          snapshot
        );
        return resolved.reference;
      }
      return previous.reference;
    } catch {
      loadCache().retryAfter[cacheKey] = Date.now() + RETRY_TTL_MS;
      persistCache();
      return known?.reference || null;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, request);
  return request;
}

async function ensureMedicationBatch(medications: Medicamento[]): Promise<void> {
  const signature = await refreshCatalogManifest();
  const unique = new Map<string, Medicamento>();
  for (const medication of medications) {
    const key = catalogCacheKeyFor(medication);
    if (lookupKeyFor(medication) && medication.id) unique.set(key, medication);
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
  /** UI-only: ambiguity is not an official classification. */
  regulatoryNeedsReview: boolean;
  referenceType: "product" | "substance" | null;
  registrationNumber: string | null;
  manufacturer: string | null;
  presentationCount: number;
};

/** MED-06: surface an evidence conflict; never rewrite the Details regulator. */
function regulatoryNeedsReviewMED04(medication: Medicamento, reference: MedicationReference | null): boolean {
  if (!reference) return false;
  const identity = getMedicationCatalogAuthority(medication.nome, reference);
  if (identity.state === "possible_divergence") return true;
  const rules = reference.regulatoryRules || [];
  if (!rules.length) return false;
  const isOfficial = (source: { authority?: string }) =>
    source.authority === "anvisa" || source.authority === "ministerio_saude";
  if (!rules.every(rule => rule.sources?.some(isOfficial))) return true;
  if (reference.regulatoryIdentity?.referenceType === "substance") return true;
  if (!resolveMedicationRegulatoryVisual(medication, reference).verified) return true;
  // Explicit presentation contradictions cannot be presented as unambiguous facts.
  const tokens = (value: unknown) => [...String(value || "").toLowerCase()
    .replace(/,/g, ".").matchAll(/\d+(?:\.\d+)?\s*(?:mcg\/ml|mg\/ml|ui\/ml|mcg|mg|g|ml|ui|%)/g)]
    .map(match => match[0].replace(/\s+/g, ""));
  const registered = tokens(medication.dosagem);
  const candidates = (reference.presentations || []).map(item =>
    tokens(`${item.label} ${item.value ?? ""} ${item.unit ?? ""}`)
  ).filter(values => values.length);
  if (registered.length && candidates.length &&
    !candidates.some(values => registered.every(token => values.includes(token)))) return true;
  return false;
}

function identityFor(medication: Medicamento, reference: MedicationReference | null): MedicationCatalogIdentity {
  const authority = getMedicationCatalogAuthority(medication.nome, reference);
  const persisted = snapshotReference(medication)?.reference || null;
  const savedAuthority = persisted ? getMedicationCatalogAuthority(medication.nome, persisted) : null;
  const sameVerifiedProduct = Boolean(persisted && medication.catalog_snapshot?.match_kind === "exact" &&
    savedAuthority?.state === "confirmed" &&
    (!reference || normalizeMedicationText(reference.canonicalName) === normalizeMedicationText(persisted.canonicalName)) &&
    (authority.state === "confirmed" || authority.state === "unvalidated"));
  // A divergent catalog match cannot assert a medication ingredient.
  // Keep a persisted, still-confirmed exact identity for the offline case.
  const displayIngredients = (authority.state === "confirmed" || authority.state === "compatible") && authority.activeIngredients.length
    ? authority.activeIngredients
    : sameVerifiedProduct ? savedAuthority?.activeIngredients || [] : [];
  return {
    activeIngredient: displayIngredients[0] || null,
    activeIngredients: displayIngredients,
    canonicalName: reference?.canonicalName || null,
    sourceLabel: authority.sourceLabel,
    authorityState: authority.state,
    authorityLabel: authority.label,
    authorityDetail: authority.detail,
    regulatoryNeedsReview: regulatoryNeedsReviewMED04(medication, reference),
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
      const reference = knownReference(medication)?.reference || null;
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
