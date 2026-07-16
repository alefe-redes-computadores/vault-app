"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  height?: "auto" | "half" | "full";
}

export function BottomSheet({ isOpen, onClose, children, title, height = "auto" }: BottomSheetProps) {
  const { trigger } = useHapticFeedback();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const heights = {
    auto: "max-h-[90vh]",
    half: "h-[50vh]",
    full: "h-[90vh]",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in duration-200">
      <div
        ref={sheetRef}
        className={`
          w-full max-w-lg rounded-sheet bg-surface-raised border border-surface-border
          shadow-vault animate-in slide-in-from-bottom duration-300
          ${heights[height]}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <div className="w-10 h-1 rounded-full bg-ink-faint mx-auto absolute left-1/2 -translate-x-1/2 -top-3" />
          {title && (
            <h2 className="font-display text-lg text-ink-primary">{title}</h2>
          )}
          <button
            onClick={() => {
              trigger("vibrate");
              onClose();
            }}
            className="ml-auto p-1 rounded-full hover:bg-surface-border transition-colors"
          >
            <X size={20} className="text-ink-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}