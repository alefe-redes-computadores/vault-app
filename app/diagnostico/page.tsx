"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Smartphone,
  Cloud,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";

interface TableCheck {
  key: string;
  label: string;
  local: number | null;
  remote: number | null;
  error?: string;
}

const TABLES: { key: string; label: string }[] = [
  { key: "persons", label: "Pessoas" },
  { key: "documents", label: "Documentos" },
  { key: "medicamentos", label: "Medicamentos" },
  { key: "renovacoes", label: "Renovações" },
  { key: "medicos", label: "Médicos" },
  { key: "farmacias", label: "Farmácias" },
  { key: "hospitais", label: "Hospitais" },
  { key: "vaults", label: "Cofres" },
];

export default function DiagnosticoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();

  const [checks, setChecks] = useState<TableCheck[]>(
    TABLES.map((t) => ({ ...t, local: null, remote: null }))
  );
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    if (!user?.id) return;
    trigger("vibrate");
    setIsChecking(true);

    const results: TableCheck[] = [];

    for (const table of TABLES) {
      let local: number | null = null;
      let remote: number | null = null;
      let error: string | undefined;

      try {
        local = await (db as any)[table.key].where("user_id").equals(user.id).count();
      } catch (err: any) {
        error = `local: ${err?.message || "erro"}`;
      }

      try {
        const { count, error: supError } = await supabase
          .from(table.key)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (supError) {
          error = `${error ? error + " · " : ""}nuvem: ${supError.message}`;
        } else {
          remote = count ?? 0;
        }
      } catch (err: any) {
        error = `${error ? error + " · " : ""}nuvem: ${err?.message || "erro"}`;
      }

      results.push({ ...table, local, remote, error });
    }

    setChecks(results);
    setLastCheckedAt(new Date().toLocaleTimeString());
    setIsChecking(false);
    trigger("success");
  }, [user, trigger]);

  const statusFor = (check: TableCheck): "ok" | "mismatch" | "unknown" => {
    if (check.local === null || check.remote === null) return "unknown";
    return check.local === check.remote ? "ok" : "mismatch";
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Diagnóstico de dados
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Compara o que está no aparelho com o que está na nuvem.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            onClick={runCheck}
            disabled={isChecking || !user}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-ice px-5 py-3.5 text-sm font-semibold text-void shadow-lg shadow-ice/15 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Verificar agora
              </>
            )}
          </motion.button>

          {lastCheckedAt && (
            <p className="text-center text-xs text-ink-faint">
              Última verificação: {lastCheckedAt}
            </p>
          )}

          <div className="flex items-center gap-4 px-1 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <Smartphone size={13} />
              Aparelho
            </div>
            <div className="flex items-center gap-1.5">
              <Cloud size={13} />
              Nuvem
            </div>
          </div>

          <div className="space-y-2.5">
            {checks.map((check, index) => {
              const status = statusFor(check);
              const icon =
                status === "ok" ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : status === "mismatch" ? (
                  <AlertTriangle size={18} className="text-coral" />
                ) : (
                  <HelpCircle size={18} className="text-ink-faint" />
                );

              return (
                <motion.div
                  key={check.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.24) }}
                  className={`flex items-center gap-3 rounded-[22px] border bg-surface p-3.5 shadow-sm ${
                    status === "mismatch" ? "border-coral/30" : "border-surface-border/50"
                  }`}
                >
                  <div className="shrink-0">{icon}</div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-primary">{check.label}</p>
                    {check.error && (
                      <p className="mt-0.5 truncate text-[11px] text-coral/80">{check.error}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="font-mono text-ink-primary">
                      {check.local === null ? "—" : check.local}
                    </span>
                    <span className="text-ink-faint">/</span>
                    <span className="font-mono text-ink-primary">
                      {check.remote === null ? "—" : check.remote}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="rounded-[22px] border border-surface-border/40 bg-surface/50 px-4 py-3.5">
            <p className="text-xs leading-5 text-ink-muted">
              <span className="font-semibold text-ink-primary">Aparelho / Nuvem</span> — se os
              números baterem, está tudo sincronizado. Se o aparelho tiver mais que a nuvem,
              use "Sincronizar agora" em Mais. Se a nuvem tiver mais que o aparelho, é sinal de
              que o pull não trouxe tudo ainda — tente sincronizar de novo ou reinstale o app
              pra testar a recuperação completa.
            </p>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}