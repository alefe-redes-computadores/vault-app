// components/FloatingSpinner.tsx
"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface FloatingSpinnerProps {
  label?: string;
}

export function FloatingSpinner({ label }: FloatingSpinnerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface/90 px-4 py-2 text-sm text-ink-primary shadow-lg backdrop-blur"
    >
      <Loader2 className="h-4 w-4 animate-spin text-ice" />
      {label && <span>{label}</span>}
    </motion.div>
  );
}