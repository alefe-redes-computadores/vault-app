"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useHealthIntelligence as useHealthIntelligenceEngine } from "@/hooks/useHealthIntelligence";

import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useCareFlowM2 } from "@/hooks/useCareFlowM2";
import { db } from "@/lib/db";
import { projectExperienceContext } from "@/lib/health-intelligence/experience-context";

type HealthIntelligenceValue = ReturnType<typeof useHealthIntelligenceEngine>;
type ExperienceSources = {
  snapshot: HealthIntelligenceValue;
  userId: string | undefined;
  personId: string | null | undefined;
  events: NonNullable<ReturnType<typeof useCareFlowM2>["events"]>;
  programs: import("@/lib/rehab-m5/types").RehabProgramM5[];
};
const ExperienceSourcesContext = createContext<ExperienceSources | null>(null);


const HealthIntelligenceContext = createContext<HealthIntelligenceValue | null>(null);

/**
 * V208: one reactive clinical engine per authenticated app tree.
 * Pages, contextual cards and notification reconcilers consume the same snapshot.
 */
export function HealthIntelligenceProvider({ children }: { children: ReactNode }) {
  const value = useHealthIntelligenceEngine();
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const userId = user?.id;
  const { events } = useCareFlowM2();
  const rehab = useLiveQuery(async () => ({
    userId, personId: activePersonId,
    rows: userId && activePersonId ? await db.rehab_programs_m5.where("user_id").equals(userId)
      .filter(row => row.person_id === activePersonId && !row.deleted_at).toArray() : [],
  }), [userId, activePersonId]);
  const sources = useMemo<ExperienceSources>(() => ({
    snapshot:value, userId, personId:activePersonId, events:events ?? [],
    programs:rehab?.userId === userId && rehab?.personId === activePersonId ? rehab?.rows ?? [] : [],
  }), [value,userId,activePersonId,events,rehab]);
  return (
    <HealthIntelligenceContext.Provider value={value}>
      <ExperienceSourcesContext.Provider value={sources}>{children}</ExperienceSourcesContext.Provider>
    </HealthIntelligenceContext.Provider>
  );
}

export function useSharedHealthIntelligence(_options: { includeAudit?: boolean } = {}) {
  const value = useContext(HealthIntelligenceContext);
  if (!value) throw new Error("useSharedHealthIntelligence precisa estar dentro de HealthIntelligenceProvider.");
  return value;
}

export function useExperienceContext(day?: string) {
  const sources = useContext(ExperienceSourcesContext);
  return useMemo(() => {
    const context = sources?.snapshot.context;
    if (!sources || !context || sources.snapshot.isLoading ||
        context.userId !== sources.userId || context.personId !== sources.personId) return null;
    return projectExperienceContext(context, sources.snapshot.careCommand, sources.events,
      sources.programs, day ?? context.hoje ?? "");
  }, [sources, day]);
}
