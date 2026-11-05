"use client";

import { useCallback, useEffect, useRef, useState, type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from "lucide-react";

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
  icon?: ElementType;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
};

const ACCENTS = {
  success: {
    ring: "border-emerald-400/20",
    glow: "shadow-emerald-500/10",
    iconWrap: "bg-emerald-400/12 text-emerald-300",
    action: "text-emerald-300 hover:bg-emerald-400/10",
  },
  error: {
    ring: "border-coral/20",
    glow: "shadow-coral/10",
    iconWrap: "bg-coral/12 text-coral",
    action: "text-coral hover:bg-coral/10",
  },
  info: {
    ring: "border-ice/20",
    glow: "shadow-ice/10",
    iconWrap: "bg-ice/12 text-ice",
    action: "text-ice hover:bg-ice/10",
  },
  loading: {
    ring: "border-ice/20",
    glow: "shadow-ice/10",
    iconWrap: "bg-ice/12 text-ice",
    action: "text-ice hover:bg-ice/10",
  },
};

export function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
  action,
  icon: CustomIcon,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const dismiss = useCallback(() => {
    setIsVisible(false);
    if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => onCloseRef.current(), 220);
  }, []);
  useEffect(() => {
    // Zero is reserved for an indefinite loading toast. Never dismiss on 0ms.
    if (type === "loading" || duration <= 0) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, dismiss, type]);
  useEffect(() => () => {
    if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current);
  }, []);

  // Se um ícone customizado foi enviado, use-o. Senão, pegue o padrão do tipo.
  const Icon = CustomIcon || ICONS[type];
  const accent = ACCENTS[type];

  // Só aplica a animação de giro se for o ícone de loading oficial (sem customização)
  const isSpin = type === "loading" && !CustomIcon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="pointer-events-auto w-full max-w-sm"
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            role={type === "error" ? "alert" : "status"}
            aria-live={type === "error" ? "assertive" : "polite"}
            className={[
              "flex items-center gap-2 rounded-xl border bg-surface/92 px-3 py-2 backdrop-blur-xl",
              "shadow-lg",
              accent.ring,
              accent.glow,
            ].join(" ")}
          >
            <div
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/5",
                accent.iconWrap,
              ].join(" ")}
            >
              <Icon size={17} className={isSpin ? "animate-spin" : ""} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 text-ink-primary">{message}</p>

              {action && (
                <button
                  onClick={() => {
                    action.onClick();
                    dismiss();
                  }}
                  className={[
                    "mt-2 inline-flex rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors",
                    accent.action,
                  ].join(" ")}
                >
                  {action.label}
                </button>
              )}
            </div>

            {type !== "loading" && (
              <button
                onClick={dismiss}
                aria-label="Fechar toast"
                className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
