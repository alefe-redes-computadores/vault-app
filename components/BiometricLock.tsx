"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, FaceIcon, Eye, Shield, Lock } from "lucide-react";
import { useBiometric } from "@/hooks/useBiometric";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface BiometricLockProps {
  children: React.ReactNode;
}

export function BiometricLock({ children }: BiometricLockProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);

  const {
    isAvailable,
    isAuthenticated,
    isLoading,
    biometricType,
    authenticate,
    reset,
  } = useBiometric({
    onSuccess: () => {
      console.log("Autenticado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro na biometria:", error);
    },
    title: "Desbloqueie o Vault",
    subtitle: "Use sua impressão digital ou Face ID",
    description: "Mantenha seus documentos seguros",
  });

  // Verifica se o usuário está logado
  if (!user) {
    return <>{children}</>;
  }

  // Se não houver biometria disponível, mostra o conteúdo normalmente
  if (!isAvailable && !isLoading) {
    return <>{children}</>;
  }

  // Se já autenticou, mostra o conteúdo
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Enquanto verifica disponibilidade, mostra loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ice border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-4">Verificando biometria...</p>
        </div>
      </div>
    );
  }

  const iconMap = {
    fingerprint: Fingerprint,
    face: FaceIcon,
    iris: Eye,
    none: Lock,
  };

  const IconComponent = iconMap[biometricType] || Lock;
  const iconLabel =
    biometricType === "fingerprint"
      ? "Impressão digital"
      : biometricType === "face"
      ? "Face ID"
      : biometricType === "iris"
      ? "Íris"
      : "Biometria";

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-ice/10 border-2 border-ice/30 mb-6">
            <Shield size={40} className="text-ice" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-primary">
            Vault
          </h1>
          <p className="text-sm text-ink-muted mt-2">
            Seus documentos estão protegidos
          </p>
        </div>

        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-8 rounded-card bg-surface border border-surface-border shadow-vault"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-ice/10 flex items-center justify-center">
              <IconComponent size={40} className="text-ice" />
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-ink-primary">
                {iconLabel}
              </h2>
              <p className="text-sm text-ink-muted mt-1">
                Toque no botão abaixo para autenticar
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full flex items-center justify-center gap-2"
              onClick={authenticate}
            >
              <Lock size={16} />
              Autenticar com {iconLabel}
            </Button>

            {!showFallback ? (
              <button
                onClick={() => setShowFallback(true)}
                className="text-xs text-ink-muted hover:text-ink-primary transition-colors mt-2"
              >
                Usar senha do dispositivo
              </button>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-ink-muted">
                  A autenticação biométrica falhou?
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={authenticate}
                >
                  Tentar novamente
                </Button>
                <button
                  onClick={() => {
                    reset();
                    router.push("/login");
                  }}
                  className="text-xs text-coral hover:text-coral/80 transition-colors"
                >
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}