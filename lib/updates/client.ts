"use client";
import { App } from "@capacitor/app";
import { isVaultAndroid } from "@/lib/native-runtime";
import { APP_VERSION } from "@/lib/app-version";
import { parseVaultTemporaryArtifact, type VaultTemporaryArtifact } from "./artifacts";
import {
  VAULT_RELEASE_API, VAULT_RUN_API, parseVaultApprovedRelease, parseVaultWorkflowRun,
  getVaultUpdateDecision, getVaultLatestRunWarning,
  type VaultApprovedRelease, type VaultWorkflowRun,
} from "./release-registry";

export type VaultUpdateSnapshot = {
  phase: "idle" | "checking" | "ready" | "error";
  runtime: "android" | "web";
  installedVersion: string;
  installedBuild: number | null;
  release: VaultApprovedRelease | null;
  run: VaultWorkflowRun | null;
  artifact: VaultTemporaryArtifact | null;
  decision: ReturnType<typeof getVaultUpdateDecision> | "web";
  newestRunWarning: ReturnType<typeof getVaultLatestRunWarning>;
  checkedAt: string | null;
  errorCode: string | null;
};
const EMPTY: VaultUpdateSnapshot = {
  phase: "idle", runtime: "web", installedVersion: APP_VERSION, installedBuild: null,
  release: null, run: null, artifact: null, decision: "web", newestRunWarning: null, checkedAt: null, errorCode: null,
};
let state: VaultUpdateSnapshot = EMPTY;
let lastRequestMs = 0;
let pending: Promise<VaultUpdateSnapshot> | null = null;
const listeners = new Set<() => void>();
const SIX_HOURS = 6 * 60 * 60 * 1000;
function publish(patch: Partial<VaultUpdateSnapshot>) {
  state = {...state, ...patch};
  for (const notify of listeners) notify();
}
export function subscribeVaultUpdates(notify: () => void): () => void {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}
export function getVaultUpdateSnapshot(): VaultUpdateSnapshot { return state; }
export function getVaultUpdateServerSnapshot(): VaultUpdateSnapshot { return EMPTY; }

async function githubJson(url: string, allow404 = false, timeoutMs = 12000): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store", signal: controller.signal,
    });
    if (allow404 && result.status === 404) return null;
    if (!result.ok) throw new Error(result.status === 403 || result.status === 429
      ? "VAULT-UPD-RATE-LIMIT" : `VAULT-UPD-HTTP-${result.status}`);
    return await result.json();
  } finally { window.clearTimeout(timeout); }
}
async function getInstalled() {
  if (!isVaultAndroid()) return {runtime: "web" as const, version: APP_VERSION, build: null};
  try {
    const info = await App.getInfo();
    const parsed = Number(info.build);
    return {
      runtime: "android" as const,
      version: info.version || APP_VERSION,
      build: Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null,
    };
  } catch {
    return {runtime: "android" as const, version: APP_VERSION, build: null};
  }
}

/** Shares a single request between the global observer and the Mais screen. */
export function checkVaultUpdates(force = false): Promise<VaultUpdateSnapshot> {
  if (pending) return pending;
  if (!force && state.phase === "ready" && Date.now() - lastRequestMs < SIX_HOURS) return Promise.resolve(state);
  if (typeof window === "undefined") return Promise.resolve(state);
  publish({phase:"checking", errorCode:null});
  pending = (async () => {
    const installed = await getInstalled();
    try {
      if (navigator.onLine === false) throw new Error("VAULT-UPD-OFFLINE");
      const [rawRelease, rawRun] = await Promise.all([
        githubJson(VAULT_RELEASE_API, true),
        githubJson(VAULT_RUN_API, true).catch(() => null),
      ]);
      // An invalid release is never interpreted as an approved APK.
      const release = parseVaultApprovedRelease(rawRelease);
      if (rawRelease !== null && !release) throw new Error("VAULT-UPD-MANIFEST");
      const run = parseVaultWorkflowRun(rawRun);
      // The temporary Actions artifact is informational only. Failure to read it must
      // never hide a valid GitHub Release or turn an unapproved run into a download.
      const rawArtifact = run && run.status === "completed" && run.conclusion === "success"
        ? await githubJson(`https://api.github.com/repos/alefe-redes-computadores/vault-app/actions/runs/${run.id}/artifacts`, true, 3500).catch(() => null)
        : null;
      const artifact = run && rawArtifact !== null ? parseVaultTemporaryArtifact(rawArtifact, run.id) : null;
      const decision = installed.runtime === "web" ? "web" : getVaultUpdateDecision(installed.build, release, run);
      publish({phase:"ready", runtime:installed.runtime, installedVersion:installed.version,
        installedBuild:installed.build, release, run, artifact, decision,
        newestRunWarning:getVaultLatestRunWarning(release,run),
        checkedAt:new Date().toISOString(), errorCode:null});
      lastRequestMs = Date.now();
    } catch (error) {
      const code = error instanceof Error && /^VAULT-UPD-[A-Z0-9-]+$/.test(error.message)
        ? error.message : "VAULT-UPD-NETWORK";
      // Fail closed: don't present a previously cached URL as currently checked.
      publish({phase:"error", runtime:installed.runtime, installedVersion:installed.version,
        installedBuild:installed.build, release:null, run:null, artifact:null, decision:"unavailable",
        newestRunWarning:null, errorCode:code, checkedAt:new Date().toISOString()});
    }
    return state;
  })().finally(() => { pending = null; });
  return pending;
}
