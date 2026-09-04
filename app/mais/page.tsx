// app/mais/page.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Settings,
  LogOut,
  Users,
  ChevronRight,
  HelpCircle,
  Download,
  RefreshCw,
  Fingerprint,
  Pencil,
  Heart,
  Loader2,
  Terminal,
  Activity,
  KeyRound,
  CreditCard,
  ShieldAlert,
  Bell,
  Star,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useNotificationPreference } from "@/hooks/useNotificationPreference";
import {
  requestNotificationPermission,
  scheduleDoseNotifications,
} from "@/lib/dose-notifications";

import {
  cancelAllNotifications,
  reconcilePersistentNotifications,
} from "@/lib/notifications";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pullAllData } from "@/lib/sync/pull";
import { useLiveQuery } from "dexie-react-hooks";
import type {
  Document,
  Medicamento,
} from "@/lib/types";

// ============================================================
// CONFIRMAÇÃO RIGOROSA
// ============================================================

function RigorousConfirmInput({
  onConfirm,
  label,
}: {
  onConfirm: () => void;
  label: string;
}) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-ink-muted">
        Digite{" "}
        <span className="font-bold text-coral">EXCLUIR</span> em letras
        maiúsculas para confirmar:
      </p>

      <input
        value={text}
        onChange={(e) => setText(e.target.value.toUpperCase())}
        className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-center font-mono text-sm uppercase tracking-widest text-ink-primary outline-none focus:border-coral"
        placeholder="EXCLUIR"
      />

      <button
        disabled={text !== "EXCLUIR"}
        onClick={onConfirm}
        className="w-full rounded-2xl bg-coral py-3 text-sm font-bold text-white shadow-lg shadow-coral/20 transition-all active:scale-95 disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  );
}

const APP_VERSION = "1.0.0";

export default function MaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const { user, logout } = useAuth();

  const {
    showToast,
    showSuccess,
    showError,
    showInfo,
  } = useToast();

  const {
    processQueue,
    isOnline,
    syncLogs,
    clearLogs,
  } = useSyncQueue();

  const {
    isEnabled: isBiometricEnabled,
    toggle: toggleBiometric,
  } = useBiometricPreference();

  const {
    isEnabled: isNotificationsEnabled,
    enable: enableNotifications,
    disable: disableNotifications,
  } = useNotificationPreference();

  // ============================================================
  // STATES
  // ============================================================

  const isSubmitLocked = useRef(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  // ============================================================
  // DADOS LOCAIS
  // ============================================================

  const pendingQueueCount =
    useLiveQuery(() => db.syncQueue.count(), []) ?? 0;

  const allMedicamentos =
    (useLiveQuery(
      () => db.medicamentos.toArray(),
      []
    ) as Medicamento[]) ?? [];

  const allDocuments =
    (useLiveQuery(
      () => db.documents.toArray(),
      []
    ) as Document[]) ?? [];

  const totalLocalItems =
    useLiveQuery(async () => {
      let count = 0;

      const tables = [
        "persons",
        "documents",
        "medicamentos",
        "medicos",
        "farmacias",
        "hospitais",
        "tratamentos",
      ];

      for (const table of tables) {
        try {
          count += await (db as any)[table].count();
        } catch {
          // Ignora tabelas inexistentes por segurança.
        }
      }

      return count;
    }, []) ?? 0;

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    if (isSubmitLocked.current) return;

    isSubmitLocked.current = true;
    setIsLoading(true);

    try {
      trigger("vibrate");

      await logout();

      router.push("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
      showToast("Erro ao sair da conta", "error");
    } finally {
      setIsLoading(false);
      setShowLogoutModal(false);
      isSubmitLocked.current = false;
    }
  };

  // ============================================================
  // LIMPAR DADOS LOCAIS
  // ============================================================

  const clearLocalData = async () => {
    setIsLoading(true);

    try {
      /*
       * Evita notificações órfãs depois que os dados locais
       * forem removidos.
       */
      await cancelAllNotifications();

      await Promise.all([
        db.persons.clear(),
        db.documents.clear(),
        db.medicamentos.clear(),
        db.renovacoes.clear(),
        db.vaults.clear(),
        db.vaultMembers.clear(),
        db.medicos.clear(),
        db.farmacias.clear(),
        db.hospitais.clear(),
        db.locais.clear(),
        db.exames.clear(),
        db.consultas.clear(),
        db.cirurgias.clear(),
        db.doseLogs.clear(),
        db.credentials.clear(),
        db.bankCards.clear(),
        db.instituicoes.clear(),
        db.tratamentos.clear(),
        db.cids.clear(),
        db.anexos_clinicos.clear(),
        db.syncQueue.clear(),
      ]);

      trigger("success");

      showToast(
        "Dados locais limpos com sucesso!",
        "success"
      );

      router.push("/login");
    } catch (error) {
      console.error("Erro ao limpar dados:", error);

      showToast(
        "Erro ao limpar dados",
        "error"
      );
    } finally {
      setIsLoading(false);
      setShowClearDataModal(false);
    }
  };

  // ============================================================
  // DESTRAVAR FILA
  // ============================================================

  const unlockSyncQueue = async () => {
    setIsLoading(true);

    try {
      await db.syncQueue.clear();

      trigger("success");

      showSuccess(
        "Fila destravada com sucesso! Você já pode salvar os itens novamente.",
        4000
      );
    } catch (error) {
      console.error("Erro ao destravar fila:", error);

      showToast(
        "Erro ao destravar a fila",
        "error"
      );
    } finally {
      setIsLoading(false);
      setShowUnlockModal(false);
    }
  };

  // ============================================================
  // SINCRONIZAÇÃO
  // ============================================================

  const handleSync = useCallback(async () => {
    if (!user?.id) {
      showError("Usuário não autenticado");
      trigger("error");
      return;
    }

    if (!isOnline) {
      showError("Sem conexão com a internet");
      trigger("error");
      return;
    }

    if (isSyncing) return;

    setIsSyncing(true);

    trigger("vibrate");

    showInfo(
      "Sincronizando dados com a nuvem...",
      5000
    );

    try {
      await pullAllData(user.id);
      await processQueue();

      trigger("success");

      showSuccess(
        `Sincronizado com sucesso! (${totalLocalItems} registros gerenciados)`,
        5000
      );

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error(
        "Erro na sincronização:",
        error
      );

      trigger("error");

      showError(
        `Erro ao sincronizar: ${
          error?.message || "Erro desconhecido"
        }`
      );
    } finally {
      setIsSyncing(false);
    }
  }, [
    user,
    isOnline,
    isSyncing,
    trigger,
    showInfo,
    showSuccess,
    showError,
    processQueue,
    totalLocalItems,
  ]);

  // ============================================================
  // PERFIL
  // ============================================================

  const handleEditProfile = () => {
    trigger("vibrate");

    showToast(
      "Editar perfil em breve...",
      "info"
    );
  };

  // ============================================================
  // BIOMETRIA
  // ============================================================

  const handleBiometricToggle = () => {
    toggleBiometric();

    trigger("vibrate");

    showToast(
      isBiometricEnabled
        ? "Biometria desativada"
        : "Biometria ativada",
      "info"
    );
  };

  // ============================================================
  // NOTIFICAÇÕES
  // ============================================================

  const handleNotificationsToggle = async () => {
    if (
      isLoading
    ) {
      return;
    }

    trigger("vibrate");
    setIsLoading(true);

    try {
      if (
        isNotificationsEnabled
      ) {
        /*
         * Primeiro desliga a preferência. Assim nenhum fluxo
         * concorrente consegue criar um novo agendamento
         * enquanto limpamos os lembretes do Android.
         */
        disableNotifications();

        await cancelAllNotifications();

        showToast(
          "Todos os lembretes foram desativados",
          "info"
        );

        return;
      }

      const granted =
        await requestNotificationPermission();

      if (
        !granted
      ) {
        showError(
          "Permissão de notificação negada pelo sistema."
        );

        return;
      }

      /*
       * O núcleo consulta esta preferência antes de agendar.
       * Portanto ela precisa ser ligada antes da reconciliação.
       */
      enableNotifications();

      const medicamentosAgendaveis =
        allMedicamentos.filter(
          (
            medicamento
          ) =>
            Boolean(
              medicamento.id &&
              medicamento.person_id &&
              medicamento.status !==
                "descontinuado" &&
              medicamento.estoque_horarios &&
              medicamento.estoque_horarios.length >
                0
            )
        );

      const results =
        await Promise.allSettled(
          medicamentosAgendaveis.map(
            (
              medicamento
            ) =>
              scheduleDoseNotifications({
                id:
                  medicamento.id!,

                person_id:
                  medicamento.person_id,

                nome:
                  medicamento.nome,

                dosagem:
                  medicamento.dosagem,

                estoque_horarios:
                  medicamento.estoque_horarios ||
                  [],
              })
          )
        );

      /*
       * Além das doses, restaura vencimentos de documentos e
       * próximas renovações cadastradas nos medicamentos.
       */
      await reconcilePersistentNotifications(
        allDocuments,
        allMedicamentos
      );

      const failures =
        results.filter(
          (
            result
          ) =>
            result.status ===
            "rejected"
        ).length;

      if (
        failures > 0
      ) {
        console.error(
          "[Mais] Alguns lembretes não foram reagendados:",
          failures
        );

        showToast(
          "Lembretes ativados, mas alguns medicamentos precisam ser revisados.",
          "info",
          5000
        );

        return;
      }

      showToast(
        medicamentosAgendaveis.length ===
          0
          ? "Lembretes ativados"
          : medicamentosAgendaveis.length ===
              1
            ? "Lembretes ativados para 1 medicamento"
            : `Lembretes ativados para ${medicamentosAgendaveis.length} medicamentos`,
        "success"
      );
    } catch (
      error
    ) {
      console.error(
        "[Mais] Erro ao alterar lembretes:",
        error
      );

      showError(
        "Não foi possível atualizar os lembretes."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // LOGS
  // ============================================================

  const handleShowLogs = useCallback(() => {
    if (syncLogs.length === 0) {
      showToast(
        "Nenhum log disponível",
        "info"
      );

      return;
    }

    const logText = syncLogs
      .map(
        (log) =>
          `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`
      )
      .join("\n");

    showInfo(
      logText,
      8000
    );
  }, [
    syncLogs,
    showInfo,
    showToast,
  ]);

  // ============================================================
  // PERFIL
  // ============================================================

  const avatarUrl =
    user?.user_metadata?.avatar_url;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";

  // ============================================================
  // ACESSO RÁPIDO
  // ============================================================

  const quickAccessItems = [
    {
      id: "senhas",
      icon: KeyRound,
      label: "Senhas",
      description: "Credenciais",
      onClick: () => {
        trigger("vibrate");
        router.push("/senhas");
      },
    },
    {
      id: "cartoes",
      icon: CreditCard,
      label: "Bancos & Cartões",
      description: "Contas e cartões",
      onClick: () => {
        trigger("vibrate");
        router.push("/cartoes");
      },
    },
    {
      id: "cofres",
      icon: Shield,
      label: "Cofres",
      description: "Documentos",
      onClick: () => {
        trigger("vibrate");
        router.push("/vaults");
      },
    },
    {
      id: "pessoas",
      icon: Users,
      label: "Pessoas",
      description: "Gerenciar pessoas",
      onClick: () => {
        trigger("vibrate");
        router.push("/pessoas");
      },
    },
    {
      id: "favoritos",
      icon: Star,
      label: "Favoritos",
      description: "Documentos salvos",
      onClick: () => {
        trigger("vibrate");
        router.push("/favoritos");
      },
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageTransition>
      <main className="min-h-screen overflow-y-auto bg-void pb-28">
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-2 backdrop-blur-xl header-safe-top">
          <h1 className="font-display text-xl font-semibold text-ink-primary">
            Mais
          </h1>

          <p className="mt-1 text-sm text-ink-muted">
            Configurações, dados e opções da conta
          </p>
        </header>

        <section className="space-y-6 px-5 pt-6">
          {/* ===================================================
              PERFIL
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
            }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}

              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    className="h-20 w-20 rounded-full border-2 border-ice/20 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-3xl text-ink-muted">
                    {displayName
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleEditProfile}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-void bg-ice text-void transition-colors hover:bg-ice/85 active:scale-95"
                  aria-label="Editar perfil"
                >
                  <Pencil size={13} />
                </button>
              </div>

              {/* Informações */}

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-muted">
                  Conta
                </p>

                <h2 className="truncate font-display text-lg font-semibold text-ink-primary">
                  {displayName}
                </h2>

                <p className="mt-1 truncate text-sm text-ink-muted">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* =================================================
                TOGGLES
            ================================================= */}

            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Biometria */}

              <button
                onClick={handleBiometricToggle}
                className="flex items-center gap-3 rounded-[20px] border border-surface-border/40 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.985]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    isBiometricEnabled
                      ? "border-ice/20 bg-ice/10"
                      : "border-surface-border/50 bg-surface"
                  }`}
                >
                  <Fingerprint
                    size={18}
                    className={
                      isBiometricEnabled
                        ? "text-ice"
                        : "text-ink-muted"
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Biometria
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    Desbloqueio rápido
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
                    isBiometricEnabled
                      ? "bg-ice/15 text-ice"
                      : "bg-surface-border text-ink-muted"
                  }`}
                >
                  {isBiometricEnabled
                    ? "Ativa"
                    : "Inativa"}
                </span>
              </button>

              {/* Notificações */}

              <button
                onClick={handleNotificationsToggle}
                className="flex items-center gap-3 rounded-[20px] border border-surface-border/40 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.985]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    isNotificationsEnabled
                      ? "border-emerald-400/20 bg-emerald-400/10"
                      : "border-surface-border/50 bg-surface"
                  }`}
                >
                  <Bell
                    size={18}
                    className={
                      isNotificationsEnabled
                        ? "text-emerald-400"
                        : "text-ink-muted"
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Lembretes
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    Notificações de doses
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
                    isNotificationsEnabled
                      ? "bg-emerald-400/15 text-emerald-400"
                      : "bg-surface-border text-ink-muted"
                  }`}
                >
                  {isNotificationsEnabled
                    ? "Ativo"
                    : "Inativo"}
                </span>
              </button>
            </div>
          </motion.div>

          {/* ===================================================
              ACESSO RÁPIDO — GRID
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
              delay: 0.04,
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                Acesso rápido
              </h2>

              <span className="text-[10px] text-ink-faint">
                {quickAccessItems.length} atalhos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="group flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border border-surface-border/50 bg-surface p-4 text-center shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.97]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ice/10 bg-ice/10 text-ice transition-transform duration-200 group-hover:scale-105">
                      <Icon size={20} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-ink-primary">
                      {item.label}
                    </p>

                    <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-muted">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ===================================================
              TEMA
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
              delay: 0.06,
            }}
            className="rounded-[22px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-border/30 bg-surface-raised text-ink-muted">
                  <Settings size={18} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">
                    Tema
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    Claro, escuro ou automático
                  </p>
                </div>
              </div>

              <ThemeToggle />
            </div>
          </motion.div>

          {/* ===================================================
              DADOS & NUVEM
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
              delay: 0.08,
            }}
          >
            <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Dados & Nuvem
            </h2>

            <div className="space-y-2">
              {/* Sincronizar */}

                            {/* Sincronizar */}
              <button
                onClick={() => {
                  if (pendingQueueCount > 0) {
                    trigger("vibrate");
                    router.push("/diagnostico");
                  } else {
                    handleSync();
                  }
                }}
                disabled={!isOnline && pendingQueueCount === 0}
                className={`flex w-full items-center gap-4 rounded-[22px] border p-3.5 text-left shadow-sm transition-all active:scale-[0.985] ${
                  !isOnline
                    ? "border-surface-border/50 bg-surface/50 opacity-60"
                    : pendingQueueCount > 0
                    ? "border-coral/40 bg-coral/5 hover:bg-coral/10"
                    : "border-surface-border/50 bg-surface hover:bg-surface-raised/80"
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                  pendingQueueCount > 0 ? "border-coral/20 bg-coral/10 text-coral" : "border-ice/20 bg-ice/10 text-ice"
                }`}>
                  {isSyncing ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : pendingQueueCount > 0 ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    {pendingQueueCount > 0 ? "Fila com pendências" : "Sincronizar agora"}
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    {!isOnline
                      ? "Sem conexão com a internet"
                      : isSyncing
                      ? "Baixando e enviando dados..."
                      : pendingQueueCount > 0
                      ? `⚠️ ${pendingQueueCount} ${pendingQueueCount === 1 ? "item travado" : "itens travados"} — Clique para ver`
                      : `${totalLocalItems} registros locais · Sincronizado`}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-ink-faint"
                />
              </button>


              {/* Exportar */}

              <button
                onClick={() => {
                  trigger("vibrate");

                  showToast(
                    "Em breve...",
                    "info"
                  );
                }}
                className="flex w-full items-center gap-4 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.985]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-violet-400">
                  <Download size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    Exportar dados
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    Baixe seus dados em JSON
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-ink-faint"
                />
              </button>

              {/* Limpar dados */}

              <button
                onClick={() => {
                  trigger("vibrate");
                  setShowClearDataModal(true);
                }}
                className="flex w-full items-center gap-4 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.985]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-400">
                  <Trash2 size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    Limpar dados locais
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    Remove os dados deste dispositivo
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-ink-faint"
                />
              </button>
            </div>
          </motion.div>

          {/* ===================================================
              DIAGNÓSTICO
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
              delay: 0.1,
            }}
            className="overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface/60 shadow-sm"
          >
            <button
              onClick={() => {
                trigger("vibrate");
                setDiagnosticOpen(
                  !diagnosticOpen
                );
              }}
              className="flex w-full items-center justify-between p-4 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice">
                  <Terminal size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Ferramentas de diagnóstico
                  </p>

                  <p className="truncate text-xs text-ink-muted">
                    {syncLogs.length > 0
                      ? `${syncLogs.length} eventos registrados`
                      : "Nenhum log disponível"}
                  </p>
                </div>
              </div>

              {diagnosticOpen ? (
                <ChevronUp
                  size={18}
                  className="shrink-0 text-ink-faint"
                />
              ) : (
                <ChevronDown
                  size={18}
                  className="shrink-0 text-ink-faint"
                />
              )}
            </button>

            <AnimatePresence>
              {diagnosticOpen && (
                <motion.div
                  initial={{
                    height: 0,
                    opacity: 0,
                  }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 border-t border-surface-border/30 px-4 pb-4 pt-3">
                    {/* Diagnóstico */}

                    <button
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          "/diagnostico"
                        );
                      }}
                      className="flex w-full items-center gap-4 rounded-[20px] border border-surface-border/30 bg-surface p-3 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.985]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                        <Activity size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary">
                          Diagnóstico de dados
                        </p>

                        <p className="text-xs text-ink-muted">
                          Compara local com nuvem
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>

                    {/* Destravar sincronização */}

                    <button
                      onClick={() => {
                        trigger("vibrate");
                        setShowUnlockModal(true);
                      }}
                      disabled={
                        pendingQueueCount === 0
                      }
                      className={`flex w-full items-center gap-4 rounded-[20px] border p-3 text-left shadow-sm transition-all active:scale-[0.985] ${
                        pendingQueueCount === 0
                          ? "border-surface-border/30 bg-surface/50 opacity-50"
                          : "border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
                        <ShieldAlert size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary">
                          Destravar sincronização
                        </p>

                        <p className="text-xs text-ink-muted">
                          {pendingQueueCount ===
                          0
                            ? "Nenhum item travado"
                            : `${pendingQueueCount} ${
                                pendingQueueCount ===
                                1
                                  ? "item preso"
                                  : "itens presos"
                              } na fila`}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>

                    {/* Logs */}

                    <button
                      onClick={handleShowLogs}
                      disabled={
                        syncLogs.length === 0
                      }
                      className={`flex w-full items-center gap-4 rounded-[20px] border p-3 text-left shadow-sm transition-all active:scale-[0.985] ${
                        syncLogs.length === 0
                          ? "border-surface-border/30 bg-surface/50 opacity-50"
                          : "border-surface-border/30 bg-surface hover:bg-surface-raised/80"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                        <Terminal size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary">
                          Ver logs de sincronização
                        </p>

                        <p className="text-xs text-ink-muted">
                          {syncLogs.length > 0
                            ? `${syncLogs.length} eventos registrados`
                            : "Nenhum log disponível"}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>

                    {/* Limpar logs */}

                    <button
                      onClick={() => {
                        trigger("vibrate");

                        clearLogs();

                        showToast(
                          "Logs limpos com sucesso!",
                          "info"
                        );
                      }}
                      disabled={
                        syncLogs.length === 0
                      }
                      className={`flex w-full items-center gap-4 rounded-[20px] border p-3 text-left shadow-sm transition-all active:scale-[0.985] ${
                        syncLogs.length === 0
                          ? "border-surface-border/30 bg-surface/50 opacity-50"
                          : "border-surface-border/30 bg-surface hover:bg-surface-raised/80"
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                        <RefreshCw size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary">
                          Limpar logs
                        </p>

                        <p className="text-xs text-ink-muted">
                          Remove os logs de sincronização
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ===================================================
              SUPORTE
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
              delay: 0.12,
            }}
          >
            <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Suporte
            </h2>

            <button
              onClick={() => {
                trigger("vibrate");

                showToast(
                  "Em breve...",
                  "info"
                );
              }}
              className="flex w-full items-center gap-4 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.985]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice">
                <HelpCircle size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-primary">
                  Ajuda
                </p>

                <p className="text-xs text-ink-muted">
                  Dúvidas e suporte
                </p>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 text-ink-faint"
              />
            </button>
          </motion.div>

          {/* ===================================================
              SAIR
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.28,
              delay: 0.14,
            }}
          >
            <button
              onClick={() =>
                setShowLogoutModal(true)
              }
              className="flex w-full items-center gap-4 rounded-[22px] border border-coral/20 bg-coral/5 p-3.5 text-left transition-all hover:bg-coral/10 active:scale-[0.985]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral/15">
                <LogOut
                  size={18}
                  className="text-coral"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-coral">
                  Sair da conta
                </p>

                <p className="truncate text-xs text-coral/70">
                  Encerrar sua sessão atual
                </p>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 text-coral/40"
              />
            </button>
          </motion.div>

          {/* ===================================================
              RODAPÉ
          =================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.34,
              delay: 0.2,
            }}
            className="pb-8 pt-2 text-center"
          >
            <p className="text-xs text-ink-faint">
              Vault v{APP_VERSION}
            </p>

            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-faint">
              Desenvolvido com
              <Heart
                size={12}
                className="fill-coral text-coral"
              />
              por Álefe Jôhsefe
            </p>

            <p className="mt-2 text-[10px] text-ink-faint/50">
              © {new Date().getFullYear()} — Todos os
              direitos reservados
            </p>
          </motion.div>
        </section>

        {/* =====================================================
            MODAL — LOGOUT
        ===================================================== */}

        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() =>
            setShowLogoutModal(false)
          }
          onConfirm={handleLogout}
          title="Sair da conta"
          message="Tem certeza que deseja sair da sua conta?"
          confirmLabel="Sair"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="warning"
        />

        {/* =====================================================
            MODAL — LIMPAR DADOS
        ===================================================== */}

        <ConfirmationModal
          isOpen={showClearDataModal}
          onClose={() =>
            setShowClearDataModal(false)
          }
          onConfirm={clearLocalData}
          title="Limpar dados locais"
          message={
            <RigorousConfirmInput
              onConfirm={clearLocalData}
              label="Limpar Todos os Dados"
            />
          }
          type="danger"
          showActions={false}
        />

        {/* =====================================================
            MODAL — DESTRAVAR FILA
        ===================================================== */}

        <ConfirmationModal
          isOpen={showUnlockModal}
          onClose={() =>
            setShowUnlockModal(false)
          }
          onConfirm={unlockSyncQueue}
          title="Destravar Sincronização"
          message="Isso apagará os itens que falharam permanentemente e estão travando a fila. Você precisará abrir os registros no app e salvá-los novamente para enviá-los à nuvem. Deseja continuar?"
          confirmLabel="Limpar Fila"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="warning"
        />
      </main>
    </PageTransition>
  );
}