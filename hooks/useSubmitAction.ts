// hooks/useSubmitAction.ts
"use client";

import {
  useCallback,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useHapticFeedback } from "@/lib/haptics";

function getCanonicalSubmitUrl(pathname: string) {
  const normalized =
    pathname.replace(/\/+$/, "");

  const parent = normalized.replace(
    /\/(novo|nova|editar)$/,
    ""
  );

  if (parent !== normalized && parent) {
    return parent;
  }

  if (normalized.startsWith("/saude/")) {
    return "/";
  }

  return "/mais";
}

export function useSubmitAction() {
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();

  const run = useCallback(
    async (
      action: () => Promise<any>,
      opts: {
        successMessage: string;
        errorMessage: string;
        goBackOnSuccess?: boolean;
        successUrl?: string;
      }
    ) => {
      if (isSubmitting) return;

      setIsSubmitting(true);

      try {
        await action();

        trigger("success");
        showToast(
          opts.successMessage,
          "success"
        );

        if (opts.successUrl) {
          router.replace(opts.successUrl);
        } else if (opts.goBackOnSuccess) {
          router.replace(
            getCanonicalSubmitUrl(pathname)
          );
        }
      } catch (err) {
        console.error(err);
        trigger("error");

        const errorDetail =
          err instanceof Error
            ? err.message
            : String(err);

        showToast(
          `${opts.errorMessage}: ${errorDetail}`,
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      pathname,
      router,
      showToast,
      trigger,
    ]
  );

  return {
    run,
    isSubmitting,
  };
}
