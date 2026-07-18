"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback } from "react";

export function useSentry() {
  const captureException = useCallback((error: Error, context?: Record<string, any>) => {
    console.error('Erro capturado:', error);
    Sentry.captureException(error, {
      extra: context,
    });
  }, []);

  const captureMessage = useCallback((message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    console.log(`[${level}]`, message);
    Sentry.captureMessage(message, level);
  }, []);

  const setUser = useCallback((user: { id?: string; email?: string; name?: string }) => {
    Sentry.setUser(user);
  }, []);

  return {
    captureException,
    captureMessage,
    setUser,
  };
}