"use client";

import { ReactNode, useEffect, useState } from "react";
import { ToastProvider } from "./ToastProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { SyncProvider } from "@/hooks/useSyncQueue";
import { useSentry } from "@/hooks/useSentry";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Inicializa Sentry (se configurado)
  useSentry();

  if (!mounted) {
    // Previne flash de conteúdo durante hidratação
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-ice border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" enableSystem>
        <AuthProvider>
          <SyncProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SyncProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}