"use client";

import { useEffect, useRef } from "react";

let openDialogCount = 0;
let previousBodyOverflow = "";

/** Keeps modal sheets keyboard-accessible without leaking scroll locks. */
export function useDialogGuard(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const focusOrigin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openDialogCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDialogCount += 1;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openDialogCount = Math.max(0, openDialogCount - 1);
      if (openDialogCount === 0) document.body.style.overflow = previousBodyOverflow;
      focusOrigin?.focus({ preventScroll: true });
    };
  }, [open]);
}
