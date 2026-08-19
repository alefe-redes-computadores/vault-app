// hooks/useSubmitAction.ts
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useHapticFeedback } from "@/lib/haptics";

export function useSubmitAction() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();

  const run = useCallback(
    async (
      action: () => Promise<any>, // <-- CORRIGIDO AQUI (antes era void)
      opts: {
        successMessage: string;
        errorMessage: string;
        goBackOnSuccess?: boolean;
      }
    ) => {
      if (isSubmitting) return; 
      setIsSubmitting(true);
      
      try {
        await action();
        trigger("success");
        showToast(opts.successMessage, "success");
        if (opts.goBackOnSuccess) {
          router.back();
        }
      } catch (err) {
        console.error(err);
        trigger("error");
        showToast(opts.errorMessage, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, router, showToast, trigger]
  );

  return { run, isSubmitting };
}
