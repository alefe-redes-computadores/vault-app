"use client";
// VAULT_SYNC_DIAGNOSTICS_V68
// Diagnóstico estritamente local: não envia conteúdo clínico, IDs ou payloads.

export interface VaultPullMetric {
  table: string;
  durationMs: number;
  ok: boolean;
  at: string;
}

export interface VaultPullRun {
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  tables: VaultPullMetric[];
}

const KEY = "vault_sync_diagnostics_v68";
const MAX_TABLE_METRICS = 80;

function read(): VaultPullRun {
  if (typeof window === "undefined") {
    return { startedAt: "", finishedAt: null, durationMs: null, tables: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { startedAt: "", finishedAt: null, durationMs: null, tables: [] };
    const parsed = JSON.parse(raw) as VaultPullRun;
    return {
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : "",
      finishedAt: typeof parsed.finishedAt === "string" ? parsed.finishedAt : null,
      durationMs: typeof parsed.durationMs === "number" ? parsed.durationMs : null,
      tables: Array.isArray(parsed.tables) ? parsed.tables.slice(-MAX_TABLE_METRICS) : [],
    };
  } catch {
    return { startedAt: "", finishedAt: null, durationMs: null, tables: [] };
  }
}

function write(value: VaultPullRun) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("vault:sync-diagnostics"));
  } catch {}
}

export function beginPullDiagnostics() {
  write({
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    tables: [],
  });
}

export function recordPullTable(table: string, durationMs: number, ok: boolean) {
  const current = read();
  write({
    ...current,
    tables: [
      ...current.tables,
      {
        table,
        durationMs: Math.max(0, Math.round(durationMs)),
        ok,
        at: new Date().toISOString(),
      },
    ].slice(-MAX_TABLE_METRICS),
  });
}

export function finishPullDiagnostics() {
  const current = read();
  const finishedAt = new Date().toISOString();
  const started = Date.parse(current.startedAt);
  const finished = Date.parse(finishedAt);
  write({
    ...current,
    finishedAt,
    durationMs:
      Number.isFinite(started) && Number.isFinite(finished)
        ? Math.max(0, finished - started)
        : null,
  });
}

export function getPullDiagnostics(): VaultPullRun {
  return read();
}

export function clearPullDiagnostics() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("vault:sync-diagnostics"));
  } catch {}
}
