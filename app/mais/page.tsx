// app/mais/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  User,
  Settings,
  LogOut,
  HardDrive,
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useNotificationPreference } from "@/hooks/useNotificationPreference";
import { requestNotificationPermission, cancelAllDoseNotifications } from "@/lib/dose-notifications";
import { useState, useCallback, ReactNode } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pullAllData } from "@/lib/sync/pull";
import { useLiveQuery } from "dexie-react-hooks";
import type { Medicamento } from "@/lib/types";

const APP_VERSION = "1.0.0";

interface MenuItem {
  id: string;
  icon: any;
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  component?: ReactNode;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast, showSuccess, showError, showInfo } = useToast();
  const { processQueue, isOnline, syncLogs, clearLogs } = useSyncQueue();
  const { isEnabled: isBiometricEnabled, toggle: toggleBiometric } = useBiometricPreference();
  const { isEnabled: isNotificationsEnabled, enable: enableNotifications, disable: disableNotifications } = useNotificationPreference();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logsContent, setLogsContent] = useState("");

  const pendingQueueCount = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;
  const allMedicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) as Medicamento[];

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      trigger("vibrate");
      await logout();
      router.push("/login");
    } catch (error) {
      showToast("Erro ao sair da conta", "error");
    } finally {
      setIsLoading(false);
      setShowLogoutModal(false);
    }
  };

  const clearLocalData = async () => {
    setIsLoading(true);
    try {
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
      showToast("Dados locais limpos com sucesso!", "success");
      router.push("/login");
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      showToast("Erro ao limpar dados", "error");
    } finally {
      setIsLoading(false);
      setShowClearDataModal(false);
    }
  };

  const unlockSyncQueue = async () => {
    setIsLoading(true);
    try {
      await db.syncQueue.clear();
      trigger("success");
      showSuccess("Fila destravada com sucesso! Você já pode salvar os itens novamente.", 4000);
    } catch (error) {
      console.error("Erro ao destravar fila:", error);
      showToast("Erro ao destravar a fila", "error");
    } finally {
      setIsLoading(false);
      setShowUnlockModal(false);
    }
  };

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
    showInfo("Sincronizando dados com a nuvem...", 5000);

    try {
      await pullAllData(user.id);
      await processQueue();

      const finalPersons = await db.persons.count();
      const finalDocs = await db.documents.count();

      trigger("success");
      showSuccess(
        `Sincronizado com sucesso! (${finalPersons} pessoas, ${finalDocs} docs)`,
        5000
      );

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      trigger("error");
      showError(`Erro ao sincronizar: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, isSyncing, trigger, showInfo, showSuccess, showError, processQueue]);

  const handleEditProfile = () => {
    trigger("vibrate");
    showToast("Editar perfil em breve...", "info");
  };

  const handleBiometricToggle = () => {
    toggleBiometric();
    trigger("vibrate");
    showToast(
      isBiometricEnabled ? "Biometria desativada" : "Biometria ativada",
      "info"
    );
  };

  const handleNotificationsToggle = async () => {
    trigger("vibrate");
    if (isNotificationsEnabled) {
      await cancelAllDoseNotifications(
        allMedicamentos.map((med) => ({
          id: med.id!,
          nome: med.nome,
          dosagem: med.dosagem,
          estoque_horarios: med.estoque_horarios || [],
        }))
      );
      disableNotifications();
      showToast("Lembretes desativados", "info");
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        enableNotifications();
        showToast("Lembretes ativados", "success");
      } else {
        showError("Permissão de notificação negada pelo sistema.");
      }
    }
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const handleShowLogs = useCallback(() => {
    if (syncLogs.length === 0) {
      showToast("Nenhum log disponível", "info");
      return;
    }
    const logText = syncLogs.map(l => 
      `[${l.time}] ${l.type.toUpperCase()}: ${l.message}`
    ).join('\n');
    setLogsContent(logText);
    setShowLogsModal(true);
  }, [syncLogs, showToast]);

  const menuSections: MenuSection[] = [
    {
      title: "Geral",
      items: [
        {
          id: "senhas",
          icon: KeyRound,
          label: "Senhas",
          description: "Gerenciador de credenciais com criptografia",
          onClick: () => { trigger("vibrate"); router.push("/senhas"); },
        },
        {
          id: "cartoes",
          icon: CreditCard,
          label: "Bancos & Cartões",
          description: "Gerencie suas contas e cartões com segurança",
          onClick: () => { trigger("vibrate"); router.push("/cartoes"); },
        },
        {
          id: "cofres",
          icon: Shield,
          label: "Cofres",
          description: "Documentos compartilhados com sua família",
          onClick: () => { trigger("vibrate"); router.push("/vaults"); },
        },
        {
          id: "pessoas",
          icon: Users,
          label: "Pessoas",
          description: "Gerencie as pessoas do seu vault",
          onClick: () => { trigger("vibrate"); router.push("/pessoas"); },
        },
        {
          id: "favoritos",
          icon: Star,
          label: "Favoritos",
          description: "Acesse seus documentos marcados com estrela",
          onClick: () => { trigger("vibrate"); router.push("/favoritos"); },
        },
        {
          id: "tema",
          icon: Settings,
          label: "Tema",
          description: "Claro, Escuro ou Automático",
          component: <ThemeToggle />,
        },
      ],
    },
    {
      title: "Dados",
      items: [
        {
          id: "sync",
          icon: RefreshCw,
          label: "Sincronizar agora",
          description: !isOnline
            ? "Sem conexão com a internet"
            : isSyncing
            ? "Baixando e enviando dados..."
            : pendingQueueCount > 0
            ? `${pendingQueueCount} ${pendingQueueCount === 1 ? "item pendente" : "itens pendentes"} na fila`
            : "Tudo sincronizado com a nuvem",
          onClick: handleSync,
          disabled: !isOnline || isSyncing,
        },
        {
          id: "exportar",
          icon: Download,
          label: "Exportar dados",
          description: "Baixe todos os seus dados em JSON",
          onClick: () => { trigger("vibrate"); showToast("Em breve...", "info"); },
        },
        {
          id: "limpar",
          icon: HardDrive,
          label: "Limpar dados locais",
          description: "Remove todos os dados do dispositivo",
          onClick: () => { trigger("vibrate"); setShowClearDataModal(true); },
        },
      ],
    },
    {
      title: "Diagnóstico",
      items: [
        {
          id: "diagnostico-dados",
          icon: Activity,
          label: "Diagnóstico de dados",
          description: "Compara o que está no aparelho com o que está na nuvem",
          onClick: () => { trigger("vibrate"); router.push("/diagnostico"); },
        },
        {
          id: "destravar-sync",
          icon: ShieldAlert,
          label: "Destravar Sincronização",
          description: "Remove itens presos em falha para a fila voltar a andar",
          onClick: () => { trigger("vibrate"); setShowUnlockModal(true); },
          disabled: pendingQueueCount === 0,
        },
        {
          id: "ver-logs",
          icon: Terminal,
          label: "Ver logs de sincronização",
          description: syncLogs.length > 0 ? `${syncLogs.length} eventos registrados` : "Nenhum log disponível",
          onClick: handleShowLogs,
          disabled: syncLogs.length === 0,
        },
        {
          id: "limpar-logs",
          icon: RefreshCw,
          label: "Limpar logs",
          description: "Remove todos os logs de sincronização",
          onClick: () => {
            trigger("vibrate");
            clearLogs();
            showToast("Logs limpos com sucesso!", "info");
          },
          disabled: syncLogs.length === 0,
        },
      ],
    },
    {
      title: "Suporte",
      items: [
        {
          id: "ajuda",
          icon: HelpCircle,
          label: "Ajuda",
          description: "Dúvidas e suporte",
          onClick: () => { trigger("vibrate"); showToast("Em breve...", "info"); },
        },
      ],
    },
  ];

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

            <div>
              <h1 className="font-display text-xl font-semibold text-ink-primary">
                Mais
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Configurações, dados e opções da conta
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
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
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleEditProfile}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-void bg-ice text-void transition-colors active:scale-95 hover:bg-ice/85"
                >
                  <Pencil size={13} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-muted">Conta</p>
                <h2 className="truncate font-display text-lg font-semibold text-ink-primary">
                  {displayName}
                </h2>
                <p className="mt-1 truncate text-sm text-ink-muted">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[22px] border border-surface-border/40 bg-surface-raised/60 divide-y divide-surface-border/40">
              <button
                onClick={handleBiometricToggle}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all active:bg-surface-border/30"
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
                    className={isBiometricEnabled ? "text-ice" : "text-ink-muted"}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Biometria
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    Desbloqueio rápido no dispositivo
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isBiometricEnabled
                      ? "bg-ice/15 text-ice"
                      : "bg-surface-border text-ink-muted"
                  }`}
                >
                  {isBiometricEnabled ? "Ativada" : "Desativada"}
                </span>
              </button>

              <button
                onClick={handleNotificationsToggle}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all active:bg-surface-border/30"
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
                    className={isNotificationsEnabled ? "text-emerald-400" : "text-ink-muted"}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    Lembretes de dose
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    Notificações push de medicamentos
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isNotificationsEnabled
                      ? "bg-emerald-400/15 text-emerald-400"
                      : "bg-surface-border text-ink-muted"
                  }`}
                >
                  {isNotificationsEnabled ? "Ativado" : "Desativado"}
                </span>
              </button>
            </div>
          </motion.div>

          {menuSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: sectionIndex * 0.04 }}
            >
              <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
                {section.title}
              </h2>

              <div className="space-y-2">
                {section.items.map((item) => {
                  if (item.id === "tema") {
                    return <div key={item.id}>{item.component}</div>;
                  }

                  const Icon = item.icon;
                  const isSyncItem = item.id === "sync";
                  const isLogItem = item.id === "ver-logs" || item.id === "limpar-logs";
                  const isDiagnosticoItem = item.id === "diagnostico-dados";
                  const isUnlockItem = item.id === "destravar-sync";

                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      disabled={item.disabled || isSyncing}
                      className={`flex w-full items-center gap-4 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985] ${
                        item.disabled || isSyncing
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-surface-raised/80"
                      }`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 ${
                        isLogItem || isDiagnosticoItem ? "bg-ice/10 border-ice/20" : isUnlockItem && !item.disabled ? "bg-coral/10 border-coral/20" : "bg-surface-raised"
                      }`}>
                        {isSyncItem && isSyncing ? (
                          <Loader2 size={18} className="animate-spin text-ice" />
                        ) : (
                          <Icon size={18} className={isLogItem || isDiagnosticoItem ? "text-ice" : isUnlockItem && !item.disabled ? "text-coral" : "text-ink-muted"} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isUnlockItem && !item.disabled ? "text-coral" : "text-ink-primary"}`}>
                          {item.label}
                        </p>
                        <p className={`text-xs leading-5 ${isUnlockItem && !item.disabled ? "text-coral/70" : "text-ink-muted"}`}>
                          {item.description}
                        </p>
                      </div>

                      <ChevronRight size={16} className="shrink-0 text-ink-faint" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.18 }}
          >
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center gap-4 rounded-[22px] border border-coral/20 bg-coral/10 p-3.5 text-left transition-all active:scale-[0.985] hover:bg-coral/15"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral/15">
                <LogOut size={18} className="text-coral" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-coral">Sair da conta</p>
                <p className="text-xs text-coral/70">
                  Desconectar e encerrar sua sessão atual
                </p>
              </div>

              <ChevronRight size={16} className="shrink-0 text-coral/40" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.24 }}
            className="pb-8 pt-2 text-center"
          >
            <p className="text-xs text-ink-faint">Vault v{APP_VERSION}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-faint">
              Desenvolvido com <Heart size={12} className="fill-coral text-coral" /> por Álefe Jôhsefe
            </p>
            <p className="mt-2 text-[10px] text-ink-faint/50">
              © {new Date().getFullYear()} — Todos os direitos reservados
            </p>
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
          title="Sair da conta"
          message="Tem certeza que deseja sair da sua conta?"
          confirmLabel="Sair"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="warning"
        />

        <ConfirmationModal
          isOpen={showClearDataModal}
          onClose={() => setShowClearDataModal(false)}
          onConfirm={clearLocalData}
          title="Limpar dados locais"
          message="Tem certeza que deseja limpar todos os dados locais? Esta ação não pode ser desfeita."
          confirmLabel="Limpar"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="danger"
        />

        <ConfirmationModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onConfirm={unlockSyncQueue}
          title="Destravar Sincronização"
          message="Isso apagará os itens que falharam permanentemente e estão travando a fila. Você precisará abrir os registros no app e salvá-los novamente para enviá-los à nuvem. Deseja continuar?"
          confirmLabel="Limpar Fila"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="warning"
        />

        <ConfirmationModal
          isOpen={showLogsModal}
          onClose={() => setShowLogsModal(false)}
          onConfirm={() => setShowLogsModal(false)}
          title="Logs de sincronização"
          message={logsContent}
          confirmLabel="Fechar"
          cancelLabel=""
          type="info"
        />
      </main>
    </PageTransition>
  );
}