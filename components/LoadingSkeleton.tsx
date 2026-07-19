"use client";

import { motion } from "framer-motion";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-20 h-20 rounded-full bg-ice/10 border-2 border-ice/30 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-primary animate-pulse">
          Vault
        </h1>
        <div className="w-48 h-1 bg-surface-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-ice rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="text-sm text-ink-muted">Carregando seus documentos...</p>
      </motion.div>
    </div>
  );
}