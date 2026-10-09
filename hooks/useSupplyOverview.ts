"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "./useAuth";
import { useActivePersonId } from "./useActivePersonId";
import { getSupplyOverview } from "@/lib/repositories/healthSupplyOverview";
export function useSupplyOverview() {
  const { user } = useAuth(),
    { activePersonId } = useActivePersonId();
  const result = useLiveQuery(async () => {
    if (!user?.id || !activePersonId) return null;
    return getSupplyOverview(user.id, activePersonId);
  }, [activePersonId, user?.id]);
  return result;
}
