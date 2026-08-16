"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toast, ToastType } from "./Toast";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
  icon?: React.ElementType; // 🚀 Injeção recomendada pelo Claude
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    action?: ToastAction,
    icon?: React.ElementType
  ) => string;
  showSuccess: (message: string, duration?: number, action?: ToastAction, icon?: React.ElementType) => string;
  showError: (message: string, duration?: number, icon?: React.ElementType) => string;
  showInfo: (message: string, duration?: number, action?: ToastAction, icon?: React.ElementType) => string;
  showLoading: (message: string, icon?: React.ElementType) => string;
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
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      duration: number = 3000,
      action?: ToastAction,
      icon?: React.ElementType
    ) => {
      const id =
        Date.now().toString() + Math.random().toString(36).slice(2, 8);

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          duration,
          action,
          icon,
        },
      ]);

      return id;
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, duration: number = 3000, action?: ToastAction, icon?: React.ElementType) => {
      return showToast(message, "success", duration, action, icon);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration: number = 4000, icon?: React.ElementType) => {
      return showToast(message, "error", duration, undefined, icon);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration: number = 3000, action?: ToastAction, icon?: React.ElementType) => {
      return showToast(message, "info", duration, action, icon);
    },
    [showToast]
  );

  const showLoading = useCallback(
    (message: string, icon?: React.ElementType) => {
      return showToast(message, "loading", 0, undefined, icon);
    },
    [showToast]
  );

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

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4 sm:top-5">
        <div className="w-full max-w-sm">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div layout className="space-y-2">
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => hideToast(toast.id)}
                    action={toast.action}
                    icon={toast.icon} // 🚀 Repassando a propriedade para o componente visual
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}
