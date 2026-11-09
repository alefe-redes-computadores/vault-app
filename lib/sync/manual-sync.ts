import { setVaultSyncRuntime, type VaultSyncRuntimeState } from "./runtime-status";

// A second manual action for the same account joins the in-flight operation.
// A different account must not inherit the first account's result.
const activeManualSyncs = new Map<string, Promise<ManualSyncResult<ManualSyncQueueResult>>>();

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
  ownerId,
  coordinatePull,
}: {
  pull: () => Promise<void>;
  push: () => Promise<T>;
  pullIssue?: () => string | null;
  ownerId?: string;
  coordinatePull?: (task: () => Promise<void>) => Promise<void>;
}): Promise<ManualSyncResult<T>> {
  const owner = typeof ownerId === "string" ? ownerId.trim() : "";
  if (owner) {
    const current = activeManualSyncs.get(owner);
    if (current) return current as Promise<ManualSyncResult<T>>;
    if (activeManualSyncs.size) return Promise.reject(new Error("Outra conta possui sincronização manual em andamento."));
  }
  const execute = async (): Promise<ManualSyncResult<T>> => {
  setVaultSyncRuntime({ phase: "pulling", error: null }, owner || undefined);
  try {
    await (coordinatePull ? coordinatePull(pull) : pull());
    const detectedPullIssue = pullIssue?.() || null;
    setVaultSyncRuntime({ phase: "pushing", error: null }, owner || undefined);
    const queue = await push();
    const error = detectedPullIssue || queue.fatalError ||
      (queue.permanentlyFailed > 0 ? "Há itens que precisam de revisão na sincronização." : null);
    const phase: VaultSyncRuntimeState["phase"] = error
      ? "error"
      : queue.offline || queue.remaining > 0
        ? "idle"
        : "synced";
    setVaultSyncRuntime({ phase, error }, owner || undefined);
    return { queue, phase, error };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : "Não foi possível concluir a sincronização.";
    setVaultSyncRuntime({ phase: "error", error }, owner || undefined);
    throw cause;
  }
  };
  const operation = execute();
  if (owner) {
    const stored = operation as Promise<ManualSyncResult<ManualSyncQueueResult>>;
    activeManualSyncs.set(owner, stored);
    void operation.then(
      () => { if (activeManualSyncs.get(owner) === stored) activeManualSyncs.delete(owner); },
      () => { if (activeManualSyncs.get(owner) === stored) activeManualSyncs.delete(owner); },
    );
  }
  return operation;
}
