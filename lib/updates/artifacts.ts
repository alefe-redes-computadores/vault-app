/** M90: explicit GitHub Actions artifact evidence. A run timestamp is NOT an expiry date. */
export const VAULT_ARTIFACT_NAME = "Vault-App-debug";
export const VAULT_ARTIFACT_REPO = "alefe-redes-computadores/vault-app";
export type VaultTemporaryArtifact = {
  id: number;
  runId: number;
  size: number;
  expiresAt: string;
  expired: boolean;
};
export type VaultArtifactStatus = "unknown" | "available" | "expiring" | "expired";
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
const id = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;

/** No best-guess deadlines: requires a real expires_at from GitHub's artifact API. */
export function parseVaultTemporaryArtifact(input: unknown, expectedRunId: number): VaultTemporaryArtifact | null {
  if (!id(expectedRunId)) return null;
  const response = object(input);
  if (!response || !Array.isArray(response.artifacts)) return null;
  for (const entry of response.artifacts) {
    const record = object(entry);
    if (!record || record.name !== VAULT_ARTIFACT_NAME) continue;
    const artifactId = id(record.id);
    const size = id(record.size_in_bytes);
    const run = object(record.workflow_run);
    if (!artifactId || !size || !run || id(run.id) !== expectedRunId) continue;
    if (typeof record.expired !== "boolean" || typeof record.expires_at !== "string") continue;
    const expires = Date.parse(record.expires_at);
    if (!Number.isFinite(expires) || !/^\d{4}-\d\d-\d\dT/.test(record.expires_at)) continue;
    const expectedUrl = `https://api.github.com/repos/${VAULT_ARTIFACT_REPO}/actions/artifacts/${artifactId}/zip`;
    if (record.archive_download_url !== expectedUrl) continue;
    return { id: artifactId, runId: expectedRunId, size, expiresAt: record.expires_at, expired: record.expired };
  }
  return null;
}

export function getVaultTemporaryArtifactStatus(artifact: VaultTemporaryArtifact | null, now = Date.now()): VaultArtifactStatus {
  if (!artifact) return "unknown";
  if (artifact.expired || Date.parse(artifact.expiresAt) <= now) return "expired";
  if (Date.parse(artifact.expiresAt) - now <= 72 * 60 * 60 * 1000) return "expiring";
  return "available";
}

/** A reminder is relevant only for an older installed APK and the matching certified release. */
export function vaultArtifactReminderRelevant(
  installedBuild: number | null,
  certifiedBuild: number | null,
  runId: number | null,
  artifact: VaultTemporaryArtifact | null,
): boolean {
  return installedBuild !== null && certifiedBuild !== null && runId !== null &&
    installedBuild < certifiedBuild && artifact !== null && artifact.runId === runId;
}
