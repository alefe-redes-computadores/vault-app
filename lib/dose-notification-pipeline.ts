import type { DoseLog, Medicamento } from "@/lib/types";

/** V228: uma única fila para agenda programada e atrasos.
 * Um snapshot obsoleto não agenda atrasos depois de uma alteração ou troca de pessoa.
 * A etapa de atrasos continua funcionando se a etapa programada rejeitar.
 */
export type DoseNotificationSnapshot = {
  personId: string;
  medicamentos: Medicamento[];
  logs: DoseLog[];
};
export type DoseNotificationJob = (snapshot: DoseNotificationSnapshot) => Promise<unknown>;

export function createDoseNotificationPipeline(scheduled: DoseNotificationJob, overdue: DoseNotificationJob) {
  let revision = 0;
  let tail: Promise<void> = Promise.resolve();
  const enqueue = (snapshot: DoseNotificationSnapshot): Promise<{ skipped: boolean }> => {
    const current = ++revision;
    // Copiamos arrays para não observar uma lista mutada durante a espera na fila.
    const request = { ...snapshot, medicamentos: [...snapshot.medicamentos], logs: [...snapshot.logs] };
    const run = tail.then(async () => {
      if (current !== revision || !request.personId.trim()) return { skipped: true };
      const errors: unknown[] = [];
      try { await scheduled(request); } catch (error) { errors.push(error); }
      // Se a pessoa ou a rotina mudaram durante o await, a execução mais recente
      // cuidará dos atrasos; não agenda a janela obsoleta.
      if (current !== revision) {
        if (errors.length) throw errors[0];
        return { skipped: true };
      }
      try { await overdue(request); } catch (error) { errors.push(error); }
      if (errors.length) throw new AggregateError(errors, "Falha na reconciliação de doses");
      return { skipped: false };
    });
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
  /** Invalida snapshots enfileirados ao desmontar ou trocar a pessoa. */
  const invalidate = () => { revision += 1; };
  return { enqueue, invalidate };
}
