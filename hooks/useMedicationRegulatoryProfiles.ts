"use client";

import { useEffect, useState } from "react";
import type { Medicamento } from "@/lib/types";
import type { MedicationReference } from "@/lib/medication-intelligence/types";
import { normalizeMedicationText } from "@/lib/medication-intelligence/normalize";
import { supabaseMedicationCatalogProvider } from "@/lib/medication-catalog";
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
