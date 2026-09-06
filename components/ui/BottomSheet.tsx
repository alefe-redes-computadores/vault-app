"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  X,
} from "lucide-react";

import {
  useHapticFeedback,
} from "@/lib/haptics";

interface BottomSheetProps {
  isOpen: boolean;

  onClose: () => void;

  children:
    React.ReactNode;

  title?: string;

  height?:
    | "auto"
    | "half"
    | "full";
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = "auto",
}: BottomSheetProps) {
  const {
    trigger,
  } =
    useHapticFeedback();

  const sheetRef =
    useRef<HTMLDivElement>(
      null
    );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      const handleEscape =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            onClose();
          }
        };

      document.addEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow =
        "hidden";

      return () => {
        document.removeEventListener(
          "keydown",
          handleEscape
        );

        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      isOpen,
      onClose,
    ]
  );

  if (
    !isOpen
  ) {
    return null;
  }

  const heights = {
    auto:
      "max-h-[90dvh]",

    half:
      "h-[50dvh]",

    full:
      "h-[90dvh]",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onPointerDown={
        (
          event
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose();
          }
        }
      }
    >
      <div
        ref={
          sheetRef
        }
        role="dialog"
        aria-modal="true"
        aria-label={
          title ??
          "Painel"
        }
        onPointerDown={
          (
            event
          ) =>
            event.stopPropagation()
        }
        className={`
          relative w-full max-w-lg overflow-hidden rounded-sheet
          border border-surface-border bg-surface-raised shadow-vault
          animate-in slide-in-from-bottom duration-300
          ${heights[height]}
        `}
      >
        <div className="relative flex items-center justify-between border-b border-surface-border p-4">
          <div className="absolute -top-3 left-1/2 mx-auto h-1 w-10 -translate-x-1/2 rounded-full bg-ice/30" />

          {title && (
            <h2 className="font-display text-lg text-ink-primary">
              {
                title
              }
            </h2>
          )}

          <button
            type="button"
            aria-label="Fechar"
            onClick={
              () => {
                trigger(
                  "vibrate"
                );

                onClose();
              }
            }
            className="ml-auto rounded-full p-1 transition-colors hover:bg-ice/10 hover:text-ice"
          >
            <X
              size={
                20
              }
              className="text-ink-muted"
            />
          </button>
        </div>

        <div className="max-h-[calc(90dvh-4rem)] overflow-y-auto p-4">
          {
            children
          }
        </div>
      </div>
    </div>
  );
}
