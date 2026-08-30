// components/galeria/DocumentManager.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  db,
} from "@/lib/db";

import {
  documentsRepository,
} from "@/lib/repositories/documents";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import type {
  Document,
} from "@/lib/types";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";

import {
  useToast,
} from "@/components/ToastProvider";

interface DocumentManagerProps {
  entidadeTipo:
    string;

  entidadeId:
    string;

  tituloSecao?:
    string;
}

// ============================================================
// COMPONENTE
// ============================================================

export function DocumentManager({
  entidadeTipo,
  entidadeId,
  tituloSecao,
}: DocumentManagerProps) {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const [
    documentToDelete,
    setDocumentToDelete,
  ] =
    useState<
      Document | null
    >(
      null
    );

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false
    );

  // ==========================================================
  // DOCUMENTOS RELACIONADOS
  //
  // O índice composto foi introduzido no schema Dexie v32:
  //
  // [entidade_tipo+entidade_id]
  // ==========================================================

  const documentsQuery =
    useLiveQuery(
      async () => {
        if (
          !entidadeTipo ||
          !entidadeId
        ) {
          return [] as Document[];
        }

        const documents =
          await db.documents
            .where(
              "[entidade_tipo+entidade_id]"
            )
            .equals([
              entidadeTipo,
              entidadeId,
            ])
            .toArray();

        return documents.sort(
          (
            a,
            b
          ) => {
            const timeA =
              new Date(
                a.created_at ||
                  0
              ).getTime();

            const timeB =
              new Date(
                b.created_at ||
                  0
              ).getTime();

            return (
              timeB -
              timeA
            );
          }
        );
      },
      [
        entidadeTipo,
        entidadeId,
      ]
    );

  const isLoading =
    documentsQuery ===
    undefined;

  const documents =
    useMemo(
      () =>
        documentsQuery ??
        [],
      [
        documentsQuery,
      ]
    );

  // ==========================================================
  // AÇÕES
  // ==========================================================

  const handleOpenDocument =
    (
      document:
        Document
    ) => {
      if (
        !document.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      router.push(
        `/saude/documentos/detalhes?id=${encodeURIComponent(
          document.id
        )}`
      );
    };

  const handleRequestDelete =
    (
      document:
        Document
    ) => {
      trigger(
        "vibrate"
      );

      setDocumentToDelete(
        document
      );
    };

  const handleDelete =
    async () => {
      if (
        !documentToDelete?.id
      ) {
        return;
      }

      setIsDeleting(
        true
      );

      try {
        await documentsRepository.delete(
          documentToDelete.id,
          documentToDelete.person_id
        );

        trigger(
          "success"
        );

        showToast(
          "Documento removido com sucesso.",
          "success"
        );

        setDocumentToDelete(
          null
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir documento relacionado:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Não foi possível excluir o documento.",
          "error"
        );
      } finally {
        setIsDeleting(
          false
        );
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex items-center justify-center gap-2 py-5 text-xs text-ink-muted">
        <Loader2
          size={
            14
          }
          className="animate-spin text-ice"
        />

        Carregando documentos...
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {
              tituloSecao ||
              "Anexos e Documentos Vinculados"
            }
          </h3>

          {documents.length >
            0 && (
            <span className="rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-ink-faint">
              {
                documents.length
              }
            </span>
          )}
        </div>

        {documents.length ===
        0 ? (
          <div className="rounded-[20px] border border-surface-border/40 bg-surface-raised/40 px-4 py-4 text-center">
            <p className="text-xs text-ink-faint">
              Nenhum documento vinculado a este item.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(
              (
                document
              ) => {
                const firstAttachment =
                  document
                    .attachments?.[
                    0
                  ];

                return (
                  <div
                    key={
                      document.id
                    }
                    className="flex items-center gap-2 rounded-2xl border border-surface-border/50 bg-surface p-3 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDocument(
                          document
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity active:opacity-70"
                      aria-label={`Abrir ${document.title}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <FileText
                          size={
                            18
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink-primary">
                          {
                            document.title
                          }
                        </p>

                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-muted">
                          <span className="capitalize">
                            {document.type.replace(
                              /_/g,
                              " "
                            )}
                          </span>

                          {firstAttachment && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-ink-faint" />

                              <span>
                                {
                                  document
                                    .attachments
                                    .length
                                }{" "}
                                anexo
                                {document
                                  .attachments
                                  .length !==
                                1
                                  ? "s"
                                  : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={
                          15
                        }
                        className="shrink-0 text-ink-faint"
                      />
                    </button>

                    {firstAttachment?.url && (
                      <a
                        href={
                          firstAttachment.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          trigger(
                            "vibrate"
                          );
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary active:scale-95"
                        aria-label="Abrir primeiro anexo"
                      >
                        <ExternalLink
                          size={
                            15
                          }
                        />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleRequestDelete(
                          document
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-coral/70 transition-colors hover:bg-coral/10 hover:text-coral active:scale-95"
                      aria-label={`Excluir ${document.title}`}
                    >
                      <Trash2
                        size={
                          15
                        }
                      />
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={
          Boolean(
            documentToDelete
          )
        }
        onClose={() => {
          if (
            !isDeleting
          ) {
            setDocumentToDelete(
              null
            );
          }
        }}
        onConfirm={
          handleDelete
        }
        title="Excluir Documento"
        message={
          documentToDelete
            ? `Tem certeza que deseja excluir "${documentToDelete.title}"? O documento e seus anexos serão removidos.`
            : "Tem certeza que deseja excluir este documento?"
        }
      />
    </>
  );
}