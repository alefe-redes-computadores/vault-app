"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Shield } from "lucide-react";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

interface BiometricLockProps {
  children: React.ReactNode;
}

export function BiometricLock({ children }: BiometricLockProps) {
  const { isEnabled, isAvailable, authenticate } = useBiometricPreference();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(!isEnabled);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEnabled && isAvailable) {
      handleAuthenticate();
    } else {
      setIsAuthenticated(true);
    }
  }, [isEnabled, isAvailable]);

  const handleAuthenticate = async () => {
    if (!isAvailable || !isEnabled) {
      setIsAuthenticated(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticate();
      if (result) {
        setIsAuthenticated(true);
        trigger("success");
      } else {
        showToast("Biometria não reconhecida. Tente novamente.", "error");
        trigger("error");
        // Tenta novamente após 1 segundo
        setTimeout(() => handleAuthenticate(), 1000);
      }
    } catch (error) {
      console.error("Erro na autenticação biométrica:", error);
      showToast("Erro ao autenticar. Tente novamente.", "error");
      trigger("error");
      setTimeout(() => handleAuthenticate(), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEnabled) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void">
        {/* Ícone animado */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ice/20 to-ice/5 border border-ice/20 flex items-center justify-center shadow-2xl shadow-ice/10"
          >
            <Fingerprint size={40} className="text-ice" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6 font-display text-xl font-semibold text-ink-primary"
        >
          Desbloquear Vault
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-1 text-sm text-ink-muted"
        >
          {isLoading ? "Verificando..." : "Toque no sensor para desbloquear"}
        </motion.p>

        {/* Bolinha pulsante discreta */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-8 flex items-center gap-2"
        >
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0,
            }}
            className="w-2 h-2 rounded-full bg-ice/60"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
            className="w-2 h-2 rounded-full bg-ice/40"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="w-2 h-2 rounded-full bg-ice/20"
          />
        </motion.div>

        {/* Botão para tentar novamente (se falhou) */}
        {!isLoading && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            onClick={handleAuthenticate}
            className="mt-6 text-sm text-ice/70 hover:text-ice transition-colors"
          >
            Tentar novamente
          </motion.button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}