"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTop({
  threshold = 300,
  className = "",
}: ScrollToTopProps) {
  const { trigger } = useHapticFeedback();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    trigger("vibrate");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.92 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={scrollToTop}
          aria-label="Voltar ao topo"
          className={`fixed bottom-24 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-ice/15 bg-surface/92 text-ice shadow-lg shadow-black/15 backdrop-blur-xl transition-all active:scale-95 hover:bg-surface-raised ${className}`}
        >
          <ArrowUp size={19} strokeWidth={2.4} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}