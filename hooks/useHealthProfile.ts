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
        personId: activePersonId, userId:user.id,
        data: await healthProfileRepository.overview(activePersonId),
        error: null,
      };
    } catch (e) {
      return {
        personId: activePersonId, userId:user.id,
        data: null,
        error:
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o perfil.",
      };
    }
  }, [activePersonId, user?.id]);
  const current = Boolean(user?.id && activePersonId && result?.personId === activePersonId && result?.userId === user.id);
  const scoped = current && result?.data?.person?.id === activePersonId && result?.data?.person?.user_id === user?.id ? result.data : null;
  return {
    personId: user?.id ? activePersonId : null,
    person: scoped?.person,
    profile: scoped?.profile,
    devices: scoped?.devices ?? [],
    loading: Boolean(user?.id && activePersonId) && (result === undefined || !current || Boolean(result?.data && !scoped)),
    error: current ? result?.error : null,
  };
}
