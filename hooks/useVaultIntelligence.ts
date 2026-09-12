"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { vaultIntelligenceRepository } from "@/lib/repositories/vaultIntelligence";
import { buildVaultIntelligence } from "@/lib/vault-intelligence/engine";

export function useVaultIntelligence() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const snapshot = useLiveQuery(
    () => user?.id && activePersonId ? vaultIntelligenceRepository.snapshot(activePersonId, user.id) : undefined,
    [user?.id, activePersonId]
  );
  const result = useMemo(() => snapshot ? buildVaultIntelligence(snapshot) : null, [snapshot]);
  return { result, insights: result?.insights || [], highlights: result?.highlights || [], coverage: result?.coverage, isLoading: Boolean(user?.id && activePersonId && snapshot === undefined) };
}
