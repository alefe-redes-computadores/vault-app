"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint } from "lucide-react";
import { useBiometricPreference } from "@/hooks/useBiometricPreference";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";

interface BiometricLockProps {
  children: React.ReactNode;
}

export function BiometricLock({ children }: BiometricLockProps) {
  const { isEnabled, isLoading: isBiometricLoading, toggle } = useBiometricPreference();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(!isEnabled);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Atualiza classe do body e dispara evento para BottomNav
  useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.remove('biometric-locked');
    } else {
      document.body.classList.add('biometric-locked');
    }
    // Dispara evento personalizado para o BottomNav reagir
    window.dispatchEvent(new Event('biometric:lockchange'));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isEnabled) {
      setIsAuthenticated(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsAuthenticated(true);
      trigger("success");
    }, 1200);

    return () => clearTimeout(timer);
  }, [isEnabled, trigger]);

  const handleAuthenticate = () => {
    if (!isEnabled) {
      setIsAuthenticated(true);
      return;
    }

    setIsLoading(true);
    trigger("vibrate");

    setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
      trigger("success");
      showToast("Autenticado com sucesso!", "success");
    }, 1200);
  };

  if (!isEnabled) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void">
      {/* Ícone animado */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
          }}
          transition={{
            duration: 2.5,
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
        initial={{ opacity: 0, y: 12 }}
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

      {/* Bolinhas pulsantes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="mt-8 flex items-center gap-2.5"
      >
        {[0, 0.2, 0.4].map((delay) => (
          <motion.div
            key={delay}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
            className="w-2.5 h-2.5 rounded-full bg-ice/50"
          />
        ))}
      </motion.div>

      {/* Botão para tentar novamente */}
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