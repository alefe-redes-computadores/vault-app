"use client";
import { useEffect, type RefObject } from "react";

/** Shared dismissal of the hydrated medication catalog popover (no catalog fetch). */
export function useMedicationCatalogDismiss(
  isOpen: boolean,
  popoverRef: RefObject<HTMLElement>,
  onOpenChange: (open: boolean) => void,
): void {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, popoverRef, onOpenChange]);
}
