// components/ToastProvider.tsx
"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Toast,
  type ToastType,
} from "./Toast";

// ============================================================
// TIPOS
// ============================================================

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
  icon?: React.ElementType;
}

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
  icon?: React.ElementType;
}

export interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    action?: ToastAction,
    icon?: React.ElementType
  ) => string;

  showSuccess: (
    message: string,
    duration?: number,
    action?: ToastAction,
    icon?: React.ElementType
  ) => string;

  showError: (
    message: string,
    duration?: number,
    icon?: React.ElementType
  ) => string;

  showInfo: (
    message: string,
    duration?: number,
    action?: ToastAction,
    icon?: React.ElementType
  ) => string;

  showLoading: (
    message: string,
    icon?: React.ElementType
  ) => string;

  updateToast: (
    id: string,
    data: Partial<
      Omit<ToastData, "id">
    >
  ) => void;

  hideToast: (
    id: string
  ) => void;

  clearToasts: () => void;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const MAX_VISIBLE_TOASTS = 4;

const ToastContext =
  createContext<
    ToastContextType | undefined
  >(undefined);

// ============================================================
// HELPERS
// ============================================================

function createToastId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ============================================================
// HOOK
// ============================================================

export function useToast() {
  const context =
    useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used within ToastProvider"
    );
  }

  return context;
}

// ============================================================
// PROVIDER
// ============================================================

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] =
    useState<ToastData[]>([]);

  // ==========================================================
  // REMOVE
  // ==========================================================

  const hideToast = useCallback(
    (id: string) => {
      setToasts((current) =>
        current.filter(
          (toast) =>
            toast.id !== id
        )
      );
    },
    []
  );

  const clearToasts =
    useCallback(() => {
      setToasts([]);
    }, []);

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateToast = useCallback(
    (
      id: string,
      data: Partial<
        Omit<ToastData, "id">
      >
    ) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                ...data,
              }
            : toast
        )
      );
    },
    []
  );

  // ==========================================================
  // CREATE
  // ==========================================================

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      duration: number = 3000,
      action?: ToastAction,
      icon?: React.ElementType
    ) => {
      const id =
        createToastId();

      const newToast: ToastData = {
        id,
        message,
        type,
        duration,
        action,
        icon,
      };

      setToasts((current) => {
        /**
         * Mantemos somente os mais recentes.
         *
         * Isso evita uma pilha enorme de notificações
         * quando várias operações acontecem em sequência.
         */
        const next = [
          ...current,
          newToast,
        ];

        return next.slice(
          -MAX_VISIBLE_TOASTS
        );
      });

      return id;
    },
    []
  );

  // ==========================================================
  // HELPERS SEMÂNTICOS
  // ==========================================================

  const showSuccess = useCallback(
    (
      message: string,
      duration: number = 3000,
      action?: ToastAction,
      icon?: React.ElementType
    ) => {
      return showToast(
        message,
        "success",
        duration,
        action,
        icon
      );
    },
    [showToast]
  );

  const showError = useCallback(
    (
      message: string,
      duration: number = 4000,
      icon?: React.ElementType
    ) => {
      return showToast(
        message,
        "error",
        duration,
        undefined,
        icon
      );
    },
    [showToast]
  );

  const showInfo = useCallback(
    (
      message: string,
      duration: number = 3000,
      action?: ToastAction,
      icon?: React.ElementType
    ) => {
      return showToast(
        message,
        "info",
        duration,
        action,
        icon
      );
    },
    [showToast]
  );

  const showLoading = useCallback(
    (
      message: string,
      icon?: React.ElementType
    ) => {
      return showToast(
        message,
        "loading",
        0,
        undefined,
        icon
      );
    },
    [showToast]
  );

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value =
    useMemo<ToastContextType>(
      () => ({
        showToast,
        showSuccess,
        showError,
        showInfo,
        showLoading,
        updateToast,
        hideToast,
        clearToasts,
      }),
      [
        showToast,
        showSuccess,
        showError,
        showInfo,
        showLoading,
        updateToast,
        hideToast,
        clearToasts,
      ]
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <ToastContext.Provider
      value={value}
    >
      {children}

      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4 sm:top-5"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="w-full max-w-sm">
          <AnimatePresence
            initial={false}
            mode="popLayout"
          >
            <motion.div
              layout
              className="space-y-2"
            >
              {toasts.map(
                (toast) => (
                  <motion.div
                    key={
                      toast.id
                    }
                    layout
                    initial={{
                      opacity: 0,
                      y: -12,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -10,
                      scale: 0.98,
                    }}
                    transition={{
                      duration: 0.18,
                      ease: [
                        0.16,
                        1,
                        0.3,
                        1,
                      ],
                    }}
                  >
                    <Toast
                      message={
                        toast.message
                      }
                      type={
                        toast.type
                      }
                      duration={
                        toast.duration
                      }
                      onClose={() =>
                        hideToast(
                          toast.id
                        )
                      }
                      action={
                        toast.action
                      }
                      icon={
                        toast.icon
                      }
                    />
                  </motion.div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}