"use client";
import { useEffect, useRef, useState } from "react";
import { Cloud, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { inspectDeviceDoses, type DeviceDoseAudit } from "@/lib/sync/p13-device-audit";

/** Central passiva. Abrir esta seção não gera download nem gravações. */
export function P13DeviceDoseAudit() {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const [state, setState] = useState<DeviceDoseAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    generation.current++;
    setState(null);
    setError(null);
    setBusy(false);
  }, [user?.id, activePersonId]);

  async function check() {
    if (!user?.id || !activePersonId || busy) return;
    const current = ++generation.current;
    setBusy(true);
    setError(null);
    setState(null);
    try {
      const result = await inspectDeviceDoses(user.id, activePersonId);
      if (current === generation.current) setState(result);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Conferência indisponível.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  const metrics: Array<[string, number, string]> = state ? [
    ["Neste aparelho", state.local, "text-ink-primary"],
    ["Na nuvem", state.cloud, "text-ink-primary"],
    ["Faltando aqui", state.onlyCloud, "text-ice"],
    ["Somente aqui", state.onlyLocal, "text-amber-300"],
    ["Diferentes", state.divergent, "text-coral"],
    ["Pendentes locais", state.pendingLocal, "text-amber-300"],
  ] : [];

  return (
    <section aria-label="Auditoria de doses entre dispositivos" className="mx-auto mt-4 max-w-2xl rounded-[22px] border border-ice/25 bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ice/10 text-ice"><Cloud size={20}/></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink-primary">Doses entre aparelhos</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">Confira os últimos 14 dias da pessoa ativa no PWA, APK e nuvem. Esta auditoria é somente leitura: não apaga, reenfileira, sobrescreve doses nem altera estoque.</p>
        </div>
      </div>
      {!activePersonId || !user?.id ? <p className="mt-3 text-xs text-amber-300">Selecione uma pessoa e entre na sua conta.</p> : null}
      <button type="button" onClick={() => void check()} disabled={!user?.id || !activePersonId || busy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ice/40 bg-ice/10 px-3 text-sm font-semibold text-ice disabled:opacity-40">
        <RefreshCw size={17} className={busy ? "animate-spin" : ""}/>{busy ? "Conferindo os registros…" : "Comparar doses com a nuvem"}
      </button>
      {error ? <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-coral"><TriangleAlert size={16} className="shrink-0"/>{error}</p> : null}
      {state && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metrics.map(([label, value, tone]) => <div key={label} className="rounded-xl border border-surface-border/40 bg-void/45 px-3 py-2.5"><strong className={`font-mono text-lg ${tone}`}>{value}</strong><p className="text-[10px] text-ink-muted">{label}</p></div>)}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-muted"><ShieldCheck size={16} className="shrink-0 text-emerald-300"/>
            {state.onlyCloud || state.onlyLocal || state.divergent || state.pendingLocal
              ? "Existem registros que precisam de sincronização ou revisão. Nada foi alterado automaticamente; utilize a sincronização oficial e confira novamente."
              : "Nenhuma diferença encontrada nos últimos 14 dias desta pessoa."}
          </p>
          <p className="mt-1 text-[10px] text-ink-faint">Conferido em {new Date(state.checkedAt).toLocaleString("pt-BR")}. Uma fila vazia não garante que outro aparelho tenha enviado seus registros.</p>
        </div>
      )}
    </section>
  );
}
