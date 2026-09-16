// app/mais/page.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  BrainCircuit,
  Landmark,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  BookOpen,
  CheckCircle2,
  Bug,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
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
import { useTheme } from "next-themes";
import { getVaultRuntime } from "@/lib/native-runtime";
import { useBiometric } from "@/hooks/useBiometric";
import { pullAllData } from "@/lib/sync/pull";
import { useLiveQuery } from "dexie-react-hooks";
import type {
  Document,
  Medicamento,
} from "@/lib/types";
import {
  disableEruda,
  enableEruda,
  isErudaPreferenceEnabled,
} from "@/lib/diagnostics/eruda";

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

const APP_VERSION = "1.1.0";
const DIAGNOSTIC_OWNER_EMAIL = "alefejohsefe@gmail.com";

const HELP_STEPS = [
  {
    title: "Escolha a pessoa certa",
    description:
      "Os dados de saúde e documentos pessoais seguem a pessoa ativa. Confira o perfil no topo antes de registrar informações.",
    icon: Users,
  },
  {
    title: "Registre sua rotina",
    description:
      "Use Hoje para doses e compromissos. O botão central adiciona medicamentos, tratamentos, consultas, exames e registros.",
    icon: Activity,
  },
  {
    title: "Entenda os alertas",
    description:
      "A Inteligência explica o motivo, as fontes e a cobertura de cada achado. Ela orienta revisão, mas não substitui avaliação profissional.",
    icon: BrainCircuit,
  },
  {
    title: "Seus dados continuam locais",
    description:
      "O Vault funciona local-first. A sincronização mantém uma cópia na nuvem e o diagnóstico ajuda quando houver divergências.",
    icon: Shield,
  },
] as const;

export default function MaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [themeMounted, setThemeMounted] =
    useState(false);
  const [nativeRuntime, setNativeRuntime] =
    useState<"android" | "ios" | "web">("web");

  useEffect(() => {
    setThemeMounted(true);
    setNativeRuntime(getVaultRuntime());
  }, []);

  const isNativeApp = nativeRuntime !== "web";

  const { user, logout } = useAuth();
  const { activePersonId } = useActivePersonId();

  const activePerson = useLiveQuery(
    async () => {
      if (!activePersonId || !user?.id) return null;

      const person = await db.persons.get(activePersonId);

      if (!person || person.user_id !== user.id) {
        return null;
      }

      return person;
    },
    [activePersonId, user?.id],
    null
  );

  const {
    showToast,
    showSuccess,
    showError,
    showInfo,
  } = useToast();

  const {
    processQueue,
    resetFailedItems,
    isOnline,
    syncLogs,
    clearLogs,
  } = useSyncQueue();

  const {
    isEnabled: isBiometricEnabled,
    toggle: toggleBiometric,
  } = useBiometricPreference();

  const {
    isAvailable: isBiometricAvailable,
    isLoading: isBiometricChecking,
  } = useBiometric();

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
  const [erudaEnabled, setErudaEnabled] = useState(false);
  const [erudaLoading, setErudaLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpStep, setHelpStep] = useState(0);

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
        db.retiradas.clear(),
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
        db.medicamento_tratamentos.clear(),
        db.exame_tratamentos.clear(),
        db.registros_saude.clear(),
        db.health_reminders.clear(),
        db.health_goals.clear(),
        db.settings.clear(),
        db.versiculos.clear(),
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
      await resetFailedItems();

      trigger("success");

      showSuccess(
        "Itens com falha foram preservados e reativados para envio.",
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

    if (!activePersonId) {
      showToast(
        "Selecione uma pessoa antes de editar o perfil.",
        "info"
      );
      return;
    }

    router.push(
      `/pessoas/editar?id=${encodeURIComponent(activePersonId)}`
    );
  };

  // ============================================================
  // BIOMETRIA
  // ============================================================

  const handleBiometricToggle = () => {
    trigger("vibrate");

    if (!isNativeApp) {
      showToast(
        "A biometria fica disponível somente no aplicativo instalado. O navegador e o PWA não conseguem usar a proteção nativa com segurança.",
        "info",
        6000
      );
      return;
    }

    if (isBiometricChecking) {
      showToast(
        "Verificando a biometria do dispositivo...",
        "info"
      );
      return;
    }

    if (!isBiometricAvailable) {
      showToast(
        "Este aparelho não disponibilizou biometria ao Vault. Confira se há impressão digital ou reconhecimento facial configurado no Android.",
        "info",
        6000
      );
      return;
    }

    toggleBiometric();

    showToast(
      isBiometricEnabled
        ? "Biometria desativada"
        : "Biometria ativada no aplicativo",
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

    if (!isNativeApp) {
      showInfo(
        "Os lembretes com ações estão disponíveis no aplicativo Android (APK).",
        5000
      );
      return;
    }

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
          "Notificações bloqueadas. No Android, abra Configurações > Apps > Vault > Notificações."
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
    activePerson?.avatar_url ||
    user?.user_metadata?.avatar_url;

  const displayName =
    activePerson?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const isDiagnosticOwner =
    user?.email?.trim().toLowerCase() ===
    DIAGNOSTIC_OWNER_EMAIL;

  useEffect(() => {
    if (!isDiagnosticOwner) {
      setErudaEnabled(false);
      return;
    }

    const enabled = isErudaPreferenceEnabled();
    setErudaEnabled(enabled);

    if (enabled) {
      void enableEruda().catch(() => {
        setErudaEnabled(false);
      });
    }
  }, [isDiagnosticOwner]);

  const handleErudaToggle = useCallback(async () => {
    if (!isDiagnosticOwner || erudaLoading) return;

    trigger("vibrate");
    setErudaLoading(true);

    try {
      if (erudaEnabled) {
        disableEruda();
        setErudaEnabled(false);
        showToast("Console avançado desativado", "info");
      } else {
        await enableEruda();
        setErudaEnabled(true);
        showToast("Console avançado ativado neste dispositivo", "success");
      }
    } catch (error) {
      console.error("[Diagnóstico] Falha ao alterar Eruda:", error);
      showError("Não foi possível carregar o console avançado.");
    } finally {
      setErudaLoading(false);
    }
  }, [isDiagnosticOwner, erudaLoading, erudaEnabled, trigger, showToast, showError]);

  // ============================================================
  // ACESSO RÁPIDO
  // ============================================================

  const quickAccessItems = [
    {
      id: "inteligencia",
      icon: BrainCircuit,
      label: "Inteligência do cofre",
      description: "Organização e segurança explicáveis",
      onClick: () => {
        trigger("vibrate");
        router.replace("/inteligencia");
      },
    },
    {
      id: "senhas",
      icon: KeyRound,
      label: "Senhas",
      description: "Credenciais",
      onClick: () => {
        trigger("vibrate");
        router.replace("/senhas");
      },
    },
    {
      id: "cartoes",
      icon: CreditCard,
      label: "Cartões",
      description: "Crédito e débito",
      onClick: () => {
        trigger("vibrate");
        router.replace("/cartoes");
      },
    },
    {
      id: "contas",
      icon: Landmark,
      label: "Contas bancárias",
      description: "Agência e conta",
      onClick: () => {
        trigger("vibrate");
        router.replace("/contas");
      },
    },
    {
      id: "cofres",
      icon: Shield,
      label: "Cofres",
      description: "Documentos",
      onClick: () => {
        trigger("vibrate");
        router.replace("/vaults");
      },
    },
    {
      id: "pessoas",
      icon: Users,
      label: "Pessoas",
      description: "Gerenciar pessoas",
      onClick: () => {
        trigger("vibrate");
        router.replace("/pessoas");
      },
    },
    {
      id: "favoritos",
      icon: Star,
      label: "Favoritos",
      description: "Documentos salvos",
      onClick: () => {
        trigger("vibrate");
        router.replace("/favoritos");
      },
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] overflow-y-auto bg-void pb-28">
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

        <section className="space-y-5 px-4 pt-4 sm:px-5">
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
            className="rounded-[26px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}

              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    className="h-16 w-16 rounded-full border-2 border-ice/20 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-2xl text-ink-muted">
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
                    {isNativeApp
                      ? "Doses, receitas e documentos"
                      : "Disponível no aplicativo Android"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
                    isNotificationsEnabled
                      ? "bg-emerald-400/15 text-emerald-400"
                      : "bg-surface-border text-ink-muted"
                  }`}
                >
                  {!isNativeApp
                    ? "No APK"
                    : isNotificationsEnabled
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
                    className={`group flex min-h-[104px] flex-col items-center justify-center rounded-[22px] border border-surface-border/50 bg-surface px-3 py-3 text-center shadow-sm transition-all hover:bg-surface-raised/80 active:scale-[0.97] ${
                      item.id === "favoritos" ? "col-span-2 min-h-[88px]" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ice/15 bg-ice/10 text-ice transition-transform duration-200 group-hover:scale-105">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06 }}
          >
            <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Aparência
            </h2>

            <div className="rounded-[22px] border border-surface-border/50 bg-surface p-3 shadow-sm">
              <div className="mb-3 flex items-center gap-3 px-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
                  <Settings size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Tema do Vault
                  </p>
                  <p className="text-xs text-ink-muted">
                    Escolha como o aplicativo deve aparecer
                  </p>
                </div>
              </div>

              <div
                className="grid grid-cols-3 gap-1.5 rounded-[18px] border border-surface-border/40 bg-void/40 p-1.5"
                aria-label="Escolher tema"
              >
                {[
                  {
                    id: "light",
                    label: "Claro",
                    icon: Sun,
                  },
                  {
                    id: "dark",
                    label: "Escuro",
                    icon: Moon,
                  },
                  {
                    id: "system",
                    label: "Sistema",
                    icon: Monitor,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected =
                    themeMounted &&
                    theme === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        setTheme(option.id);
                      }}
                      aria-pressed={selected}
                      className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[14px] border px-2 py-2 transition-all active:scale-95 ${
                        selected
                          ? "border-ice/30 bg-ice/12 text-ice"
                          : "border-transparent text-ink-muted hover:bg-surface-raised"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-[11px] font-medium">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
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
              DIAGNÓSTICO — SOMENTE PROPRIETÁRIO
          =================================================== */}

          {isDiagnosticOwner && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.1 }}
              className="overflow-hidden rounded-[22px] border border-violet-400/20 bg-violet-400/[0.035] shadow-sm"
            >
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setDiagnosticOpen((current) => !current);
                }}
                aria-expanded={diagnosticOpen}
                className="flex min-h-16 w-full items-center justify-between p-3.5 text-left transition-all active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-400">
                    <Terminal size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-primary">
                        Diagnóstico técnico
                      </p>
                      <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                        Proprietário
                      </span>
                    </div>

                    <p className="truncate text-xs text-ink-muted">
                      {pendingQueueCount > 0
                        ? `${pendingQueueCount} item(ns) aguardando análise`
                        : syncLogs.length > 0
                          ? `${syncLogs.length} eventos registrados`
                          : "Fila limpa"}
                    </p>
                  </div>
                </div>

                {diagnosticOpen
                  ? <ChevronUp size={17} className="text-ink-faint" />
                  : <ChevronDown size={17} className="text-ink-faint" />}
              </button>

              <AnimatePresence initial={false}>
                {diagnosticOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-2 border-t border-violet-400/10 p-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          trigger("vibrate");
                          router.push("/diagnostico");
                        }}
                        className="flex min-h-14 items-center gap-3 rounded-2xl border border-surface-border/40 bg-surface p-3 text-left active:scale-[0.985]"
                      >
                        <Activity size={17} className="text-ice" />
                        <span className="text-xs font-medium text-ink-primary">
                          Abrir diagnóstico
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={pendingQueueCount === 0}
                        onClick={() => setShowUnlockModal(true)}
                        className="flex min-h-14 items-center gap-3 rounded-2xl border border-surface-border/40 bg-surface p-3 text-left active:scale-[0.985] disabled:opacity-40"
                      >
                        <ShieldAlert size={17} className="text-amber-400" />
                        <span className="text-xs font-medium text-ink-primary">
                          Repetir falhas
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={syncLogs.length === 0}
                        onClick={handleShowLogs}
                        className="flex min-h-14 items-center gap-3 rounded-2xl border border-surface-border/40 bg-surface p-3 text-left active:scale-[0.985] disabled:opacity-40"
                      >
                        <Terminal size={17} className="text-violet-400" />
                        <span className="text-xs font-medium text-ink-primary">
                          Consultar logs
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={syncLogs.length === 0}
                        onClick={() => {
                          clearLogs();
                          showToast("Logs limpos", "info");
                        }}
                        className="flex min-h-14 items-center gap-3 rounded-2xl border border-surface-border/40 bg-surface p-3 text-left active:scale-[0.985] disabled:opacity-40"
                      >
                        <Trash2 size={17} className="text-coral" />
                        <span className="text-xs font-medium text-ink-primary">
                          Limpar logs
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={erudaLoading}
                        onClick={() => void handleErudaToggle()}
                        className={`flex min-h-14 items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.985] disabled:opacity-50 sm:col-span-2 ${
                          erudaEnabled
                            ? "border-emerald-400/25 bg-emerald-400/[0.06]"
                            : "border-surface-border/40 bg-surface"
                        }`}
                      >
                        {erudaLoading
                          ? <Loader2 size={17} className="animate-spin text-violet-400" />
                          : <Bug size={17} className={erudaEnabled ? "text-emerald-400" : "text-violet-400"} />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-ink-primary">
                            Console avançado
                          </span>
                          <span className="mt-0.5 block text-[10px] text-ink-muted">
                            {erudaEnabled ? "Ativo somente neste dispositivo" : "Carregar apenas quando necessário"}
                          </span>
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                          erudaEnabled
                            ? "bg-emerald-400/15 text-emerald-400"
                            : "bg-surface-raised text-ink-muted"
                        }`}>
                          {erudaEnabled ? "Ativo" : "Inativo"}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ===================================================
              AJUDA
          =================================================== */}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.12 }}
          >
            <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
              Ajuda
            </h2>

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setHelpStep(0);
                setHelpOpen(true);
              }}
              className="flex min-h-16 w-full items-center gap-3 rounded-[22px] border border-emerald-400/15 bg-emerald-400/[0.035] p-3.5 text-left shadow-sm transition-all hover:bg-emerald-400/[0.06] active:scale-[0.985]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                <BookOpen size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-primary">
                  Conheça o Vault
                </p>
                <p className="text-xs text-ink-muted">
                  Um guia rápido pelas funções principais
                </p>
              </div>

              <ChevronRight size={16} className="text-ink-faint" />
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

        <AnimatePresence>
          {helpOpen && (() => {
            const step = HELP_STEPS[helpStep];
            const StepIcon = step.icon;
            const isLast =
              helpStep === HELP_STEPS.length - 1;

            return (
              <motion.div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setHelpOpen(false)}
              >
                <motion.section
                  role="dialog"
                  aria-modal="true"
                  aria-label="Guia do Vault"
                  initial={{ y: 36, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.98 }}
                  onClick={(event) => event.stopPropagation()}
                  className="w-full max-w-md rounded-[28px] border border-surface-border/60 bg-surface p-5 shadow-2xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ice">
                      Guia do Vault
                    </span>
                    <span className="text-xs text-ink-muted">
                      {helpStep + 1}/{HELP_STEPS.length}
                    </span>
                  </div>

                  <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-ice/20 bg-ice/10 text-ice">
                    <StepIcon size={28} />
                  </div>

                  <h2 className="mt-5 font-display text-xl font-semibold text-ink-primary">
                    {step.title}
                  </h2>

                  <p className="mt-2 min-h-20 text-sm leading-relaxed text-ink-muted">
                    {step.description}
                  </p>

                  <div className="mt-5 flex gap-1.5">
                    {HELP_STEPS.map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full ${
                          index <= helpStep
                            ? "bg-ice"
                            : "bg-surface-border"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (helpStep === 0) {
                          setHelpOpen(false);
                        } else {
                          setHelpStep((current) => current - 1);
                        }
                      }}
                      className="min-h-12 rounded-2xl border border-surface-border/60 bg-surface-raised px-4 text-sm font-semibold text-ink-primary active:scale-95"
                    >
                      {helpStep === 0 ? "Fechar" : "Voltar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        trigger("success");

                        if (isLast) {
                          setHelpOpen(false);
                        } else {
                          setHelpStep((current) => current + 1);
                        }
                      }}
                      className="min-h-12 rounded-2xl bg-ice px-4 text-sm font-bold text-void shadow-lg shadow-ice/15 active:scale-95"
                    >
                      {isLast ? "Concluir" : "Avançar"}
                    </button>
                  </div>
                </motion.section>
              </motion.div>
            );
          })()}
        </AnimatePresence>

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
          title="Repetir itens com falha"
          message="Os itens serão preservados, terão o estado de falha removido e passarão novamente pela fila oficial. Nenhuma alteração local será descartada."
          confirmLabel="Tentar novamente"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="warning"
        />
      </main>
    </PageTransition>
  );
}
