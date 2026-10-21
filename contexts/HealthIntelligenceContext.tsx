"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useHealthIntelligence as useHealthIntelligenceEngine } from "@/hooks/useHealthIntelligence";

type HealthIntelligenceValue = ReturnType<typeof useHealthIntelligenceEngine>;

const HealthIntelligenceContext = createContext<HealthIntelligenceValue | null>(null);

/**
 * V208: one reactive clinical engine per authenticated app tree.
 * Pages, contextual cards and notification reconcilers consume the same snapshot.
 */
export function HealthIntelligenceProvider({ children }: { children: ReactNode }) {
  const value = useHealthIntelligenceEngine();
  return (
    <HealthIntelligenceContext.Provider value={value}>
      {children}
    </HealthIntelligenceContext.Provider>
  );
}

export function useSharedHealthIntelligence(_options: { includeAudit?: boolean } = {}) {
  const value = useContext(HealthIntelligenceContext);
  if (!value) throw new Error("useSharedHealthIntelligence precisa estar dentro de HealthIntelligenceProvider.");
  return value;
}
