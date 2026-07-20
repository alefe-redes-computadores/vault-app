"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X, Loader2 } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

type ToastType = "success" | "error" | "info" | "loading";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => void;
  showSuccess: (message: string, duration?: number, action?: ToastAction) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number, action?: ToastAction) => void;
  showLoading: (message: string) => string;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { trigger } = useHapticFeedback();

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 3000, action?: ToastAction) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
      setToasts((prev) => [...prev, { id, message, type, duration, action }]);

      if (type !== "loading") {
        setTimeout(() => hideToast(id), duration);
      }

      return id;
    },
    [hideToast]
  );

  const showSuccess = useCallback(
    (message: string, duration: number = 3000, action?: ToastAction) => {
      trigger("success");
      return showToast(message, "success", duration, action);
    },
    [showToast, trigger]
  );

  const showError = useCallback(
    (message: string, duration: number = 4000) => {
      trigger("error");
      return showToast(message, "error", duration);
    },
    [showToast, trigger]
  );

  const showInfo = useCallback(
    (message: string, duration: number = 3000, action?: ToastAction) => {
      trigger("vibrate");
      return showToast(message, "info", duration, action);
    },
    [showToast, trigger]
  );

  const showLoading = useCallback(
    (message: string) => {
      return showToast(message, "loading", 0);
    },
    [showToast]
  );

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle size={18} className="text-green-400 flex-shrink-0" />;
      case "error":
        return <AlertCircle size={18} className="text-coral flex-shrink-0" />;
      case "info":
        return <Info size={18} className="text-ice flex-shrink-0" />;
      case "loading":
        return <Loader2 size={18} className="text-ice animate-spin flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-green-500/30 bg-green-500/10";
      case "error":
        return "border-coral/30 bg-coral/10";
      case "info":
        return "border-ice/30 bg-ice/10";
      case "loading":
        return "border-ice/30 bg-ice/10";
      default:
        return "border-surface-border/50 bg-surface";
    }
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showLoading,
        hideToast,
      }}
    >
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${getColors(
                  toast.type
                )} backdrop-blur-xl bg-surface/90 pointer-events-auto shadow-vault`}
              >
                {getIcon(toast.type)}
                <span className="flex-1 text-sm text-ink-primary">{toast.message}</span>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      hideToast(toast.id);
                    }}
                    className="text-xs font-medium text-ice hover:text-ice/80 transition-colors px-2 py-1 rounded-lg bg-ice/10 hover:bg-ice/20"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => hideToast(toast.id)}
                  className="p-0.5 rounded-full hover:bg-surface-border transition-colors flex-shrink-0"
                >
                  <X size={14} className="text-ink-muted" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}