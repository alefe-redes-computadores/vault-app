/** M117: a single, non-clinical update destination for notifications and the Home. */
export const VAULT_UPDATE_DESTINATION_M117 = "/mais#vault-updates" as const;
export const VAULT_UPDATE_FRAGMENT_M117 = "#vault-updates" as const;
export const VAULT_UPDATE_IGNORE_KEY_M117 = "vault:update:home-dismissed-build:m117:v1" as const;

export type UpdatePromptSnapshotM117 = {
  runtime: string;
  phase: string;
  decision: string;
  installedBuild: number | null;
  release: { build: number } | null;
};
export function shouldShowUpdatePromptM117(snapshot: UpdatePromptSnapshotM117, ignoredBuild: number | null): boolean {
  const build = snapshot.release?.build;
  return snapshot.runtime === "android" && snapshot.phase === "ready" && snapshot.decision === "available" &&
    typeof build === "number" && Number.isSafeInteger(build) && build > 0 &&
    typeof snapshot.installedBuild === "number" && build > snapshot.installedBuild && build !== ignoredBuild;
}
export function readIgnoredUpdateBuildM117(storage: Pick<Storage, "getItem"> | null): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(VAULT_UPDATE_IGNORE_KEY_M117);
    if (!raw || !/^[1-9]\d{0,9}$/.test(raw)) return null;
    const build = Number(raw);
    return Number.isSafeInteger(build) ? build : null;
  } catch { return null; }
}
export function ignoreUpdateBuildM117(storage: Pick<Storage,"setItem"> | null, build: number): void {
  if (!storage || !Number.isSafeInteger(build) || build < 1) return;
  try { storage.setItem(VAULT_UPDATE_IGNORE_KEY_M117, String(build)); } catch { /* Optional UX; never blocks care. */ }
}
