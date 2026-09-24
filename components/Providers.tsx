"use client";
import { isVaultNative } from "@/lib/native-runtime";
// components/Providers.tsx

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
  App,
} from "@capacitor/app";

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
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  BottomNav,
} from "./BottomNav";

import {
  ErrorBoundary,
} from "./ErrorBoundary";

import {
  pullAllData,
} from "@/lib/sync/pull";

import {
  setVaultSyncRuntime,
} from "@/lib/sync/runtime-status";

import {
  db,
} from "@/lib/db";

import { HealthReminderReconciler } from "@/components/HealthReminderReconciler";
import { InsightNotificationReconciler } from "@/components/InsightNotificationReconciler";
import { OverdueDoseNotificationReconciler } from "@/components/OverdueDoseNotificationReconciler";
import { useLiveQuery } from "dexie-react-hooks";

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

  actionId?:
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

    actionId:
      typeof record.actionId ===
      "string"
        ? record.actionId
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
    activePersonId,
    changePerson,
    loading: activePersonLoading,
    persons,
  } =
    useActivePersonId();

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

  const [pullError, setPullError] = useState<string | null>(null);
  const [pullAttempt, setPullAttempt] = useState(0);

  const hasPulledRef =
    useRef(
      false
    );

  const pullUserRef = useRef<string | null>(null);

  useDoseNotificationActions();

  const ownedPersonCount = useLiveQuery(
    () => user ? db.persons.where("user_id").equals(user.id).count() : 0,
    [user?.id]
  );

  const [profileGateReady, setProfileGateReady] = useState(false);
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [profileGateBusy, setProfileGateBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || activePersonLoading || ownedPersonCount === undefined) {
      setProfileGateReady(false);
      return;
    }

    const selectable = persons.filter((person) => Boolean(person.id));
    if (ownedPersonCount <= 1 || selectable.length <= 1) {
      setProfileGateOpen(false);
      setProfileGateReady(true);
      return;
    }

    // V33: não reabrir o seletor só porque o WebView criou outra sessão.
    const key = `vault-profile-selected:${user.id}`;
    let selected = false;
    try {
      selected =
        localStorage.getItem(key) === "1" ||
        sessionStorage.getItem(key) === "1";
    } catch {}
    setProfileGateOpen(!selected);
    setProfileGateReady(true);
  }, [user?.id, activePersonLoading, ownedPersonCount, persons]);

  const selectOpeningProfile = async (personId: string) => {
    if (!user?.id || profileGateBusy) return;
    setProfileGateBusy(personId);
    try {
      await changePerson(personId);
      try {
        const key = `vault-profile-selected:${user.id}`;
        localStorage.setItem(key, "1");
        sessionStorage.setItem(key, "1");
      } catch {}
      setProfileGateOpen(false);
    } finally {
      setProfileGateBusy(null);
    }
  };

  /*
   * Mantém o canal Realtime ativo enquanto a árvore principal
   * do Vault estiver montada.
   */
  useSupabaseRealtime();

  useEffect(() => {
    const nextUserId = user?.id || null;
    if (pullUserRef.current === nextUserId) return;
    pullUserRef.current = nextUserId;
    hasPulledRef.current = false;
    setIsPullDone(false);
    setPullError(null);
    setVaultSyncRuntime({ phase: "idle", error: null });
  }, [user?.id]);

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

      // V30.5:
      // Android System Bars pertencem exclusivamente à camada nativa.
      // O patch pós-cap-sync configura edge-to-edge, transparência
      // e contraste dos ícones. Não deixar o plugin JS sobrescrever
      // WindowInsetsController depois que a Activity iniciar.
      //
      // iOS continua usando @capacitor/status-bar.
      if (
        isVaultNative() &&
        Capacitor.getPlatform() !== "android"
      ) {
        const applyNativeSystemBars =
          async () => {
            try {
              // O WebView desenha por baixo da barra: sem faixa nativa
              // separada no topo.
              await StatusBar.setOverlaysWebView({
                overlay: true,
              });

              // Fundo escuro do Vault => ícones/textos claros.
              await StatusBar.setStyle({
                style: Style.Light,
              });

            } catch (error) {
              console.error(
                "Erro ao configurar StatusBar nativa:",
                error
              );
            }
          };

        void applyNativeSystemBars();

        const visibilityHandler = () => {
          if (document.visibilityState === "visible") {
            void applyNativeSystemBars();
          }
        };

        document.addEventListener(
          "visibilitychange",
          visibilityHandler
        );

        let appStateListener:
          | { remove: () => Promise<void> }
          | undefined;

        void App.addListener(
          "appStateChange",
          ({ isActive }) => {
            if (isActive) {
              void applyNativeSystemBars();
            }
          }
        ).then((listener) => {
          appStateListener = listener;
        });

        return () => {
          document.removeEventListener(
            "visibilitychange",
            visibilityHandler
          );

          if (appStateListener) {
            void appStateListener.remove();
          }
        };
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

      setPullError(null);
      setVaultSyncRuntime({ phase: "pulling", error: null });

      console.log(
        "Executando pullAllData unificado..."
      );

      // VAULT_PULL_AUTHORITATIVE_V50_1_2
      // O pull real decide sucesso/erro. O limiar de 15s serve apenas
      // para diagnóstico de lentidão e nunca cria um falso erro.
      let slowPullTimer: number | null =
        window.setTimeout(
          () => {
            slowPullTimer = null;
            console.info(
              "Sincronização inicial ainda em andamento após 15 segundos."
            );
          },
          15_000
        );

      pullAllData(user.id)
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

            const message = error instanceof Error ? error.message : "Não foi possível atualizar os dados da nuvem.";
            setPullError(message);
            setVaultSyncRuntime({ phase: "error", error: message });
          }
        )
        .finally(
          () => {
            if (slowPullTimer !== null) {
              window.clearTimeout(slowPullTimer);
              slowPullTimer = null;
            }
          }
        );
    },
    [
      user,
      loading,
      isOnline,
      isPullDone,
      pullAttempt,
    ]
  );

  // ==========================================================
  // PUSH QUEUE AFTER PULL
  // ==========================================================

  useEffect(
    () => {
      if (!isOnline || !user || !isPullDone) return;
      let cancelled = false;
      void (async () => {
        setVaultSyncRuntime({ phase: "pushing", error: null });
        console.log("Executando push da fila de sincronização...");
        try {
          const result = await processQueue();
          if (cancelled) return;
          if (result.offline) {
            setVaultSyncRuntime({ phase: "idle", error: null });
            return;
          }
          // VAULT_SYNC_TERMINAL_STATE_V50_1_1
          // result.failed é histórico de tentativas da execução, não o
          // estado terminal da fila.
          if (result.fatalError || result.permanentlyFailed > 0) {
            setVaultSyncRuntime({
              phase: "error",
              error: result.fatalError ||
                "Há itens que precisam de revisão na sincronização.",
            });
            return;
          }

          if (result.remaining > 0) {
            setVaultSyncRuntime({ phase: "pushing", error: null });
            return;
          }

          setVaultSyncRuntime({ phase: "synced", error: null });
        } catch (error) {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : "Não foi possível concluir a sincronização.";
          console.error("Erro ao processar fila após o pull:", error);
          setVaultSyncRuntime({ phase: "error", error: message });
        }
      })();
      return () => { cancelled = true; };
    },
    [isOnline, user, isPullDone, processQueue]
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
              const documentId =
                data.docId;

              void (
                async () => {
                  try {
                    const document =
                      await db.documents.get(
                        documentId
                      );

                    if (
                      !document
                    ) {
                      console.warn(
                        "[Providers] Documento da notificação não encontrado:",
                        documentId
                      );

                      router.push(
                        "/documentos"
                      );

                      return;
                    }

                    /*
                     * Os detalhes modernos são person-scoped.
                     *
                     * Se a notificação pertence a outra pessoa,
                     * primeiro tornamos essa pessoa ativa pelo
                     * fluxo oficial do Vault.
                     */
                    if (
                      document.person_id &&
                      document.person_id !==
                        activePersonId
                    ) {
                      await changePerson(
                        document.person_id
                      );
                    }

                    const destination =
                      document.category_id ===
                      "saude"
                        ? `/saude/documentos/detalhes?id=${encodeURIComponent(
                            documentId
                          )}`
                        : `/documentos/detalhes?id=${encodeURIComponent(
                            documentId
                          )}`;

                    router.push(
                      destination
                    );
                  } catch (
                    error
                  ) {
                    console.error(
                      "[Providers] Erro ao abrir documento da notificação:",
                      error
                    );
                  }
                }
              )();

              return;
            }

            if (
              data.type ===
                "medication_renewal" &&
              data.medicamentoId
            ) {
              const medicamentoId =
                data.medicamentoId;

              void (
                async () => {
                  try {
                    const medicamento =
                      await db.medicamentos.get(
                        medicamentoId
                      );

                    if (
                      !medicamento
                    ) {
                      console.warn(
                        "[Providers] Medicamento da renovação não encontrado:",
                        medicamentoId
                      );

                      router.push(
                        "/saude/medicamentos"
                      );

                      return;
                    }

                    if (
                      medicamento.person_id &&
                      medicamento.person_id !==
                        activePersonId
                    ) {
                      await changePerson(
                        medicamento.person_id
                      );
                    }

                    router.push(
                      `/saude/medicamentos/detalhes?id=${encodeURIComponent(
                        medicamentoId
                      )}`
                    );
                  } catch (
                    error
                  ) {
                    console.error(
                      "[Providers] Erro ao abrir renovação:",
                      error
                    );
                  }
                }
              )();

              return;
            }

            if (
              data.type ===
                "dose_reminder" &&
              data.medicamentoId &&
              data.actionId !==
                "TOMEI" &&
              data.actionId !==
                "IGNORAR"
            ) {
              const medicamentoId =
                data.medicamentoId;

              void (
                async () => {
                  try {
                    const medicamento =
                      await db.medicamentos.get(
                        medicamentoId
                      );

                    if (
                      !medicamento
                    ) {
                      console.warn(
                        "[Providers] Medicamento da dose não encontrado:",
                        medicamentoId
                      );

                      router.push(
                        "/saude/medicamentos"
                      );

                      return;
                    }

                    if (
                      medicamento.person_id &&
                      medicamento.person_id !==
                        activePersonId
                    ) {
                      await changePerson(
                        medicamento.person_id
                      );
                    }

                    router.push(
                      `/saude/medicamentos/detalhes?id=${encodeURIComponent(
                        medicamentoId
                      )}`
                    );
                  } catch (
                    error
                  ) {
                    console.error(
                      "[Providers] Erro ao abrir lembrete de dose:",
                      error
                    );
                  }
                }
              )();
            }
          }
        );

      return () => {
        removeListener?.();
      };
    },
    [
      activePersonId,
      changePerson,
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
          "/auth/callback" ||
        pathname ===
          "/onboarding"
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

  // Só decide onboarding depois do pull remoto. Assim um segundo aparelho
  // não fabrica uma pessoa duplicada antes de conhecer a nuvem.
  useEffect(() => {
    if (!loading && user && (isPullDone || !isOnline) && ownedPersonCount === 0 && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
    if (!loading && user && ownedPersonCount && ownedPersonCount > 0 && pathname === "/onboarding") {
      router.replace("/");
    }
  }, [loading, user, isOnline, isPullDone, ownedPersonCount, pathname, router]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
    /*
     * O SplashScreen já cobre a primeira inicialização.
     *
     * Durante uma revalidação curta da autenticação mantemos
     * somente o fundo do aplicativo, sem simular uma nova
     * abertura do Vault.
     */
    return (
      <div
        className="min-h-screen bg-void"
        aria-hidden="true"
      />
    );
  }

  // ==========================================================
  // PUBLIC AUTH ROUTES
  // ==========================================================

  if (
    pathname ===
      "/login" ||
    pathname ===
      "/auth/callback" ||
    pathname ===
      "/onboarding"
  ) {
    return (
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
    );
  }

  // ==========================================================
  // NO USER YET
  // ==========================================================

  if (
    !user
  ) {
    return (
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
    );
  }

  // Não libera o app normal enquanto o perfil principal ainda não existe.
  if (ownedPersonCount === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-void text-sm text-ink-muted" role="status">Carregando seus dados locais…</div>;
  }

  if (ownedPersonCount === 0 && isOnline && !isPullDone) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void p-5 text-ink-primary">
        <section className="w-full max-w-sm rounded-3xl border border-surface-border bg-surface p-5 text-center shadow-vault" aria-live="polite">
          <h1 className="font-display text-lg font-semibold">Preparando seu Vault</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {pullError || "Buscando seu perfil antes de liberar o aplicativo neste aparelho."}
          </p>
          {pullError && (
            <button onClick={() => setPullAttempt((value) => value + 1)} className="mt-4 w-full rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void">
              Tentar novamente
            </button>
          )}
        </section>
      </main>
    );
  }

  if (ownedPersonCount === 0) {
    return <div className="min-h-screen bg-void" role="status" aria-label="Abrindo configuração de perfil" />;
  }

  if (user && (!profileGateReady || (ownedPersonCount !== undefined && ownedPersonCount > 0 && activePersonLoading))) {
    return <div className="min-h-[100dvh] bg-void" role="status" aria-label="Preparando perfis" />;
  }

  if (user && profileGateOpen && persons.length > 1) {
    return (
      <main className="fixed inset-0 z-[9999] overflow-y-auto bg-void text-ink-primary">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
          <div className="mb-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10"><span className="font-display text-lg font-bold text-ice">V</span></div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-ice/80">Vault</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-primary">Quem está usando o Vault?</h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Escolha o perfil para abrir os dados corretos.</p>
          </div>
          <div className="space-y-3">
            {persons.filter((person) => Boolean(person.id)).map((person) => {
              const personId = person.id!;
              const busy = profileGateBusy === personId;
              return (
                <button key={personId} type="button" disabled={Boolean(profileGateBusy)} onClick={() => void selectOpeningProfile(personId)} className="group flex w-full items-center gap-4 rounded-3xl border border-surface-border/60 bg-surface-raised/80 p-4 text-left shadow-lg shadow-black/10 transition active:scale-[0.985] disabled:opacity-60" style={{ borderColor: person.color ? `${person.color}55` : undefined }}>
                  {person.avatar_url ? <img src={person.avatar_url} alt={person.name} className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white" style={{ backgroundColor: person.color || "#38BDF8" }}>{person.name?.charAt(0).toUpperCase() || "?"}</div>}
                  <div className="min-w-0 flex-1"><span className="block truncate font-display text-base font-semibold text-ink-primary">{person.name}</span><span className="mt-1 block text-xs text-ink-muted">{busy ? "Abrindo perfil..." : "Continuar com este perfil"}</span></div>
                  <span className="text-xl text-ink-faint transition-transform group-active:translate-x-1">›</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => router.push("/pessoas")} className="mt-6 self-center rounded-xl px-4 py-2 text-sm font-medium text-ink-muted transition active:scale-95">Gerenciar pessoas</button>
        </div>
      </main>
    );
  }

  // ==========================================================
  // APP
  // ==========================================================

  return (
      <ErrorBoundary>
          <HealthReminderReconciler />
      <InsightNotificationReconciler />
      <OverdueDoseNotificationReconciler />
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
  );
}
