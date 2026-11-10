/** VAULT M87: only a published, non-draft GitHub Release with a real APK can be offered. */
export const VAULT_REPO = "alefe-redes-computadores/vault-app";
export const VAULT_RELEASE_API = `https://api.github.com/repos/${VAULT_REPO}/releases/latest`;
export const VAULT_RUN_API = `https://api.github.com/repos/${VAULT_REPO}/actions/workflows/build-android.yml/runs?branch=main&per_page=1`;

export type VaultApprovedRelease = {
  tag: string;
  build: number;
  version: string;
  commit: string;
  checksum: string;
  /** Present on releases built with the M111 native contract. */
  appId?: string | null;
  signerSha256?: string | null;
  apkUrl: string;
  releaseUrl: string;
  publishedAt: string;
  bytes: number;
  highlights: string[];
};
export type VaultWorkflowRun = {
  id: number;
  number: number;
  status: string;
  conclusion: string | null;
  sha: string;
  url: string;
};
const obj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const text = (v: unknown): string => typeof v === "string" ? v.trim() : "";
const posInt = (v: unknown): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
const validSha = (v: string) => /^[0-9a-f]{40}$/i.test(v);
const validSha256 = (v: string) => /^[0-9a-f]{64}$/i.test(v);

/** Intentionally strict: don't accept Actions artifacts, external hosts, PR builds or pre-releases. */
export function parseVaultApprovedRelease(raw: unknown): VaultApprovedRelease | null {
  const r = obj(raw);
  if (!r || r.draft !== false || r.prerelease !== false) return null;
  const tag = text(r.tag_name);
  const match = /^vault-android-b([1-9]\d{0,9})$/.exec(tag);
  if (!match) return null;
  const build = Number(match[1]);
  if (!Number.isSafeInteger(build)) return null;
  const assets = Array.isArray(r.assets) ? r.assets : [];
  const apk = assets.map(obj).find(a => a?.name === "Vault-App.apk");
  if (!apk) return null;
  const apkUrl = text(apk.browser_download_url);
  const releaseUrl = text(r.html_url);
  const expectedApkUrl = `https://github.com/${VAULT_REPO}/releases/download/${tag}/Vault-App.apk`;
  if (apkUrl !== expectedApkUrl || releaseUrl !== `https://github.com/${VAULT_REPO}/releases/tag/${tag}`) return null;
  const bytes = posInt(apk.size);
  if (!bytes || bytes < 100_000) return null;
  const body = text(r.body);
  const field = (name: string): string => {
    const m = new RegExp(`^${name}=([^\\r\\n]+)$`, "m").exec(body);
    return m ? m[1].trim() : "";
  };
  const version = field("VAULT_VERSION");
  const commit = field("VAULT_COMMIT");
  const checksum = field("VAULT_APK_SHA256");
  const appId = field("VAULT_APP_ID");
  const signerSha256 = field("VAULT_CERT_SHA256");
  // Older certified releases remain visible; only M111 metadata enables native installation.
  if ((appId && appId !== "com.alefejohsefe.vault") || (signerSha256 && !validSha256(signerSha256))) return null;
  if (!/^\d+\.\d+\.\d+$/.test(version) || !validSha(commit) || !validSha256(checksum)) return null;
  if (field("VAULT_BUILD") !== String(build)) return null;
  if (text(r.target_commitish) !== commit) return null;
  const digest = text(apk.digest);
  if (digest && digest !== `sha256:${checksum}`) return null;
  const publishedAt = text(r.published_at);
  if (!publishedAt || !Number.isFinite(Date.parse(publishedAt))) return null;
  const newSection = body.split(/^## Novidades\s*$/m)[1] || "";
  const highlights = newSection.split(/^## /m)[0].split(/\r?\n/)
    .filter(line => /^- /u.test(line)).map(line => line.slice(2).trim())
    .filter(Boolean).slice(0, 4).map(item => item.slice(0, 160));
  return {tag, build, version, commit, checksum: checksum.toLowerCase(),
    appId: appId || null, signerSha256: signerSha256 ? signerSha256.toLowerCase() : null,
    apkUrl, releaseUrl, publishedAt, bytes, highlights};
}

export function parseVaultWorkflowRun(raw: unknown): VaultWorkflowRun | null {
  const root = obj(raw);
  const list = root && Array.isArray(root.workflow_runs) ? root.workflow_runs : [];
  const first = obj(list[0]);
  if (!first) return null;
  const id = posInt(first.id), number = posInt(first.run_number);
  const url = text(first.html_url), sha = text(first.head_sha);
  if (!id || !number || !validSha(sha) || url !== `https://github.com/${VAULT_REPO}/actions/runs/${id}`) return null;
  const status = text(first.status);
  const conclusion = first.conclusion === null ? null : text(first.conclusion);
  if (!["queued","in_progress","completed","waiting","requested","pending"].includes(status)) return null;
  return {id, number, status, conclusion, sha, url};
}

export function getVaultUpdateDecision(installedBuild: number | null, release: VaultApprovedRelease | null,
  run: VaultWorkflowRun | null): "available" | "current" | "preparing" | "failed" | "unavailable" | "unknown_installed" {
  if (release && installedBuild === null) return "unknown_installed";
  if (release && installedBuild !== null) return release.build > installedBuild ? "available" : "current";
  if (run && run.status !== "completed") return "preparing";
  if (run && run.conclusion === "failure") return "failed";
  return "unavailable";
}

export function getVaultLatestRunWarning(release: VaultApprovedRelease | null, run: VaultWorkflowRun | null):
  "failed" | "preparing" | null {
  if (!run || (release && run.number <= release.build)) return null;
  if (run.status !== "completed") return "preparing";
  return run.conclusion === "failure" || run.conclusion === "cancelled" || run.conclusion === "timed_out" ? "failed" : null;
}
