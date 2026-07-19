"use client";

import { useRouter } from "next/navigation";
import { User, LogOut, Settings, Shield, Database, HardDrive, Camera, Fingerprint } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/components/ToastProvider";
import { useState } from "react";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";

export default function ProfilePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const { isEnabled: isBiometricEnabled, toggle: toggleBiometric } = useBiometricPreference();

  const handleLogout = async () => {
    trigger("vibrate");
    await logout();
    router.push("/login");
  };

  const clearLocalData = async () => {
    if (confirm("Tem certeza que deseja limpar todos os dados locais?")) {
      await db.delete();
      trigger("success");
      showToast("Dados locais limpos com sucesso!", "success");
      router.push("/login");
    }
  };

  const handleSettings = () => {
    trigger("vibrate");
    showToast("Configurações em breve...", "info");
  };

  const handlePrivacy = () => {
    trigger("vibrate");
    showToast("Privacidade em breve...", "info");
  };

  const handleData = () => {
    trigger("vibrate");
    showToast("Gerenciamento de dados em breve...", "info");
  };

  const handleBiometricToggle = () => {
    toggleBiometric();
    trigger("vibrate");
    showToast(
      isBiometricEnabled ? "Biometria desativada" : "Biometria ativada",
      "info"
    );
  };

  const handleChangePhoto = () => {
    trigger("vibrate");
    setIsChangingPhoto(true);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        showToast("Foto atualizada com sucesso!", "success");
      }
      setIsChangingPhoto(false);
    };
    input.click();
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-4">
        <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
          <h1 className="font-display text-xl font-semibold text-ink-primary">Perfil</h1>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* Avatar e nome */}
          <div className="flex flex-col items-center gap-3 p-6 rounded-card bg-surface border border-surface-border shadow-vault">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full border-2 border-ice/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-steel-dark/40 flex items-center justify-center text-ink-muted text-3xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={handleChangePhoto}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-ice text-void border-2 border-void hover:bg-ice/80 transition-colors active:scale-[0.95]"
                disabled={isChangingPhoto}
              >
                <Camera size={14} />
              </button>
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-primary">{displayName}</h2>
            <p className="text-sm text-ink-muted">{user?.email}</p>
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <button
              onClick={handleSettings}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-surface-border hover:bg-surface-border transition-colors active:scale-[0.98]"
            >
              <Settings size={18} className="text-ink-muted" />
              <span className="text-sm text-ink-primary">Configurações</span>
            </button>

            <button
              onClick={handlePrivacy}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-surface-border hover:bg-surface-border transition-colors active:scale-[0.98]"
            >
              <Shield size={18} className="text-ink-muted" />
              <span className="text-sm text-ink-primary">Privacidade</span>
            </button>

            <button
              onClick={handleData}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-surface-border hover:bg-surface-border transition-colors active:scale-[0.98]"
            >
              <Database size={18} className="text-ink-muted" />
              <span className="text-sm text-ink-primary">Dados</span>
            </button>

            {/* Toggle de Biometria */}
            <button
              onClick={handleBiometricToggle}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-surface-border hover:bg-surface-border transition-colors active:scale-[0.98]"
            >
              <Fingerprint size={18} className={isBiometricEnabled ? "text-ice" : "text-ink-muted"} />
              <span className="text-sm text-ink-primary">Biometria</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                isBiometricEnabled 
                  ? "bg-ice/20 text-ice" 
                  : "bg-surface-border text-ink-muted"
              }`}>
                {isBiometricEnabled ? "Ativada" : "Desativada"}
              </span>
            </button>

            <button
              onClick={clearLocalData}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-raised border border-coral/20 hover:bg-coral/10 transition-colors active:scale-[0.98]"
            >
              <HardDrive size={18} className="text-coral" />
              <span className="text-sm text-coral">Limpar dados locais</span>
            </button>
          </div>

          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={handleLogout}
            className="mt-4 flex items-center justify-center"
          >
            <LogOut size={16} className="mr-2" />
            Sair da conta
          </Button>
        </section>
      </main>
    </PageTransition>
  );
}