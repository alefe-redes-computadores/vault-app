"use client";

import { motion } from "framer-motion";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-void px-5 pt-6 pb-28">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-raised animate-pulse" />
          <div>
            <div className="w-32 h-5 bg-surface-raised rounded animate-pulse" />
            <div className="w-20 h-3 bg-surface-raised rounded mt-1 animate-pulse" />
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-surface-raised animate-pulse" />
      </div>

      {/* Pessoas skeleton */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <div className="w-16 h-3 bg-surface-raised rounded animate-pulse" />
          <div className="w-16 h-3 bg-surface-raised rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-full bg-surface-raised animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      {/* Favoritos skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-surface-raised rounded animate-pulse" />
          <div className="w-20 h-4 bg-surface-raised rounded animate-pulse" />
        </div>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="w-full h-20 bg-surface-raised rounded-xl animate-pulse mb-3"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Cards skeleton */}
      {[1, 2, 3].map((category) => (
        <div key={category} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-surface-raised rounded animate-pulse" />
            <div className="w-24 h-4 bg-surface-raised rounded animate-pulse" />
          </div>
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="w-full h-24 bg-surface-raised rounded-xl animate-pulse mb-3"
              style={{ animationDelay: `${(category + card) * 0.1}s` }}
            />
          ))}
        </div>
      ))}

      {/* ✅ Bolinha pulsante discreta (sem cadeado) */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0,
          }}
          className="w-2.5 h-2.5 rounded-full bg-ice/60"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
          className="w-2.5 h-2.5 rounded-full bg-ice/40"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
          className="w-2.5 h-2.5 rounded-full bg-ice/20"
        />
      </div>
    </div>
  );
}