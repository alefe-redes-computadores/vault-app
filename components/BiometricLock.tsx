"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Fingerprint, ShieldAlert } from "lucide-react";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useBiometric } from "@/hooks/useBiometric";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

interface BiometricLockProps {
  children: React.ReactNode;
}

export function BiometricLock({ children }: BiometricLockProps) {
  const { isEnabled } = useBiometricPreference();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(!isEnabled);
  const [authError, setAuthError] = useState<string | null>(null);
  const hasAutoPrompted = useRef(false);

  const { isAvailable, isLoading, authenticate } = useBiometric({
    title: "Desbloquear Vault",
    subtitle: "Use sua impressão digital ou Face ID para acessar",
    description: "Mantenha seus documentos seguros",
    fallbackTitle: "Usar senha",
    onSuccess: () => {
      setAuthError(null);
      setIsAuthenticated(true);
      trigger("success");
      showToast("Autenticado com sucesso!", "success");
    },
    onError: (error) => {
      trigger("error");
      setAuthError(
        error?.message?.includes("cancel")
          ? "Autenticação cancelada"
          : "Não foi possível reconhecer sua biometria. Tente novamente."
      );
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.remove("biometric-locked");
    } else {
      document.body.classList.add("biometric-locked");
    }
    window.dispatchEvent(new Event("biometric:lockchange"));
  }, [isAuthenticated]);

  // Dispara a biometria automaticamente assim que a tela de bloqueio aparece
  // (só uma vez, evita loop se o usuário cancelar)
  useEffect(() => {
    if (!isEnabled || isAuthenticated || isLoading) return;
    if (hasAutoPrompted.current) return;
    if (!isAvailable) return; // ainda checando disponibilidade

    hasAutoPrompted.current = true;
    authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isAuthenticated, isAvailable, isLoading]);

  const handleAuthenticate = () => {
    trigger("vibrate");
    setAuthError(null);
    authenticate();
  };

  const handleContinueWithoutBiometric = () => {
    trigger("vibrate");
    setIsAuthenticated(true);
  };

  if (!isEnabled) return <>{children}</>;
  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-sm rounded-[32px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-vault"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-ice/15 bg-surface-raised">
          <motion.div
            animate={isLoading ? { scale: [1, 1.06, 1] } : {}}
            transition={{
              duration: 1.1,
              repeat: isLoading ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <Fingerprint size={38} className="text-ice" strokeWidth={1.7} />
          </motion.div>
        </div>

        <h1 className="mt-6 font-display text-xl font-semibold text-ink-primary">
          Desbloquear Vault
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          {isLoading
            ? "Verificando sua biometria..."
            : authError
            ? authError
            : isAvailable === false
            ? "Biometria não configurada neste aparelho"
            : "Use a biometria para continuar com segurança"}
        </p>

        {isLoading && (
          <div className="mt-7 flex items-center justify-center gap-2.5">
            {[0, 0.18, 0.36].map((delay) => (
              <motion.div
                key={delay}
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.25, 1, 0.25],
                }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }}
                className="h-2.5 w-2.5 rounded-full bg-ice/45"
              />
            ))}
          </div>
        )}

        {authError && !isLoading && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-coral">
            <ShieldAlert size={13} />
            <span>{authError}</span>
          </div>
        )}

        {!isLoading && isAvailable !== false && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            onClick={handleAuthenticate}
            className="mt-7 rounded-full bg-ice/10 px-4 py-2 text-sm font-medium text-ice transition-colors active:scale-95 hover:bg-ice/15"
          >
            {authError ? "Tentar novamente" : "Desbloquear"}
          </motion.button>
        )}

        {!isLoading && isAvailable === false && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            onClick={handleContinueWithoutBiometric}
            className="mt-7 rounded-full bg-ice/10 px-4 py-2 text-sm font-medium text-ice transition-colors active:scale-95 hover:bg-ice/15"
          >
            Continuar mesmo assim
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
