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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useState, ReactNode, useCallback } from "react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pullAllData } from "@/lib/sync/pull";

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
  const { processQueue, isOnline } = useSyncQueue();
  const { isEnabled: isBiometricEnabled, toggle: toggleBiometric } = useBiometricPreference();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
      await db.persons.clear();
      await db.documents.clear();
      await db.medicamentos.clear();
      await db.renovacoes.clear();
      await db.vaults.clear();
      await db.vaultMembers.clear();
      await db.medicos.clear();
      await db.farmacias.clear();
      await db.hospitais.clear();
      await db.syncQueue.clear();

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

  const handleSync = useCallback(async () => {
    if (!user?.id) {
      showError("Usuário não autenticado");
      return;
    }

    if (!isOnline) {
      showError("Sem conexão com a internet");
      return;
    }

    if (isSyncing) return;

    setIsSyncing(true);
    trigger("vibrate");
    showInfo("Sincronizando dados...", 5000);

    try {
      await pullAllData(user.id);
      await processQueue();

      const finalPersons = await db.persons.count();
      const finalDocs = await db.documents.count();

      showSuccess(
        `Sincronizado! ${finalPersons} pessoas, ${finalDocs} documentos`,
        5000
      );

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
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

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const menuSections: MenuSection[] = [
    {
      title: "Geral",
      items: [
        {
          id: "cofres",
          icon: Shield,
          label: "Cofres",
          description: "Documentos compartilhados com sua família",
          onClick: () => router.push("/vaults"),
        },
        {
          id: "pessoas",
          icon: Users,
          label: "Pessoas",
          description: "Gerencie as pessoas do seu vault",
          onClick: () => router.push("/pessoas"),
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
          description: isOnline
            ? isSyncing
              ? "Baixando e enviando dados..."
              : "Forçar sincronização com a nuvem (pull + push)"
            : "Sem conexão",
          onClick: handleSync,
          disabled: !isOnline || isSyncing,
        },
        {
          id: "exportar",
          icon: Download,
          label: "Exportar dados",
          description: "Baixe todos os seus dados em JSON",
          onClick: () => showToast("Em breve...", "info"),
        },
        {
          id: "limpar",
          icon: HardDrive,
          label: "Limpar dados locais",
          description: "Remove todos os dados do dispositivo",
          onClick: () => setShowClearDataModal(true),
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
          onClick: () => showToast("Em breve...", "info"),
        },
      ],
    },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Vault
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
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

            <div className="mt-5 rounded-[22px] border border-surface-border/40 bg-surface-raised/60 px-4 py-3">
              <button
                onClick={handleBiometricToggle}
                className="flex w-full items-center gap-3 rounded-xl text-left transition-all active:scale-[0.99]"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
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

                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-primary">
                    Biometria
                  </p>
                  <p className="text-xs text-ink-muted">
                    Desbloqueio rápido e seguro no dispositivo
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    isBiometricEnabled
                      ? "bg-ice/15 text-ice"
                      : "bg-surface-border text-ink-muted"
                  }`}
                >
                  {isBiometricEnabled ? "Ativada" : "Desativada"}
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
                  const Icon = item.icon;

                  if (item.id === "tema") {
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 shadow-sm"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                          <Icon size={18} className="text-ink-muted" />
                        </div>

                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-ink-primary">
                            {item.label}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {item.description}
                          </p>
                        </div>

                        <div className="shrink-0">{item.component}</div>
                      </div>
                    );
                  }

                  const isSyncItem = item.id === "sync";

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
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised">
                        {isSyncItem && isSyncing ? (
                          <Loader2 size={18} className="animate-spin text-ice" />
                        ) : (
                          <Icon size={18} className="text-ink-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary">
                          {item.label}
                        </p>
                        <p className="text-xs leading-5 text-ink-muted">
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
      </main>
    </PageTransition>
  );
}