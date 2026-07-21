"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  User,
  Settings,
  BarChart3,
  LogOut,
  HardDrive,
  Users,
  ChevronRight,
  HelpCircle,
  FileText,
  Database,
  Download,
  RefreshCw,
  Camera,
  Fingerprint,
  Pencil,
  Heart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useToast } from "@/components/ToastProvider";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ThemeToggle } from "@/components/ThemeToggle";

// Versão do aplicativo (extraída do package.json ou definida manualmente)
const APP_VERSION = "1.0.0";

// ============================================================
// TIPO PARA OS ITENS DO MENU (com component opcional)
// ============================================================
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
  const { showToast } = useToast();
  const { processQueue, isOnline } = useSyncQueue();
  const { isEnabled: isBiometricEnabled, toggle: toggleBiometric } = useBiometricPreference();
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // ✅ CORRIGIDO: Limpar dados usando transações separadas
  const clearLocalData = async () => {
    setIsLoading(true);
    try {
      // Limpar cada tabela individualmente
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

  const handleSync = async () => {
    if (!isOnline) {
      showToast("Sem conexão com a internet", "error");
      return;
    }
    trigger("vibrate");
    showToast("Sincronizando dados...", "info");
    try {
      await processQueue();
      showToast("Dados sincronizados com sucesso!", "success");
    } catch {
      showToast("Erro ao sincronizar", "error");
    }
  };

  const handleChangePhoto = () => {
    trigger("vibrate");
    setIsChangingPhoto(true);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        showToast("Foto atualizada com sucesso!", "success");
      }
      setIsChangingPhoto(false);
    };
    input.click();
  };

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
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

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
          id: "exportar",
          icon: Download,
          label: "Exportar dados",
          description: "Baixe todos os seus dados em JSON",
          onClick: () => showToast("Em breve...", "info"),
        },
        {
          id: "sync",
          icon: RefreshCw,
          label: "Sincronizar agora",
          description: isOnline ? "Forçar sincronização com a nuvem" : "Sem conexão",
          onClick: handleSync,
          disabled: !isOnline,
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
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Mais</h1>
              <p className="text-sm text-ink-muted">Configurações e opções extras</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* PERFIL — INTEGRADO NO TOPO COM BOTÃO DE EDIÇÃO */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-20 h-20 rounded-full border-2 border-ice/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted text-3xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={handleEditProfile}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-ice text-void border-2 border-void hover:bg-ice/80 transition-colors active:scale-95"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <h2 className="font-display text-lg font-semibold text-ink-primary">{displayName}</h2>
              <p className="text-sm text-ink-muted">{user?.email}</p>
            </div>

            <div className="mt-4 border-t border-surface-border/50 pt-4 space-y-2">
              <button
                onClick={handleBiometricToggle}
                className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-surface-border transition-colors active:scale-95"
              >
                <Fingerprint size={18} className={isBiometricEnabled ? "text-ice" : "text-ink-muted"} />
                <span className="text-sm text-ink-primary flex-1">Biometria</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isBiometricEnabled
                    ? "bg-ice/20 text-ice"
                    : "bg-surface-border text-ink-muted"
                }`}>
                  {isBiometricEnabled ? "Ativada" : "Desativada"}
                </span>
              </button>
            </div>
          </motion.div>

          {/* SEÇÕES DO MENU */}
          {menuSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: sectionIndex * 0.05 }}
            >
              <h2 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-2">
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  if (item.component) {
                    return <div key={item.id}>{item.component}</div>;
                  }
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      disabled={item.disabled}
                      className={`flex items-center gap-4 w-full p-3 rounded-xl bg-surface border border-surface-border/50 hover:bg-surface-border transition-all active:scale-95 ${
                        item.disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-surface-raised border border-surface-border/50 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-ink-muted" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                        <p className="text-xs text-ink-muted">{item.description}</p>
                      </div>
                      <ChevronRight size={16} className="text-ink-muted/40 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* SAIR DA CONTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-4 w-full p-3 rounded-xl bg-coral/10 border border-coral/20 hover:bg-coral/20 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center flex-shrink-0">
                <LogOut size={18} className="text-coral" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-coral">Sair da conta</p>
                <p className="text-xs text-coral/70">Desconectar e limpar sessão</p>
              </div>
              <ChevronRight size={16} className="text-coral/40 flex-shrink-0" />
            </button>
          </motion.div>

          {/* RODAPÉ COM VERSÃO E CRÉDITOS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="pt-4 pb-8 text-center"
          >
            <p className="text-xs text-ink-faint">
              Vault v{APP_VERSION}
            </p>
            <p className="text-xs text-ink-faint mt-1 flex items-center justify-center gap-1">
              Desenvolvido com <Heart size={12} className="text-coral fill-coral" /> por Álefe Jôhsefe
            </p>
            <p className="text-[10px] text-ink-faint/50 mt-2">
              © {new Date().getFullYear()} — Todos os direitos reservados
            </p>
          </motion.div>
        </section>

        {/* MODAL DE CONFIRMAÇÃO - LOGOUT */}
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

        {/* MODAL DE CONFIRMAÇÃO - LIMPAR DADOS LOCAIS */}
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