"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("VAULT_ROUTE_ERROR", { name: error.name, message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-void px-5 py-12">
      <section role="alert" className="w-full max-w-md rounded-[28px] border border-coral/25 bg-surface p-5 shadow-xl">
        <span className="grid size-11 place-items-center rounded-2xl bg-coral/10 text-coral"><AlertTriangle size={21}/></span>
        <h1 className="mt-4 text-lg font-bold text-ink-primary">Esta tela encontrou um estado inconsistente</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">Se uma atualização do PWA aconteceu durante a navegação, tente reconstruir a tela. Seus registros locais não são apagados.</p>
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={reset} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 text-sm font-bold text-void"><RefreshCw size={17}/>Tentar novamente</button>
          <button type="button" onClick={()=>window.location.reload()} className="min-h-11 rounded-2xl border border-surface-border px-4 text-xs font-semibold text-ink-secondary">Recarregar a versão atual</button>
        </div>
        {error.digest?<p className="mt-3 font-mono text-[9px] text-ink-faint">Referência {error.digest}</p>:null}
      </section>
    </main>
  );
}
