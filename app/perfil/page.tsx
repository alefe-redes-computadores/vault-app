// app/perfil/page.tsx
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
import { useBiometric } from "@/hooks/useBiometric";
import { isVaultNative } from "@/lib/native-runtime";
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
  const { isEnabled: isBiometricEnabled, toggle: toggleBiometric } = useBiometricPreference();
  const { isAvailable: biometricAvailable, isLoading: biometricChecking } = useBiometric();
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

  // Nunca executa db.delete() a partir de Perfil. A exclusão depende de
  // uma única rota de segurança com confirmação rigorosa em Mais.
  const clearLocalData = async () => {
    setIsLoading(true);
    try {
      const pending = await db.syncQueue.count();
      if (pending > 0) {
        showToast(`Há ${pending} operação(ões) locais aguardando sincronização. Revise a fila antes de qualquer limpeza.`, "error", 6500);
        return;
      }
      setShowClearDataModal(false);
      showToast("Para limpar dados locais, confirme a operação em Mais > Zona sensível.", "info", 5500);
      router.push("/mais");
    } catch {
      showToast("Não foi possível conferir a fila. Nenhum dado foi apagado.", "error", 5000);
    } finally {
      setIsLoading(false);
      setShowClearDataModal(false);
    }
  };

  // O botão antigo anunciava sucesso sem salvar o arquivo escolhido.
  const handleChangePhoto = () => {
    trigger("light");
    showToast("Alteração de foto ainda indisponível nesta tela. Sua foto atual foi preservada.", "info", 4500);
  };

  const handleBiometricToggle = () => {
    trigger("light");
    if (!isVaultNative()) {
      showToast("A biometria nativa está disponível somente no APK. O PWA não deve anunciar essa proteção.", "info", 5500);
      return;
    }
    if (biometricChecking) {
      showToast("Verificando a biometria do aparelho…", "info");
      return;
    }
    if (!biometricAvailable) {
      showToast("Biometria indisponível neste aparelho. Verifique as configurações do Android.", "info", 5000);
      return;
    }
    toggleBiometric();
    showToast(isBiometricEnabled ? "Biometria desativada" : "Biometria ativada para ações sensíveis", "info");
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
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
                  aria-label="Alterar foto (indisponível nesta versão)"
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
                  Protege senhas, cartões e ações sensíveis quando necessário
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
          title="Gerenciar dados locais"
          message="A exclusão exige verificação da fila, confirmação rigorosa e, no APK configurado, biometria. Continuar para Mais?"
          confirmLabel="Ir para Mais"
          cancelLabel="Cancelar"
          isLoading={isLoading}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}
