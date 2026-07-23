"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

interface SplashScreenProps {
  children: React.ReactNode;
  minDisplayTime?: number;
}

export function SplashScreen({
  children,
  minDisplayTime = 1500,
}: SplashScreenProps) {
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
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void px-6"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.12 }}
              className="w-full max-w-xs rounded-[32px] border border-surface-border/50 bg-surface px-8 py-12 text-center shadow-vault"
            >
              <motion.div
                animate={{ scale: [1, 1.035, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-ice/15 bg-surface-raised"
              >
                <Shield size={38} className="text-ice" strokeWidth={1.6} />
              </motion.div>

              <motion.h1
                className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink-primary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.24 }}
              >
                Vault
              </motion.h1>

              <motion.p
                className="mt-1 text-sm text-ink-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.38 }}
              >
                Seus documentos, sempre à mão
              </motion.p>

              <motion.div
                className="mt-8 flex items-center justify-center gap-2.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                {[0, 0.16, 0.32].map((delay) => (
                  <motion.div
                    key={delay}
                    animate={{
                      scale: [1, 1.35, 1],
                      opacity: [0.28, 1, 0.28],
                    }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay,
                    }}
                    className="h-2.5 w-2.5 rounded-full bg-ice/45"
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading && children}
    </>
  );
}