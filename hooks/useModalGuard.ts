"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Shared guard for presentation-only dialogs. Never commits application data. */
const layers: symbol[] = [];
let previousBodyOverflow = "";
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalGuardArgs {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  canDismiss?: boolean;
}

export function useModalGuard({ open, dialogRef, onClose, canDismiss = true }: ModalGuardArgs) {
  const closeRef = useRef(onClose);
  const dismissRef = useRef(canDismiss);
  closeRef.current = onClose;
  dismissRef.current = canDismiss;

  useEffect(() => {
    if (!open) return;
    const token = Symbol("vault-modal");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (layers.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    layers.push(token);
    const onTop = () => layers[layers.length - 1] === token;
    const frame = window.requestAnimationFrame(() => {
      if (onTop()) dialogRef.current?.focus({ preventScroll: true });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (!onTop() || event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (!dismissRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const stops = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) =>
        item.tabIndex >= 0 && !item.hasAttribute("hidden") && item.getAttribute("aria-hidden") !== "true" &&
        (typeof item.getClientRects !== "function" || item.getClientRects().length > 0)
      );
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
      } else if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(frame);
      const wasTop = onTop();
      const index = layers.indexOf(token);
      if (index !== -1) layers.splice(index, 1);
      if (layers.length === 0) document.body.style.overflow = previousBodyOverflow;
      if (wasTop && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, dialogRef]);
}
