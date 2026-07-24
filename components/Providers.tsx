"use client";

import { useEffect, useState } from "react";
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
  const [isPullDone, setIsPullDone] = useState(false);
  const [pullAttempted, setPullAttempted] = useState(false);

  // ============================================================
  // 1. PULL DOS DADOS (tenta no login E quando ficar online)
  // ============================================================
  useEffect(() => {
    if (user && !loading && !isPullDone) {
      console.log("🔵 Usuário logado, executando pullAllData...");
      pullAllData(user.id)
        .then(() => {
          console.log("✅ Pull concluído com sucesso!");
          setIsPullDone(true);
        })
        .catch((err) => {
          console.error("❌ Erro no pull:", err);
          setIsPullDone(true); // Marcamos como tentado, mas o usuário pode forçar via botão
        })
        .finally(() => setPullAttempted(true));
    }
  }, [user, loading, isPullDone]);

  // ============================================================
  // 2. REPULL AO FICAR ONLINE (se já tiver tentado antes)
  // ============================================================
  useEffect(() => {
    if (isOnline && user && pullAttempted && !isPullDone) {
      console.log("🔵 Reconectado, tentando pull novamente...");
      pullAllData(user.id)
        .then(() => {
          console.log("✅ Pull concluído com sucesso!");
          setIsPullDone(true);
        })
        .catch((err) => console.error("❌ Erro no pull após reconectar:", err));
    }
  }, [isOnline, user, pullAttempted, isPullDone]);

  // ============================================================
  // 3. PUSH (processQueue) DEPOIS DO PULL
  // ============================================================
  useEffect(() => {
    if (isOnline && user && isPullDone) {
      console.log("🔄 Executando push (processQueue)...");
      processQueue();
    }
  }, [isOnline, user, isPullDone, processQueue]);

  // ============================================================
  // 4. SENTRY: definir usuário
  // ============================================================
  useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email || undefined,
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
      });
    }
  }, [user, setUser]);

  // ============================================================
  // 5. CAPTURA DE ERROS GLOBAIS
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
        type: "unhandledrejection",
        promise: event.promise,
      });
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", promiseRejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", promiseRejectionHandler);
    };
  }, [captureException]);

  // ============================================================
  // 6. AUTH POPUP (Google)
  // ============================================================
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "auth-success") {
        window.location.reload();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ============================================================
  // 7. NOTIFICAÇÕES
  // ============================================================
  useEffect(() => {
    const removeListener = handleNotificationAction((data) => {
      console.log("Notificação clicada:", data);
      if (data?.type === "document_expiry" && data?.docId) {
        router.push(`/detalhes?id=${data.docId}`);
      } else if (data?.type === "medication_renewal" && data?.medicamentoId) {
        router.push(`/saude/medicamentos/detalhes?id=${data.medicamentoId}`);
      }
    });
    return () => removeListener?.();
  }, [handleNotificationAction, router]);

  // ============================================================
  // 8. REDIRECIONAMENTO
  // ============================================================
  useEffect(() => {
    if (loading) return;
    if (pathname === "/login" || pathname === "/auth/callback") return;
    if (!user) {
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-6">
        <div className="w-full max-w-xs rounded-[28px] border border-surface-border/50 bg-surface px-6 py-10 text-center shadow-vault">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-ice border-t-transparent" />
          <p className="mt-4 font-display text-base font-semibold text-ink-primary">
            Carregando Vault
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Preparando seus dados com segurança
          </p>
        </div>
      </div>
    );
  }

  if (pathname === "/login" || pathname === "/auth/callback") {
    return (
      <ToastProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </ToastProvider>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <ErrorBoundary>
          <div className="min-h-screen">{children}</div>
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