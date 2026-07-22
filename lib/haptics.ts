type HapticPattern = "success" | "error" | "vibrate" | "heavy" | "light";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  success: [10, 50, 10],      // 2 vibrações curtas
  error: [30, 50, 30, 50, 30], // 3 vibrações longas
  vibrate: 10,                 // 1 vibração curta
  heavy: [20, 40, 20, 40, 20], // 3 vibrações médias
  light: 5,                    // 1 vibração muito curta
};

export function useHapticFeedback() {
  const trigger = (pattern: HapticPattern = "vibrate") => {
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    
    const patternValue = PATTERNS[pattern];
    navigator.vibrate(patternValue);
  };

  return { trigger };
}

// Função standalone para uso em lugares que não são hooks
export function triggerHaptic(pattern: HapticPattern = "vibrate") {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(PATTERNS[pattern]);
}