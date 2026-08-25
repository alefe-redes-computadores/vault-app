// app/diagnostico/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Database,
  ListFilter,
  Trash2,
  PlayCircle,
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
  { key: "doseLogs", remoteKey: "dose_logs", label: "Registro de Doses" },
  { key: "registros_saude", remoteKey: "registros_saude", label: "Sintomas e Medições" },
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

  // Abas: 'auditoria' | 'fila'
  const [activeTab, setActiveTab] = useState<"auditoria" | "fila">("fila");

  const [checks, setChecks] = useState<TableCheck[]>(
    TABLES.map((t) => ({ key: t.key, label: t.label, local: null, remote: null }))
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  // Estado da Fila Local
  const [queueItems, setQueueItems] = useState<any[]>([]);

  // Carrega os itens da fila local
  const loadQueue = useCallback(async () => {
    try {
      if (db && db.syncQueue) {
        const items = await db.syncQueue.toArray();
        setQueueItems(items);
      }
    } catch (err) {
      console.error("Erro ao carregar fila:", err);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000);
    return () => clearInterval(interval);
  }, [loadQueue]);

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

  // Ações na Fila
  const handleRetryItem = async (id: string) => {
    trigger("vibrate");
    await db.syncQueue.update(id, { retry_count: 0, failed: false, error: null });
    showToast("Item reativado para sincronização", "success");
    loadQueue();
    window.dispatchEvent(new Event("sync:process"));
  };

  const handleDeleteQueueItem = async (id: string) => {
    trigger("vibrate");
    if (confirm("Deseja remover este item travado da fila?")) {
      await db.syncQueue.delete(id);
      showToast("Item removido da fila", "info");
      loadQueue();
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
                Diagnóstico & Sincronização
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Inspecione a fila e compare os dados com a nuvem.
              </p>
            </div>
          </div>

          {/* Abas / Tabs de Navegação */}
          <div className="mt-4 flex rounded-full bg-surface-raised p-1 border border-surface-border/50">
            <button
              onClick={() => {
                trigger("vibrate");
                setActiveTab("fila");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold transition-all ${
                activeTab === "fila"
                  ? "bg-ice text-void shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <ListFilter size={14} />
              Fila Pendente ({queueItems.length})
            </button>
            <button
              onClick={() => {
                trigger("vibrate");
                setActiveTab("auditoria");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-semibold transition-all ${
                activeTab === "auditoria"
                  ? "bg-ice text-void shadow-sm"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              <Database size={14} />
              Auditoria de Tabelas
            </button>
          </div>
        </header>

        <section className="space-y-4 px-5 pt-6">
          {activeTab === "fila" ? (
            /* ================= ABA 1: FILA E ERROS ================= */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-primary">
                  Itens na Fila de Sync ({queueItems.length})
                </h2>
                <button
                  onClick={() => {
                    trigger("vibrate");
                    window.dispatchEvent(new Event("sync:process"));
                    showToast("Disparando sincronização...", "info");
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1.5 text-xs font-medium text-ice border border-surface-border/50"
                >
                  <RefreshCw size={12} />
                  Forçar Sync
                </button>
              </div>

              {queueItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface p-8 text-center">
                  <CheckCircle2 size={36} className="text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-ink-primary">Fila Limpa!</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Não há itens pendentes ou travados aguardando envio.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-[22px] border bg-surface p-4 shadow-sm ${
                        item.failed ? "border-coral/50 bg-coral/5" : "border-surface-border/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs uppercase px-2 py-0.5 rounded-md bg-surface-raised text-ice font-semibold">
                              {item.table}
                            </span>
                            <span className="text-xs font-medium text-ink-muted uppercase">
                              Op: {item.operation}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-ink-primary">
                            Registro ID: {item.payload?.id || item.id}
                          </p>
                          {item.payload?.nome && (
                            <p className="text-xs text-ink-secondary">
                              Nome: <span className="font-medium">{item.payload.nome}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                            item.failed ? "bg-coral/20 text-coral" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            Tentativas: {item.retry_count || 0}/5
                          </span>
                        </div>
                      </div>

                      {/* Exibição do Erro Exato Capturado do Supabase */}
                      {item.error && (
                        <div className="mt-3 rounded-xl bg-void/60 border border-coral/30 p-2.5">
                          <p className="text-[11px] font-mono font-semibold text-coral flex items-center gap-1.5">
                            <AlertTriangle size={13} />
                            Erro do Supabase:
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-coral/90 break-all">
                            {item.error}
                          </p>
                        </div>
                      )}

                      {/* Botões de Ação Individual */}
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-surface-border/30 pt-3">
                        <button
                          onClick={() => handleRetryItem(item.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-ice/10 px-3 py-1.5 text-xs font-semibold text-ice border border-ice/20 active:scale-95 transition-all"
                        >
                          <PlayCircle size={13} />
                          Re-tentar Envio
                        </button>
                        <button
                          onClick={() => handleDeleteQueueItem(item.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-coral/10 px-3 py-1.5 text-xs font-semibold text-coral border border-coral/20 active:scale-95 transition-all"
                        >
                          <Trash2 size={13} />
                          Descartar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ================= ABA 2: AUDITORIA DE TABELAS ================= */
            <div className="space-y-4">
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
                      Verificar contagem local vs nuvem
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
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
