"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useSentry } from "@/hooks/useSentry";
import { BottomNav } from "./BottomNav";
import { ErrorBoundary } from "./ErrorBoundary";
import { ToastProvider } from "./ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { handleNotificationAction } = useNotifications();
  const { setUser, captureException } = useSentry();
  const { processQueue, isOnline } = useSyncQueue();
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  // ============================================================
  // 1. SYNC INICIAL (push) - APENAS UMA VEZ
  // ============================================================
  useEffect(() => {
    if (isOnline && user && !isInitialSyncDone) {
      processQueue().then(() => {
        setIsInitialSyncDone(true);
      });
    }
  }, [isOnline, user, processQueue, isInitialSyncDone]);

  // ============================================================
  // 2. SENTRY - Define usuário
  // ============================================================
  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email || undefined,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
      });
    }
  }, [user, setUser]);

  // ============================================================
  // 3. CAPTURA DE ERROS GLOBAIS (Sentry)
  // ============================================================
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      captureException(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const promiseRejectionHandler = (event: PromiseRejectionEvent) => {
      captureException(event.reason, {
        type: 'unhandledrejection',
        promise: event.promise,
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', promiseRejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', promiseRejectionHandler);
    };
  }, [captureException]);

  // ============================================================
  // 4. AUTH POPUP (Google OAuth)
  // ============================================================
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'auth-success') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ============================================================
  // 5. NOTIFICAÇÕES LOCAIS
  // ============================================================
  useEffect(() => {
    const removeListener = handleNotificationAction((data) => {
      console.log('Notificação clicada:', data);
      
      if (data?.type === 'document_expiry' && data?.docId) {
        router.push(`/detalhes?id=${data.docId}`);
      } else if (data?.type === 'medication_renewal' && data?.medicamentoId) {
        router.push(`/saude/medicamentos/detalhes?id=${data.medicamentoId}`);
      }
    });

    return () => {
      removeListener?.();
    };
  }, [handleNotificationAction, router]);

  // ============================================================
  // 6. REDIRECIONAMENTO (proteção de rotas)
  // ============================================================
  useEffect(() => {
    // Não redireciona se estiver carregando ou se já estiver em login/auth
    if (loading) return;
    if (pathname === '/login' || pathname === '/auth/callback') return;

    if (!user) {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  // ============================================================
  // 7. TELA DE CARREGAMENTO
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ice border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // 8. TELAS PÚBLICAS (login, auth/callback)
  // ============================================================
  if (pathname === '/login' || pathname === '/auth/callback') {
    return (
      <ToastProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  // ============================================================
  // 9. TELAS PRIVADAS (com BottomNav)
  // ============================================================
  // Se não tiver usuário e não estiver em tela pública, ainda assim renderiza
  // (o redirecionamento vai acontecer, mas evita flash de tela)
  if (!user) {
    return (
      <ToastProvider>
        <ErrorBoundary>
          <div className="min-h-screen">
            {children}
          </div>
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="min-h-screen pb-24">
          {children}
          <BottomNav />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}