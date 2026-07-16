"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "border-green-500/40 bg-green-500/10 text-green-400",
    error: "border-coral/40 bg-coral/10 text-coral",
    info: "border-ice/40 bg-ice/10 text-ice",
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: AlertCircle,
  };

  const Icon = icons[type];

  return (
    <div
      className={`fixed top-6 left-4 right-4 z-50 max-w-md mx-auto transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
      }`}
    >
      <div className={`flex items-center gap-3 rounded-xl border p-4 bg-surface-raised backdrop-blur-sm ${colors[type]}`}>
        <Icon size={18} className="flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="p-1 rounded-full hover:bg-surface-border transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}