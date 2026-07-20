"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

interface SplashScreenProps {
  children: React.ReactNode;
  minDisplayTime?: number;
}

export function SplashScreen({ children, minDisplayTime = 1500 }: SplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {/* Logo/Ícone animado */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
              className="relative"
            >
              <motion.div
                animate={{
                  scale: [1, 1.06, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ice/20 to-ice/5 border border-ice/20 flex items-center justify-center shadow-2xl shadow-ice/10"
              >
                <Shield size={40} className="text-ice" strokeWidth={1.5} />
              </motion.div>
            </motion.div>

            {/* Nome do app */}
            <motion.h1
              className="mt-6 font-display text-2xl font-semibold text-ink-primary tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              Vault
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              className="mt-1 text-sm text-ink-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.55 }}
            >
              Seus documentos, sempre à mão
            </motion.p>

            {/* Bolinhas pulsantes (mais suaves) */}
            <motion.div
              className="mt-8 flex items-center gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.75 }}
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
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && children}
    </>
  );
}