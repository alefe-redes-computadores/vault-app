// components/RouteProgress.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Só mostra se a troca de rota demorar mais que 150ms
    const showTimer = setTimeout(() => setVisible(true), 150);
    const hideTimer = setTimeout(() => setVisible(false), 600);

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      setVisible(false);
    };
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0.6 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 h-[2.5px] origin-left z-[9999] bg-gradient-to-r from-ice to-violet-500"
        />
      )}
    </AnimatePresence>
  );
}