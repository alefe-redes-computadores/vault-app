type HapticPattern = "success" | "error" | "vibrate";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  success: 15,
  error: [20, 40, 20],
  vibrate: 10,
};

export function useHapticFeedback() {
  const trigger = (pattern: HapticPattern = "vibrate") => {
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    navigator.vibrate(PATTERNS[pattern]);
  };

  return { trigger };
}