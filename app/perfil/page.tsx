"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LogOut,
  HardDrive,
  Camera,
  Fingerprint,
  ChevronRight,
  Shield,
  UserCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { useState } from "react";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const itemMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const { isEnabled: isBiometricEnabled, toggle: toggleBiometric } = useBiometricPreference();
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

  const clearLocalData = async () => {
    setIsLoading(true);
    try {
      await db.delete();
      trigger("success");
      showToast("Dados locais limpos com sucesso!", "success");
      router.push("/login");
    } catch (error) {
      showToast("Erro ao limpar dados", "error");
    } finally {
      setIsLoading(false);
      setShowClearDataModal(false);
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

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
            Vault
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
            Perfil e ajustes
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Conta, segurança e preferências locais
          </p>
        </header>

        <section className="space-y-5 px-5 pt-6">
          <motion.div
            {...itemMotion}
            transition={{ duration: 0.24 }}
            className="rounded-[30px] border border-surface-border/50 bg-surface px-5 py-6 shadow-sm"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-24 w-24 rounded-full border-2 border-ice/20 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-3xl text-ink-muted">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleChangePhoto}
                  disabled={isChangingPhoto}
                  aria-label="Alterar foto"
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-void bg-ice text-void transition-all active:scale-95"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-ink-muted">
                <Sparkles size={12} />
                Seu espaço
              </div>

              <h2 className="mt-3 font-display text-lg font-semibold text-ink-primary">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{user?.email}</p>
            </div>
          </motion.div>

          <motion.div
            {...itemMotion}
            transition={{ duration: 0.24, delay: 0.04 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <Shield size={16} className="text-ice" />
              <h3 className="text-sm font-medium text-ink-primary">Segurança</h3>
            </div>

            <button
              onClick={handleBiometricToggle}
              className="flex w-full items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-4 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/12 text-ice">
                <Fingerprint size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-primary">Biometria</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Proteção rápida para abrir o app com mais segurança
                </p>
              </div>

              <div
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  isBiometricEnabled ? "bg-ice/80" : "bg-surface-border"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                    isBiometricEnabled ? "left-6" : "left-1"
                  }`}
                />
              </div>
            </button>
          </motion.div>

          <motion.div
            {...itemMotion}
            transition={{ duration: 0.24, delay: 0.08 }}
            className="rounded-[28px] border border-surface-border/50 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <UserCircle2 size={16} className="text-ice" />
              <h3 className="text-sm font-medium text-ink-primary">Conta</h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  trigger("vibrate");
                  showToast("Gerenciamento de conta em breve...", "info");
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-colors active:scale-[0.99]"
              >
                <span className="flex-1 text-sm text-ink-primary">Dados da conta</span>
                <ChevronRight size={16} className="text-ink-faint" />
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  showToast("Privacidade em breve...", "info");
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3.5 text-left transition-colors active:scale-[0.99]"
              >
                <span className="flex-1 text-sm text-ink-primary">Privacidade</span>
                <ChevronRight size={16} className="text-ink-faint" />
              </button>
            </div>
          </motion.div>

          <motion.div
            {...itemMotion}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="rounded-[28px] border border-coral/20 bg-surface px-4 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <HardDrive size={16} className="text-coral" />
              <h3 className="text-sm font-medium text-coral">Zona sensível</h3>
            </div>

            <button
              onClick={() => setShowClearDataModal(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-coral/20 bg-coral/8 px-4 py-4 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-coral">
                <HardDrive size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-coral">Limpar dados locais</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Remove o armazenamento local deste dispositivo
                </p>
              </div>

              <ChevronRight size={16} className="text-coral/70" />
            </button>
          </motion.div>

          <motion.div
            {...itemMotion}
            transition={{ duration: 0.24, delay: 0.16 }}
          >
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Sair da conta
            </Button>
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