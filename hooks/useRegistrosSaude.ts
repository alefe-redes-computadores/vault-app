// hooks/useRegistrosSaude.ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { registrosSaudeRepository } from "@/lib/repositories/registrosSaude";

export function useRegistrosSaude() {
  const { activePersonId } = useActivePersonId();

  const registros = useLiveQuery(async () => {
    const all = await db.registros_saude.orderBy("data").reverse().toArray();
    if (!activePersonId) return all;
    return all.filter((r) => !r.person_id || r.person_id === activePersonId);
  }, [activePersonId]);

  return {
    registros: registros || [],
    isLoading: registros === undefined,
    createRegistro: registrosSaudeRepository.create,
    updateRegistro: registrosSaudeRepository.update,
    deleteRegistro: registrosSaudeRepository.delete,
  };
}
