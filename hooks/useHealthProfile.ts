"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivePersonId } from "./useActivePersonId";
import { useAuth } from "./useAuth";
import { healthProfileRepository } from "@/lib/repositories/healthProfile";
export function useHealthProfile() {
  const { activePersonId } = useActivePersonId(),
    { user } = useAuth();
  const result = useLiveQuery(async () => {
    if (!activePersonId || !user?.id) return null;
    try {
      return {
        data: await healthProfileRepository.overview(activePersonId),
        error: null,
      };
    } catch (e) {
      return {
        data: null,
        error:
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o perfil.",
      };
    }
  }, [activePersonId, user?.id]);
  const scoped =
    result?.data?.person?.id === activePersonId ? result?.data : null;
  return {
    personId: activePersonId,
    person: scoped?.person,
    profile: scoped?.profile,
    devices: scoped?.devices ?? [],
    loading: result === undefined || Boolean(result?.data && !scoped),
    error: result?.error,
  };
}
