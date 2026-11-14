// components/PageTransition.tsx
"use client";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({
  children,
}: PageTransitionProps) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      // Evita quadro vazio/flash no Android: página já aparece no primeiro frame.
      // Mantém os parâmetros de movimento posteriores e a preferência reduzida.
      initial={false}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration:
          reduceMotion
            ? 0
            : 0.16,

        ease: [
          0.16,
          1,
          0.3,
          1,
        ],
      }}
    >
      {children}
    </motion.div>
  );
}
