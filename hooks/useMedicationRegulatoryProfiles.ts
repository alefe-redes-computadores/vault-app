"use client";

import { useEffect, useState } from "react";
import type { Medicamento } from "@/lib/types";
import type { MedicationReference } from "@/lib/medication-intelligence/types";
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";
import { supabaseMedicationCatalogProvider } from "@/lib/medication-catalog";
import { getMedicationCatalogAuthority, type MedicationCatalogAuthorityState } from "@/lib/medication-catalog/authority";
import { resolveMedicationRegulatoryVisual, type MedicationRegulatoryVisual } from "@/lib/medication-regulatory-visual";

const referenceCache = new Map<string, MedicationReference | null>();

async function referenceFor(medication: Medicamento): Promise<MedicationReference | null> {
  const key = normalizeMedicationText(medication.nome);
  if (!key) return null;
  if (referenceCache.has(key)) return referenceCache.get(key) || null;
  try {
    const quick = await supabaseMedicationCatalogProvider.searchLight(medication.nome, { limit: 3, minimumScore: 0.86 });
    const exact = quick.find((item) => normalizeMedicationText(item.matchedText) === key || normalizeMedicationText(item.canonicalName) === key);
    if (!exact) {
      referenceCache.set(key, null);
      return null;
    }
    const hydrated = await supabaseMedicationCatalogProvider.hydrateQuickResult(exact);
    const reference = hydrated?.reference || null;
    referenceCache.set(key, reference);
    return reference;
  } catch {
    return null;
  }
}

export function useMedicationRegulatoryProfiles(medications: Medicamento[]): Record<string, MedicationRegulatoryVisual> {
  const [profiles, setProfiles] = useState<Record<string, MedicationRegulatoryVisual>>({});

  useEffect(() => {
    let cancelled = false;
    const initial = Object.fromEntries(medications.filter((item) => item.id).map((item) => [item.id!, resolveMedicationRegulatoryVisual(item)]));
    setProfiles(initial);

    void (async () => {
      const resolved = await Promise.all(medications.filter((item) => item.id).map(async (item) => {
        const reference = await referenceFor(item);
        return [item.id!, resolveMedicationRegulatoryVisual(item, reference)] as const;
      }));
      if (!cancelled) setProfiles(Object.fromEntries(resolved));
    })();

    return () => { cancelled = true; };
  }, [medications]);

  return profiles;
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

// VAULT_MEDICATION_IDENTITY_V95_2
// Fuzzy nunca vira identidade silenciosa.
export function useMedicationCatalogIdentities(
  medications: Medicamento[]
): Record<string, MedicationCatalogIdentity> {
  const [identities, setIdentities] = useState<Record<string, MedicationCatalogIdentity>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await Promise.all(
        medications.filter((item) => item.id).map(async (item) => {
          const reference = await referenceFor(item);
          const authority = getMedicationCatalogAuthority(item.nome, reference);
          const activeIngredient = authority.activeIngredients[0] || null;
          return [
            item.id!,
            {
              activeIngredient,
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
            },
          ] as const;
        })
      );
      if (!cancelled) setIdentities(Object.fromEntries(resolved));
    })();
    return () => { cancelled = true; };
  }, [medications]);

  return identities;
}
