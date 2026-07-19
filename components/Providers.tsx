"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useSentry } from "@/hooks/useSentry";
import { BottomNav } from "./BottomNav";
import { SyncStatus } from "./SyncStatus";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isSyncing } = useAuth();
  const { handleNotificationAction } = useNotifications();
  const { setUser, captureException } = useSentry();
  const { processQueue, isProcessing, isOnline } = useSyncQueue();

  // Ativa a fila de sincronização (push)
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Define o usuário no Sentry
  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email || undefined,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
      });
    }
  }, [user, setUser]);

  // Captura erros não tratados no React
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

  // Ouvinte para autenticação via popup (Google OAuth)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'auth-success') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Listener para ações das notificações locais
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

  // Redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!loading && !user && pathname !== "/login" && pathname !== "/auth/callback") {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  // Loading
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

  if (!user && pathname !== "/login" && pathname !== "/auth/callback") {
    return <>{children}</>;
  }

  if (pathname === "/login" || pathname === "/auth/callback") {
    return <>{children}</>;
  }

  // Renderiza com header e BottomNav
  return (
    <div className="min-h-screen pb-24">
      {/* Header com SyncStatus (apenas quando logado e não em páginas especiais) */}
      {user && (
        <div className="glass-header sticky top-0 z-10 px-5 py-2 border-b border-surface-border flex items-center justify-end">
          <SyncStatus showLabel />
        </div>
      )}
      {children}
      <BottomNav />
    </div>
  );
}