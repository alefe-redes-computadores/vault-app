// components/Providers.tsx
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Capacitor,
} from "@capacitor/core";

import {
  StatusBar,
  Style,
} from "@capacitor/status-bar";

import {
  useSyncQueue,
} from "@/hooks/useSyncQueue";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  useNotifications,
} from "@/hooks/useNotifications";

import {
  useSentry,
} from "@/hooks/useSentry";

import {
  useDoseNotificationActions,
} from "@/hooks/useDoseNotificationActions";

import {
  useSupabaseRealtime,
} from "@/hooks/useSupabaseRealtime";

import {
  BottomNav,
} from "./BottomNav";

import {
  ErrorBoundary,
} from "./ErrorBoundary";

import {
  ToastProvider,
} from "./ToastProvider";

import {
  pullAllData,
} from "@/lib/sync/pull";

import {
  db,
} from "@/lib/db";

// ============================================================
// NOTIFICATION ACTION DATA
// ============================================================

interface NotificationActionData {
  type?:
    string;

  docId?:
    string;

  medicamentoId?:
    string;
}

function getNotificationActionData(
  value:
    unknown
): NotificationActionData {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {};
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return {
    type:
      typeof record.type ===
      "string"
        ? record.type
        : undefined,

    docId:
      typeof record.docId ===
      "string"
        ? record.docId
        : undefined,

    medicamentoId:
      typeof record.medicamentoId ===
      "string"
        ? record.medicamentoId
        : undefined,
  };
}

// ============================================================
// PROVIDERS
// ============================================================

export function Providers({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const {
    user,
    loading,
  } =
    useAuth();

  const {
    handleNotificationAction,
  } =
    useNotifications();

  const {
    setUser,
    captureException,
  } =
    useSentry();

  const {
    processQueue,
    isOnline,
  } =
    useSyncQueue();

  const [
    isPullDone,
    setIsPullDone,
  ] =
    useState(
      false
    );

  const hasPulledRef =
    useRef(
      false
    );

  useDoseNotificationActions();

  /*
   * Mantém o canal Realtime ativo enquanto a árvore principal
   * do Vault estiver montada.
   */
  useSupabaseRealtime();

  // ==========================================================
  // NATIVE / DEBUG BOOTSTRAP
  // ==========================================================

  useEffect(
    () => {
      if (
        typeof window !==
        "undefined"
      ) {
        (
          window as typeof window & {
            db?: typeof db;
          }
        ).db =
          db;
      }

      if (
        Capacitor.isNativePlatform()
      ) {
        void StatusBar.setOverlaysWebView({
          overlay:
            true,
        }).catch(
          (
            error
          ) => {
            console.error(
              "Erro ao configurar overlay da StatusBar nativa:",
              error
            );
          }
        );

        void StatusBar.setStyle({
          style:
            Style.Dark,
        }).catch(
          (
            error
          ) => {
            console.error(
              "Erro ao configurar estilo da StatusBar nativa:",
              error
            );
          }
        );
      }
    },
    []
  );

  // ==========================================================
  // INITIAL PULL
  // ==========================================================

  useEffect(
    () => {
      if (
        !user ||
        loading ||
        !isOnline ||
        isPullDone ||
        hasPulledRef.current
      ) {
        return;
      }

      hasPulledRef.current =
        true;

      console.log(
        "Executando pullAllData unificado..."
      );

      pullAllData(
        user.id
      )
        .then(
          () => {
            console.log(
              "Pull concluído com sucesso."
            );

            setIsPullDone(
              true
            );
          }
        )
        .catch(
          (
            error
          ) => {
            console.error(
              "Erro no pull:",
              error
            );

            hasPulledRef.current =
              false;
          }
        );
    },
    [
      user,
      loading,
      isOnline,
      isPullDone,
    ]
  );

  // ==========================================================
  // PUSH QUEUE AFTER PULL
  // ==========================================================

  useEffect(
    () => {
      if (
        isOnline &&
        user &&
        isPullDone
      ) {
        console.log(
          "Executando push da fila de sincronização..."
        );

        void processQueue();
      }
    },
    [
      isOnline,
      user,
      isPullDone,
      processQueue,
    ]
  );

  // ==========================================================
  // SENTRY USER
  // ==========================================================

  useEffect(
    () => {
      if (
        !user
      ) {
        return;
      }

      setUser({
        id:
          user.id,

        email:
          user.email ||
          undefined,

        name:
          user.user_metadata?.full_name ||
          user.email?.split(
            "@"
          )[
            0
          ],
      });
    },
    [
      user,
      setUser,
    ]
  );

  // ==========================================================
  // GLOBAL ERRORS
  // ==========================================================

  useEffect(
    () => {
      const errorHandler =
        (
          event:
            ErrorEvent
        ) => {
          captureException(
            event.error,
            {
              message:
                event.message,

              filename:
                event.filename,

              lineno:
                event.lineno,

              colno:
                event.colno,
            }
          );
        };

      const promiseRejectionHandler =
        (
          event:
            PromiseRejectionEvent
        ) => {
          captureException(
            event.reason,
            {
              type:
                "unhandledrejection",

              promise:
                event.promise,
            }
          );
        };

      window.addEventListener(
        "error",
        errorHandler
      );

      window.addEventListener(
        "unhandledrejection",
        promiseRejectionHandler
      );

      return () => {
        window.removeEventListener(
          "error",
          errorHandler
        );

        window.removeEventListener(
          "unhandledrejection",
          promiseRejectionHandler
        );
      };
    },
    [
      captureException,
    ]
  );

  // ==========================================================
  // AUTH CALLBACK MESSAGE
  // ==========================================================

  useEffect(
    () => {
      const handleMessage =
        (
          event:
            MessageEvent
        ) => {
          if (
            event.data ===
            "auth-success"
          ) {
            window.location.reload();
          }
        };

      window.addEventListener(
        "message",
        handleMessage
      );

      return () => {
        window.removeEventListener(
          "message",
          handleMessage
        );
      };
    },
    []
  );

  // ==========================================================
  // NOTIFICATION ACTIONS
  // ==========================================================

  useEffect(
    () => {
      const removeListener =
        handleNotificationAction(
          (
            rawData
          ) => {
            const data =
              getNotificationActionData(
                rawData
              );

            console.log(
              "Notificação clicada:",
              data
            );

            if (
              data.type ===
                "document_expiry" &&
              data.docId
            ) {
              router.push(
                `/detalhes?id=${data.docId}`
              );

              return;
            }

            if (
              data.type ===
                "medication_renewal" &&
              data.medicamentoId
            ) {
              router.push(
                `/saude/medicamentos/detalhes?id=${data.medicamentoId}`
              );
            }
          }
        );

      return () => {
        removeListener?.();
      };
    },
    [
      handleNotificationAction,
      router,
    ]
  );

  // ==========================================================
  // AUTH GUARD
  // ==========================================================

  useEffect(
    () => {
      if (
        loading
      ) {
        return;
      }

      if (
        pathname ===
          "/login" ||
        pathname ===
          "/auth/callback"
      ) {
        return;
      }

      if (
        !user
      ) {
        router.push(
          "/login"
        );
      }
    },
    [
      loading,
      user,
      pathname,
      router,
    ]
  );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-6">
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

  // ==========================================================
  // PUBLIC AUTH ROUTES
  // ==========================================================

  if (
    pathname ===
      "/login" ||
    pathname ===
      "/auth/callback"
  ) {
    return (
      <ToastProvider>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-screen bg-void" />
            }
          >
            {
              children
            }
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  // ==========================================================
  // NO USER YET
  // ==========================================================

  if (
    !user
  ) {
    return (
      <ToastProvider>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-screen bg-void" />
            }
          >
            <div className="min-h-screen">
              {
                children
              }
            </div>
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  // ==========================================================
  // APP
  // ==========================================================

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="min-h-screen pb-24">
          <Suspense
            fallback={
              <div className="min-h-screen bg-void" />
            }
          >
            {
              children
            }
          </Suspense>

          <Suspense
            fallback={
              null
            }
          >
            <BottomNav />
          </Suspense>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}