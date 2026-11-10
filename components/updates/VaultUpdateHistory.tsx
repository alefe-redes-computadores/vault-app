"use client";

import { useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { ChevronDown, Clock3, ExternalLink, Loader2 } from "lucide-react";
import { parseVaultApprovedRelease, type VaultApprovedRelease, VAULT_REPO } from "@/lib/updates/release-registry";

type Phase = "idle" | "loading" | "ready" | "error";
/** Public GitHub releases only; no authentication, no clinical data, no background polling. */
export function VaultUpdateHistory() {
  const [opened, setOpened] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<VaultApprovedRelease[]>([]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    const fetchHistory = async () => {
      setPhase("loading");
      try {
        const response = await fetch(`https://api.github.com/repos/${VAULT_REPO}/releases?per_page=8`, {
          headers: {Accept:"application/vnd.github+json"}, cache:"no-store", signal:controller.signal,
        });
        if (!response.ok) throw new Error("Histórico indisponível");
        const raw: unknown = await response.json();
        if (!Array.isArray(raw)) throw new Error("Resposta inesperada");
        if (!controller.signal.aborted) {
          setRows(raw.map(parseVaultApprovedRelease).filter((item): item is VaultApprovedRelease => item !== null).slice(0,8));
          setPhase("ready");
        }
      } catch { if (!controller.signal.aborted) setPhase("error"); }
    };
    void fetchHistory();
    return () => controller.abort();
  }, [opened, retry]);
  return <details className="mt-3 rounded-xl border border-surface-border/50 bg-surface-raised/30" onToggle={event => setOpened(event.currentTarget.open)}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><span className="flex items-center gap-2"><Clock3 size={15}/> Histórico de versões e changelog</span><ChevronDown size={15} className="text-ink-muted"/></summary>
    <div className="space-y-2 border-t border-surface-border/40 p-3">
      {phase === "loading" && <p role="status" className="flex items-center gap-2 text-xs text-ink-muted"><Loader2 size={14} className="animate-spin"/>Consultando versões certificadas…</p>}
      {phase === "error" && <button type="button" className="min-h-11 text-xs text-amber-200" onClick={() => setRetry(value => value + 1)}>Não foi possível consultar. Tentar novamente.</button>}
      {phase === "ready" && rows.length === 0 && <p className="text-xs text-ink-muted">Nenhuma versão certificada identificada.</p>}
      {rows.map(release => <div key={release.tag} className="rounded-xl border border-surface-border/40 bg-surface p-2.5">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs text-ink-primary">v{release.version} · Build {release.build}</strong><button type="button" onClick={() => void Browser.open({url:release.releaseUrl})} className="flex min-h-10 items-center gap-1 text-[11px] font-semibold text-ice"><ExternalLink size={13}/> Release</button></div>
        <p className="text-[10px] text-ink-muted">{new Date(release.publishedAt).toLocaleDateString("pt-BR")}</p>
        {release.highlights.map((note,index) => <p key={index} className="mt-1 text-[11px] leading-snug text-ink-secondary">• {note}</p>)}
      </div>)}
    </div>
  </details>;
}
