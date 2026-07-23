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
import { pullAllData } from "@/lib/sync/pull";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { handleNotificationAction } = useNotifications();
  const { setUser, captureException } = useSentry();
  const { processQueue, isOnline } = useSyncQueue();
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
  const [isPullDone, setIsPullDone] = useState(false);

  // ============================================================
  // 1. PULL DOS DADOS DO SUPABASE (executado após login)
  // ============================================================
  useEffect(() => {
    if (user && !loading && !isPullDone) {
      console.log('🔵 Usuário logado, executando pullAllData...');
      pullAllData(user.id)
        .then(() => {
          console.log('✅ Pull concluído com sucesso!');
          setIsPullDone(true);
        })
        .catch((err) => {
          console.error('❌ Erro no pull:', err);
          // Mesmo com erro, marca como tentado para não bloquear
          setIsPullDone(true);
        });
    }
  }, [user, loading, isPullDone]);

  // ============================================================
  // 2. SYNC INICIAL (push) - APENAS UMA VEZ
  // ============================================================
  useEffect(() => {
    if (isOnline && user && !isInitialSyncDone && isPullDone) {
      processQueue().then(() => {
        setIsInitialSyncDone(true);
      });
    }
  }, [isOnline, user, processQueue, isInitialSyncDone, isPullDone]);

  // ============================================================
  // 3. SENTRY - Define usuário
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
  // 4. CAPTURA DE ERROS GLOBAIS (Sentry)
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
  // 5. AUTH POPUP (Google OAuth)
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
  // 6. NOTIFICAÇÕES LOCAIS
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
  // 7. REDIRECIONAMENTO (proteção de rotas)
  // ============================================================
  useEffect(() => {
    if (loading) return;
    if (pathname === '/login' || pathname === '/auth/callback') return;

    if (!user) {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  // ============================================================
  // 8. TELA DE CARREGAMENTO
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
  // 9. TELAS PÚBLICAS (login, auth/callback)
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
  // 10. TELAS PRIVADAS (com BottomNav)
  // ============================================================
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