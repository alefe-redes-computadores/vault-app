// app/diagnostico/page.tsx
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
  UploadCloud,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase/client";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";

interface TableCheck {
  key: string;
  label: string;
  local: number | null;
  remote: number | null;
  error?: string;
}

const TABLES: { key: string; remoteKey: string; label: string }[] = [
  { key: "persons", remoteKey: "persons", label: "Pessoas" },
  { key: "medicos", remoteKey: "medicos", label: "Médicos" },
  { key: "hospitais", remoteKey: "hospitais", label: "Hospitais" },
  { key: "locais", remoteKey: "locais", label: "Locais/Postos" },
  { key: "farmacias", remoteKey: "farmacias", label: "Farmácias" },
  { key: "instituicoes", remoteKey: "instituicoes", label: "Instituições" },
  { key: "tratamentos", remoteKey: "tratamentos", label: "Tratamentos" },
  { key: "consultas", remoteKey: "consultas", label: "Consultas" },
  { key: "cirurgias", remoteKey: "cirurgias", label: "Cirurgias" },
  { key: "exames", remoteKey: "exames", label: "Exames" },
  { key: "medicamentos", remoteKey: "medicamentos", label: "Medicamentos" },
  { key: "renovacoes", remoteKey: "renovacoes", label: "Renovações" },
  { key: "doseLogs", remoteKey: "doseLogs", label: "Registro de Doses" },
  { key: "documents", remoteKey: "documents", label: "Documentos" },
  { key: "anexos_clinicos", remoteKey: "anexos_clinicos", label: "Anexos Clínicos" },
  { key: "credentials", remoteKey: "credentials", label: "Senhas e Acessos" },
  { key: "bankCards", remoteKey: "cards", label: "Contas e Cartões" },
  { key: "vaults", remoteKey: "vaults", label: "Cofres" },
];

export default function DiagnosticoPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [checks, setChecks] = useState<TableCheck[]>(
    TABLES.map((t) => ({ key: t.key, label: t.label, local: null, remote: null }))
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
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
        if (db && (db as any)[table.key]) {
          local = await (db as any)[table.key].where("user_id").equals(user.id).count();
        } else {
          error = "tabela local não encontrada";
        }
      } catch (err: any) {
        error = `local: ${err?.message || "erro"}`;
      }

      try {
        const { count, error: supError } = await supabase
          .from(table.remoteKey)
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

      results.push({ key: table.key, label: table.label, local, remote, error });
    }

    setChecks(results);
    setLastCheckedAt(new Date().toLocaleTimeString());
    setIsChecking(false);
    trigger("success");
  }, [user, trigger]);

  const forcePushAll = async () => {
    if (!user?.id) return;
    trigger("vibrate");
    setIsPushing(true);
    showToast("Enviando direto para a nuvem...", "info");

    let errorMsg = "";

    try {
      let count = 0;

      for (const table of TABLES) {
        if (db && (db as any)[table.key]) {
          const items = await (db as any)[table.key].toArray();

          if (items.length > 0) {
            // 🔥 A CORREÇÃO: Removemos o "synced" de todos os itens antes de forçar o envio
            const sanitizedItems = items.map((item: any) => {
              const { synced, ...rest } = item;
              return rest;
            });

            const { error } = await supabase.from(table.remoteKey).upsert(sanitizedItems);

            if (error) {
              errorMsg = `Tabela ${table.label}: ${error.message || error.details}`;
              break;
            } else {
              count += items.length;
              for (const item of items) {
                if (item.id) {
                  await (db as any)[table.key].update(item.id, { synced: true });
                }
              }
            }
          }
        }
      }

      if (errorMsg) {
        alert(`🚨 O Supabase bloqueou o envio!\n\nMotivo Exato:\n${errorMsg}`);
        showToast("Erro direto da nuvem", "error");
      } else {
        showToast(`Sucesso absoluto! ${count} itens subiram pra nuvem.`, "success");
        setTimeout(() => runCheck(), 1500);
      }
    } catch (error: any) {
      alert(`🚨 Erro Crítico: ${error?.message}`);
    } finally {
      setIsPushing(false);
    }
  };

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
          <div className="flex flex-col gap-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              onClick={runCheck}
              disabled={isChecking || isPushing || !user}
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

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              onClick={forcePushAll}
              disabled={isChecking || isPushing || !user}
              className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-violet-500/30 bg-violet-500/10 px-5 py-3.5 text-sm font-semibold text-violet-300 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isPushing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Conectando direto...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  Forçar Upload (Direto na Nuvem)
                </>
              )}
            </motion.button>
          </div>

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
              Use o botão <span className="font-semibold text-violet-300">Forçar Upload</span> para enviar os dados locais direto ao Supabase e alinhar a contagem com a nuvem.
            </p>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
