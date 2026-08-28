// app/senhas/detalhes/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Clipboard } from "@capacitor/clipboard";

import { useCredentials } from "@/hooks/useCredentials";
import { useBiometric } from "@/hooks/useBiometric";
import { useSecureScreen } from "@/hooks/useSecureScreen";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useMounted } from "@/hooks/useMounted";

import { decryptPassword } from "@/lib/crypto";
import { useHapticFeedback } from "@/lib/haptics";

import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/ToastProvider";

import {
  DetailInfoRow,
  SectionTitle,
} from "@/components/detail/DetailComponents";

import type {
  Credential,
} from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

function getCategoryLabel(
  category: Credential["category"]
): string {
  switch (category) {
    case "banco":
      return "Banco";

    case "social":
      return "Rede Social";

    case "trabalho":
      return "Trabalho";

    case "outros":
      return "Outros";

    default:
      return "Outros";
  }
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function CredentialDetailsContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get("id");

  const mounted =
    useMounted();

  const {
    trigger,
  } = useHapticFeedback();

  const {
    showToast,
  } = useToast();

  const {
    activePersonId,
  } = useActivePersonId();

  const {
    isLocked,
  } = useSecureScreen();

  const {
    deleteCredential,
    getCredential,
  } = useCredentials();

  const {
    authenticate,
  } = useBiometric({
    title: "Acessar Senha",
    subtitle:
      "Confirme sua identidade para acessar esta senha.",
    fallbackTitle:
      "Usar senha do dispositivo",
  });

  const getCredentialRef =
    useRef(getCredential);

  useEffect(() => {
    getCredentialRef.current =
      getCredential;
  }, [getCredential]);

  const authenticateRef =
    useRef(authenticate);

  useEffect(() => {
    authenticateRef.current =
      authenticate;
  }, [authenticate]);

  const clipboardClearTimeoutRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const copiedFeedbackTimeoutRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const [
    credential,
    setCredential,
  ] =
    useState<Credential | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    notFound,
    setNotFound,
  ] = useState(false);

  const [
    accessDenied,
    setAccessDenied,
  ] = useState(false);

  const [
    revealed,
    setRevealed,
  ] = useState(false);

  const [
    plainPassword,
    setPlainPassword,
  ] = useState("");

  const [
    copiedField,
    setCopiedField,
  ] = useState<string | null>(
    null
  );

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      if (
        clipboardClearTimeoutRef.current
      ) {
        clearTimeout(
          clipboardClearTimeoutRef.current
        );
      }

      if (
        copiedFeedbackTimeoutRef.current
      ) {
        clearTimeout(
          copiedFeedbackTimeoutRef.current
        );
      }

      setPlainPassword("");
    };
  }, []);

  /* ============================================================
     CARREGAMENTO
     ============================================================ */

  useEffect(() => {
    let cancelled = false;

    async function loadCredential() {
      if (!id) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }

        return;
      }

      try {
        const item =
          await getCredentialRef.current(
            id
          );

        if (cancelled) {
          return;
        }

        if (!item) {
          setNotFound(true);
          return;
        }

        /*
         * Regra rigorosa:
         * somente credenciais explicitamente vinculadas
         * à pessoa ativa podem ser abertas.
         */
        if (
          !activePersonId ||
          !item.person_id ||
          item.person_id !==
            activePersonId
        ) {
          setAccessDenied(true);
          return;
        }

        setCredential(item);
      } catch (error) {
        console.error(
          "Erro ao carregar credencial:",
          error
        );

        if (!cancelled) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCredential();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    activePersonId,
  ]);

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleBack = () => {
    trigger("vibrate");
    router.back();
  };

  const handleEdit = () => {
    if (!credential?.id) {
      return;
    }

    trigger("vibrate");

    router.push(
      `/senhas/editar?id=${encodeURIComponent(
        credential.id
      )}`
    );
  };

  const setCopiedFeedback = (
    fieldName: string
  ) => {
    setCopiedField(
      fieldName
    );

    if (
      copiedFeedbackTimeoutRef.current
    ) {
      clearTimeout(
        copiedFeedbackTimeoutRef.current
      );
    }

    copiedFeedbackTimeoutRef.current =
      setTimeout(
        () => {
          setCopiedField(
            null
          );
        },
        2000
      );
  };

  const scheduleClipboardClear =
    () => {
      if (
        clipboardClearTimeoutRef.current
      ) {
        clearTimeout(
          clipboardClearTimeoutRef.current
        );
      }

      clipboardClearTimeoutRef.current =
        setTimeout(
          () => {
            void Clipboard.write({
              string: "",
            }).catch(
              (error) => {
                console.error(
                  "Erro ao limpar área de transferência:",
                  error
                );
              }
            );
          },
          60_000
        );
    };

  const handleRevealPassword =
    async () => {
      trigger("vibrate");

      if (!credential) {
        return;
      }

      if (revealed) {
        setRevealed(false);
        setPlainPassword("");
        return;
      }

      try {
        const authenticated =
          await authenticateRef.current();

        if (!authenticated) {
          return;
        }

        const decrypted =
          decryptPassword(
            credential.password_encrypted
          );

        if (!decrypted) {
          trigger("error");

          showToast(
            "Não foi possível descriptografar a senha.",
            "error"
          );

          return;
        }

        setPlainPassword(
          decrypted
        );

        setRevealed(true);

        trigger("success");
      } catch (error) {
        console.error(
          "Erro ao revelar senha:",
          error
        );

        trigger("error");

        showToast(
          "Não foi possível revelar a senha.",
          "error"
        );
      }
    };

  const handleCopyPassword =
    async () => {
      if (!credential) {
        return;
      }

      trigger("vibrate");

      try {
        /*
         * Copiar senha SEMPRE exige autenticação,
         * mesmo que ela já esteja revelada na tela.
         */
        const authenticated =
          await authenticateRef.current();

        if (!authenticated) {
          return;
        }

        const password =
          decryptPassword(
            credential.password_encrypted
          );

        if (!password) {
          trigger("error");

          showToast(
            "Não foi possível descriptografar a senha.",
            "error"
          );

          return;
        }

        await Clipboard.write({
          string: password,
        });

        setCopiedFeedback(
          "password"
        );

        scheduleClipboardClear();

        trigger("success");

        showToast(
          "Senha copiada! Será limpa em 60s.",
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao copiar senha:",
          error
        );

        trigger("error");

        showToast(
          "Não foi possível copiar a senha.",
          "error"
        );
      }
    };

  const handleCopyText =
    async (
      text: string,
      fieldName: string,
      successMessage: string
    ) => {
      trigger("vibrate");

      try {
        await Clipboard.write({
          string: text,
        });

        setCopiedFeedback(
          fieldName
        );

        trigger("success");

        showToast(
          successMessage,
          "success"
        );
      } catch (error) {
        console.error(
          "Erro ao copiar campo:",
          error
        );

        trigger("error");

        showToast(
          "Não foi possível copiar.",
          "error"
        );
      }
    };

  const handleOpenDeleteModal =
    () => {
      if (isDeleting) {
        return;
      }

      trigger("vibrate");

      setShowDeleteModal(
        true
      );
    };

  const handleCloseDeleteModal =
    () => {
      if (isDeleting) {
        return;
      }

      setShowDeleteModal(
        false
      );
    };

  const handleDelete =
    async () => {
      if (
        !credential?.id ||
        isDeleting
      ) {
        return;
      }

      if (
        !activePersonId ||
        credential.person_id !==
          activePersonId
      ) {
        trigger("error");

        showToast(
          "Esta credencial não pertence à pessoa ativa.",
          "error"
        );

        return;
      }

      trigger("vibrate");

      try {
        setIsDeleting(true);

        await deleteCredential(
          credential.id
        );

        trigger("success");

        showToast(
          "Senha excluída com sucesso.",
          "success"
        );

        setShowDeleteModal(
          false
        );

        router.push(
          "/senhas"
        );
      } catch (error) {
        console.error(
          "Erro ao excluir senha:",
          error
        );

        trigger("error");

        showToast(
          error instanceof Error
            ? error.message
            : "Erro ao excluir senha.",
          "error"
        );
      } finally {
        setIsDeleting(false);
      }
    };

  /* ============================================================
     MOUNT / LOCK
     ============================================================ */

  if (!mounted) {
    return (
      <DetailSkeleton />
    );
  }

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-void px-5 text-center">
        <Lock
          size={48}
          className="mb-4 text-ice"
        />

        <h2 className="font-display text-xl text-ink-primary">
          Vault Bloqueado
        </h2>

        <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
          Desbloqueie o Vault para visualizar esta credencial.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <DetailSkeleton />
    );
  }

  /* ============================================================
     NÃO ENCONTRADA
     ============================================================ */

  if (notFound) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void">
          <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div>
              <h1 className="font-display text-lg font-semibold text-ink-primary">
                Detalhes da Senha
              </h1>

              <p className="text-xs text-ink-muted">
                Registro não encontrado
              </p>
            </div>
          </header>

          <section className="flex flex-col items-center px-6 pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-surface-border/60 bg-surface">
              <KeyRound
                size={32}
                className="text-ink-faint"
              />
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Senha não encontrada
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              Esta credencial pode ter sido removida ou o link utilizado não é mais válido.
            </p>

            <button
              onClick={
                handleBack
              }
              className="mt-6 rounded-2xl bg-ice px-6 py-3 text-sm font-semibold text-void transition-all active:scale-95"
              type="button"
            >
              Voltar
            </button>
          </section>
        </main>
      </PageTransition>
    );
  }

  /* ============================================================
     ACESSO NEGADO / SEM PERSON_ID
     ============================================================ */

  if (
    accessDenied ||
    !credential
  ) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void">
          <header className="header-safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div>
              <h1 className="font-display text-lg font-semibold text-ink-primary">
                Detalhes da Senha
              </h1>

              <p className="text-xs text-ink-muted">
                Credencial indisponível
              </p>
            </div>
          </header>

          <section className="flex flex-col items-center px-6 pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-coral/20 bg-coral/5">
              <ShieldCheck
                size={32}
                className="text-coral"
              />
            </div>

            <h2 className="mt-5 font-display text-lg font-semibold text-ink-primary">
              Esta senha não está disponível
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              A credencial não pertence à pessoa ativa ou não possui um vínculo de pessoa válido.
            </p>

            <button
              onClick={
                handleBack
              }
              className="mt-6 rounded-2xl bg-ice px-6 py-3 text-sm font-semibold text-void transition-all active:scale-95"
              type="button"
            >
              Voltar
            </button>
          </section>
        </main>
      </PageTransition>
    );
  }

  const categoryLabel =
    getCategoryLabel(
      credential.category
    );

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        {/* =====================================================
            HEADER
            ===================================================== */}
        <header className="header-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={
                handleBack
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                {
                  credential.title
                }
              </h1>

              <span className="mt-0.5 inline-block rounded-full bg-ice/15 px-2.5 py-0.5 text-[11px] font-medium text-ice">
                {
                  categoryLabel
                }
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={
                handleEdit
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              type="button"
              aria-label="Editar senha"
            >
              <Pencil
                size={18}
              />
            </button>

            <button
              onClick={
                handleOpenDeleteModal
              }
              disabled={
                isDeleting
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              aria-label="Excluir senha"
            >
              {isDeleting ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Trash2
                  size={18}
                />
              )}
            </button>
          </div>
        </header>

        {/* =====================================================
            CONTEÚDO
            ===================================================== */}
        <section className="space-y-4 px-5 pt-6">
          {/* Segurança */}
          <div className="rounded-[28px] border border-ice/15 bg-ice/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                <ShieldCheck
                  size={18}
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-primary">
                  Dados sensíveis criptografados
                </p>

                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  A senha permanece criptografada enquanto está armazenada. Revelar ou copiar exige confirmação de identidade.
                </p>
              </div>
            </div>
          </div>

          {/* Usuário */}
          {credential.username && (
            <DetailInfoRow
              icon={
                <Copy
                  size={14}
                />
              }
              iconClassName="bg-ice/10 text-ice"
              label="Usuário / E-mail"
              action={
                <button
                  onClick={() =>
                    void handleCopyText(
                      credential.username!,
                      "username",
                      "Usuário copiado."
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all hover:text-ice active:scale-95"
                  type="button"
                  aria-label="Copiar usuário"
                >
                  {copiedField ===
                  "username" ? (
                    <Check
                      size={16}
                      className="text-ice"
                    />
                  ) : (
                    <Copy
                      size={16}
                    />
                  )}
                </button>
              }
            >
              <p className="truncate text-base font-medium text-ink-primary">
                {
                  credential.username
                }
              </p>
            </DetailInfoRow>
          )}

          {/* Senha */}
          <div className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-4">
            <SectionTitle
              icon={
                <ShieldCheck
                  size={15}
                />
              }
              title="Senha"
            />

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border/50 bg-surface-raised p-3">
              <span className="min-w-0 flex-1 truncate font-mono text-base text-ink-primary">
                {revealed
                  ? plainPassword
                  : "••••••••••••••••"}
              </span>

              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() =>
                    void handleRevealPassword()
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink-muted transition-all hover:text-ice active:scale-95"
                  type="button"
                  aria-label={
                    revealed
                      ? "Ocultar senha"
                      : "Revelar senha"
                  }
                  aria-pressed={
                    revealed
                  }
                >
                  {revealed ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>

                <button
                  onClick={() =>
                    void handleCopyPassword()
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink-muted transition-all hover:text-ice active:scale-95"
                  type="button"
                  aria-label="Copiar senha"
                >
                  {copiedField ===
                  "password" ? (
                    <Check
                      size={16}
                      className="text-ice"
                    />
                  ) : (
                    <Copy
                      size={16}
                    />
                  )}
                </button>
              </div>
            </div>

            <p className="px-1 text-[11px] leading-relaxed text-ink-faint">
              A cópia da senha exige autenticação e a área de transferência será limpa automaticamente após 60 segundos.
            </p>
          </div>

          {/* URL */}
          {credential.url && (
            <DetailInfoRow
              icon={
                <KeyRound
                  size={14}
                />
              }
              iconClassName="bg-surface-raised text-ink-muted"
              label="Site / App"
              action={
                <button
                  onClick={() =>
                    void handleCopyText(
                      credential.url!,
                      "url",
                      "Endereço copiado."
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted transition-all hover:text-ice active:scale-95"
                  type="button"
                  aria-label="Copiar endereço"
                >
                  {copiedField ===
                  "url" ? (
                    <Check
                      size={16}
                      className="text-ice"
                    />
                  ) : (
                    <Copy
                      size={16}
                    />
                  )}
                </button>
              }
            >
              <p className="break-all text-sm font-medium text-ink-primary">
                {
                  credential.url
                }
              </p>
            </DetailInfoRow>
          )}

          {/* Notas */}
          {credential.notes && (
            <div className="space-y-3">
              <SectionTitle
                icon={
                  <KeyRound
                    size={15}
                  />
                }
                title="Anotações"
              />

              <div className="rounded-[28px] border border-surface-border/50 bg-surface p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                  {
                    credential.notes
                  }
                </p>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            EXCLUSÃO
            ===================================================== */}
        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={
            handleCloseDeleteModal
          }
          onConfirm={
            handleDelete
          }
          title="Excluir senha"
          message={`Tem certeza que deseja excluir a senha "${credential.title}"?`}
          confirmLabel={
            isDeleting
              ? "Excluindo..."
              : "Excluir"
          }
          cancelLabel="Cancelar"
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function CredentialDetailsPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <CredentialDetailsContent />
    </Suspense>
  );
}