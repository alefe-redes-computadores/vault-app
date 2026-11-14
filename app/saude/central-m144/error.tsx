"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

/** M149: route-scoped recovery; never silently reroutes to Home or changes records. */
export default function CentralM144Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[100dvh] bg-void px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-8 text-ink-primary">
      <section className="mx-auto max-w-md rounded-2xl border border-amber-300/25 bg-surface p-5 shadow-lg" role="alert">
        <AlertTriangle size={22} className="text-amber-300" aria-hidden="true" />
        <h1 className="mt-3 font-display text-lg font-semibold">Não foi possível abrir esta área</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          A Central de Ocorrências encontrou um erro. Antes de registrar novamente, confira o Diário: uma tentativa anterior pode ter sido concluída.
          Você pode tentar abrir a Central novamente ou voltar para Minha Saúde.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={reset}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-200">
            <RefreshCcw size={16} aria-hidden="true" />Tentar novamente
          </button>
          <Link href="/saude/minha-saude" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm font-semibold text-ink-secondary">
            <ArrowLeft size={16} aria-hidden="true" />Minha Saúde
          </Link>
        </div>
      </section>
    </main>
  );
}
