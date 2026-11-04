import type { DoseLog, Medicamento } from "@/lib/types";

/** V228: uma única fila para agenda programada e atrasos.
 * Um snapshot obsoleto não agenda atrasos depois de uma alteração ou troca de pessoa.
 * A etapa de atrasos continua funcionando se a etapa programada rejeitar.
 */
export type DoseNotificationSnapshot = {
  personId: string;
  medicamentos: Medicamento[];
  logs: DoseLog[];
  /** A preference change forces reconciliation even when clinical rows are unchanged. */
  refreshKey?: number;
  userId?: string;
};
export type DoseNotificationJob = (snapshot: DoseNotificationSnapshot) => Promise<unknown>;

export function createDoseNotificationPipeline(scheduled: DoseNotificationJob, overdue: DoseNotificationJob) {
  let revision = 0;
  let tail: Promise<void> = Promise.resolve();
  let completedFingerprint: string | null = null;
  let pendingFingerprint: string | null = null;
  let pendingPromise: Promise<{ skipped: boolean }> | null = null;
  const enqueue = (snapshot: DoseNotificationSnapshot): Promise<{ skipped: boolean }> => {
    // Full snapshot, not a partial clinical signature: no legitimate change is lost.
    // A circular/non-serializable snapshot falls back to the original pipeline.
    let fingerprint: string | null = null;
    try { fingerprint = JSON.stringify([snapshot.userId, snapshot.personId, snapshot.refreshKey, snapshot.medicamentos, snapshot.logs]); }
    catch { /* execute unconditionally */ }
    if (fingerprint !== null && fingerprint === pendingFingerprint && pendingPromise) return pendingPromise;
    if (fingerprint !== null && fingerprint === completedFingerprint && !pendingPromise) return Promise.resolve({ skipped: true });
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
      if (current === revision) completedFingerprint = fingerprint;
      return { skipped: false };
    });
    tail = run.then(() => undefined, () => undefined);
    pendingFingerprint = fingerprint;
    pendingPromise = run;
    void run.then(() => {
      if (pendingPromise === run) { pendingPromise = null; pendingFingerprint = null; }
    }, () => {
      if (pendingPromise === run) { pendingPromise = null; pendingFingerprint = null; }
    });
    return run;
  };
  /** Invalida snapshots enfileirados ao desmontar ou trocar a pessoa. */
  const invalidate = () => { revision += 1; completedFingerprint = null; pendingFingerprint = null; pendingPromise = null; };
  return { enqueue, invalidate };
}
