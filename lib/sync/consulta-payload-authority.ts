// lib/sync/consulta-payload-authority.ts
import type { Consulta } from "@/lib/types";

type ConsultaSyncCandidate = Partial<Consulta> & { id?: string };

const requiredText = (value: unknown, label: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`Consulta sem ${label}.`);
  return normalized;
};

/**
 * Reconstrói um payload completo de consulta a partir da autoridade local.
 * A fila pode conter updates parciais legados, mas nunca pode trocar conta,
 * pessoa ou identidade silenciosamente.
 */
export function resolveConsultaSyncPayloadP0(
  queued: ConsultaSyncCandidate,
  local: Consulta | undefined,
): Consulta {
  const id = requiredText(queued.id, "id");
  if (!local) throw new Error(`Consulta ${id} não encontrada no aparelho para reconciliar a fila.`);
  if (local.id !== id) throw new Error(`Consulta ${id} diverge do registro local.`);

  const localUserId = requiredText(local.user_id, "user_id");
  const localPersonId = requiredText(local.person_id, "person_id");
  const queuedUserId = typeof queued.user_id === "string" ? queued.user_id.trim() : "";
  const queuedPersonId = typeof queued.person_id === "string" ? queued.person_id.trim() : "";

  if (queuedUserId && queuedUserId !== localUserId)
    throw new Error(`Consulta ${id} pertence a outra conta na fila local.`);
  if (queuedPersonId && queuedPersonId !== localPersonId)
    throw new Error(`Consulta ${id} pertence a outra pessoa na fila local.`);

  return {
    ...local,
    ...queued,
    id,
    user_id: localUserId,
    person_id: localPersonId,
    created_at: local.created_at,
  } as Consulta;
}
