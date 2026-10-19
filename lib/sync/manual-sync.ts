import { setVaultSyncRuntime, type VaultSyncRuntimeState } from "./runtime-status";

export interface ManualSyncQueueResult {
  remaining: number;
  permanentlyFailed: number;
  offline?: boolean;
  fatalError?: string | null;
}

export interface ManualSyncResult<T extends ManualSyncQueueResult = ManualSyncQueueResult> {
  queue: T;
  phase: VaultSyncRuntimeState["phase"];
  error: string | null;
}

/**
 * Single visual authority for user-triggered pull + push operations.
 * It does not delete, reconcile or mutate clinical payloads; the supplied
 * pull and queue processor remain the data authorities.
 */
export async function runManualVaultSync<T extends ManualSyncQueueResult>({
  pull,
  push,
  pullIssue,
}: {
  pull: () => Promise<void>;
  push: () => Promise<T>;
  pullIssue?: () => string | null;
}): Promise<ManualSyncResult<T>> {
  setVaultSyncRuntime({ phase: "pulling", error: null });
  try {
    await pull();
    const detectedPullIssue = pullIssue?.() || null;
    setVaultSyncRuntime({ phase: "pushing", error: null });
    const queue = await push();
    const error = detectedPullIssue || queue.fatalError ||
      (queue.permanentlyFailed > 0 ? "Há itens que precisam de revisão na sincronização." : null);
    const phase: VaultSyncRuntimeState["phase"] = error
      ? "error"
      : queue.offline || queue.remaining > 0
        ? "idle"
        : "synced";
    setVaultSyncRuntime({ phase, error });
    return { queue, phase, error };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Não foi possível concluir a sincronização.";
    setVaultSyncRuntime({ phase: "error", error });
    throw cause;
  }
}
