// hooks/useAndroidModalViewport.ts
"use client";

import { useEffect, useMemo, useState } from "react";

type ModalViewport = {
  height: number | null;
  offsetTop: number;
  keyboardOpen: boolean;
};

const INITIAL: ModalViewport = { height: null, offsetTop: 0, keyboardOpen: false };

/**
 * Autoridade compartilhada para modais no Android/PWA.
 * visualViewport encolhe quando o teclado abre; 100dvh sozinho não é
 * confiável em todas as versões do WebView. Não bloqueia zoom/acessibilidade.
 */
export function useAndroidModalViewport(open: boolean) {
  const [state, setState] = useState<ModalViewport>(INITIAL);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      setState(INITIAL);
      return;
    }
    const viewport = window.visualViewport;
    const update = () => {
      const height = Math.max(240, Math.round(viewport?.height ?? window.innerHeight));
      const offsetTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0));
      const keyboardOpen = window.innerHeight - height > 120;
      setState({ height, offsetTop, keyboardOpen });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches("input, textarea, [contenteditable='true']")) return;
      window.setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [open]);

  return useMemo(() => ({
    keyboardOpen: state.keyboardOpen,
    layerStyle: state.height == null ? undefined : {
      height: `${state.height}px`,
      top: `${state.offsetTop}px`,
      bottom: "auto",
    },
  }), [state]);
}
