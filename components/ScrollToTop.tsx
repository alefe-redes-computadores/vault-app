"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

interface ScrollToTopProps {
  threshold?: number; // pixels para aparecer
  className?: string;
}

export function ScrollToTop({ threshold = 300, className = "" }: ScrollToTopProps) {
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
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className={`fixed bottom-24 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-ice/10 border border-ice/20 text-ice shadow-lg shadow-ice/10 backdrop-blur-xl hover:bg-ice/20 transition-all active:scale-95 ${className}`}
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}