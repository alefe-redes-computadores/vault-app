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
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => string;
  showSuccess: (message: string, duration?: number, action?: ToastAction) => string;
  showError: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number, action?: ToastAction) => string;
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
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 3000, action?: ToastAction) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 6);
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
      return showToast(message, "success", duration, action);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration: number = 4000) => {
      return showToast(message, "error", duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration: number = 3000, action?: ToastAction) => {
      return showToast(message, "info", duration, action);
    },
    [showToast]
  );

  const showLoading = useCallback(
    (message: string) => {
      return showToast(message, "loading", 0);
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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={() => hideToast(toast.id)}
                action={toast.action}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}