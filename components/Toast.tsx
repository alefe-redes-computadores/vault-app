"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "loading";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
};

const COLORS = {
  success: "border-green-500/30 bg-green-500/10 text-green-400",
  error: "border-coral/30 bg-coral/10 text-coral",
  info: "border-ice/30 bg-ice/10 text-ice",
  loading: "border-ice/30 bg-ice/10 text-ice",
};

export function Toast({ message, type = "info", duration = 3000, onClose, action }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (type === "loading") return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, type]);

  const Icon = ICONS[type];
  const colorClass = COLORS[type];
  const isSpin = type === "loading";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="w-full max-w-sm pointer-events-auto"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`flex items-center gap-3 rounded-xl border p-3.5 backdrop-blur-xl bg-surface/90 shadow-vault ${colorClass}`}>
            <Icon size={18} className={`flex-shrink-0 ${isSpin ? "animate-spin" : ""}`} />
            <span className="flex-1 text-sm text-ink-primary">{message}</span>
            {action && (
              <button
                onClick={() => {
                  action.onClick();
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="text-xs font-medium text-ice hover:text-ice/80 transition-colors px-2 py-1 rounded-lg bg-ice/10 hover:bg-ice/20"
              >
                {action.label}
              </button>
            )}
            {type !== "loading" && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="p-0.5 rounded-full hover:bg-surface-border transition-colors flex-shrink-0"
              >
                <X size={14} className="text-ink-muted" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}