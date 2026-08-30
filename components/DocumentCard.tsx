// components/DocumentCard.tsx
"use client";

import {
  memo,
  useCallback,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  Activity,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Contact,
  File,
  FileBadge,
  FileCheck2,
  FileKey2,
  FileText,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Pill,
  Star,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";
import {
  format,
} from "date-fns";
import {
  ptBR,
} from "date-fns/locale";

import {
  CATEGORIES,
  type Document,
} from "@/lib/types";

import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  useToast,
} from "@/components/ToastProvider";

// ============================================================
// TIPOS
// ============================================================

interface DocumentCardProps {
  document: Document;

  personName?: string;

  onFavoriteToggle?: (
    id: string
  ) => void | Promise<void>;

  compact?: boolean;

  alerta?: {
    status: string;
    label: string;
    color: string;
  } | null;

  personColor?: string;

  /*
   * Permite que um consumer especializado escolha
   * seu próprio destino sem duplicar o card.
   *
   * Quando ausente, usamos a rota canônica de
   * detalhes dos Documentos.
   */
  href?: string;
}

// ============================================================
// TIPOS — ÍCONES
// ============================================================

const TYPE_ICONS: Record<
  string,
  LucideIcon
> = {
  rg: Contact,
  cpf: FileText,
  cnh: FileBadge,

  certidao_nascimento:
    FileCheck2,

  titulo_eleitor:
    FileCheck2,

  certificado:
    FileCheck2,

  carteira_trabalho:
    File,

  passaporte:
    FileKey2,

  dispensa_militar:
    FileCheck2,

  receita: Pill,
  prontuario: Heart,
  laudo: ClipboardList,
  encaminhamento: Building2,
  consulta: Stethoscope,
  cirurgia: Activity,
  exame_sangue: Activity,
  exame_imagem: Activity,

  credencial: Contact,
  outro: FolderOpen,
};

// ============================================================
// TIPOS — LABELS
// ============================================================

const TYPE_LABELS: Record<
  string,
  string
> = {
  rg: "C.I.N / RG",
  cpf: "CPF",
  cnh: "CNH",

  certidao_nascimento:
    "Certidão de Nascimento",

  titulo_eleitor:
    "Título de Eleitor",

  certificado:
    "Certificado",

  carteira_trabalho:
    "Carteira de Trabalho",

  passaporte:
    "Passaporte",

  dispensa_militar:
    "Dispensa Militar",

  receita: "Receita",
  prontuario: "Prontuário",
  laudo: "Laudo",
  encaminhamento:
    "Encaminhamento",
  consulta: "Consulta",
  cirurgia: "Cirurgia",

  exame_sangue:
    "Exame de Sangue",

  exame_imagem:
    "Exame de Imagem",

  credencial:
    "Credencial / Carteirinha",

  outro: "Outro",
};

// ============================================================
// HELPERS — METADATA
// ============================================================

function getMetadataString(
  metadata:
    | Record<
        string,
        unknown
      >
    | undefined,
  key: string
): string | undefined {
  const value =
    metadata?.[key];

  if (
    typeof value ===
    "string"
  ) {
    const trimmed =
      value.trim();

    return (
      trimmed ||
      undefined
    );
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }

  return undefined;
}

// ============================================================
// HELPERS — CPF / RG
// ============================================================

function formatCPF(
  value: string
): string {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.length !==
    11
  ) {
    return value;
  }

  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

function formatRG(
  value: string
): string {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  /*
   * Mantemos a máscara histórica apenas
   * para o formato de 9 dígitos.
   *
   * CIN e formatos estaduais podem variar.
   */
  if (
    digits.length ===
    9
  ) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{1})/,
      "$1.$2.$3-$4"
    );
  }

  return value;
}

// ============================================================
// HELPERS — DATA LOCAL
// ============================================================

function parseLocalDate(
  value: string
): Date | null {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  /*
   * YYYY-MM-DD não pode ser passado diretamente
   * para new Date(), pois o JavaScript interpreta
   * esse formato como UTC.
   */
  const isoDateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      trimmed
    );

  if (
    isoDateMatch
  ) {
    const year =
      Number(
        isoDateMatch[1]
      );

    const month =
      Number(
        isoDateMatch[2]
      );

    const day =
      Number(
        isoDateMatch[3]
      );

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  }

  /*
   * Compatibilidade com datas antigas DDMMYYYY.
   */
  if (
    /^\d{8}$/.test(
      trimmed
    )
  ) {
    const day =
      Number(
        trimmed.substring(
          0,
          2
        )
      );

    const month =
      Number(
        trimmed.substring(
          2,
          4
        )
      );

    const year =
      Number(
        trimmed.substring(
          4,
          8
        )
      );

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  }

  const parsed =
    new Date(
      trimmed
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

function formatDate(
  value?: string
): string | null {
  if (!value) {
    return null;
  }

  const parsed =
    parseLocalDate(
      value
    );

  if (!parsed) {
    return value;
  }

  try {
    return format(
      parsed,
      "dd/MM/yyyy",
      {
        locale: ptBR,
      }
    );
  } catch {
    return value;
  }
}

// ============================================================
// HELPERS — VALIDADE
// ============================================================

function getStartOfToday(): Date {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function getExpiryStatus(
  rawExpiryDate?: string
): {
  isExpired: boolean;
  isExpiring: boolean;
} {
  if (
    !rawExpiryDate
  ) {
    return {
      isExpired: false,
      isExpiring: false,
    };
  }

  const expiryDate =
    parseLocalDate(
      rawExpiryDate
    );

  if (
    !expiryDate
  ) {
    return {
      isExpired: false,
      isExpiring: false,
    };
  }

  const expiryDay =
    new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate()
    );

  const today =
    getStartOfToday();

  const sevenDaysFromToday =
    new Date(
      today
    );

  sevenDaysFromToday.setDate(
    sevenDaysFromToday.getDate() +
      7
  );

  return {
    isExpired:
      expiryDay <
      today,

    isExpiring:
      expiryDay >=
        today &&
      expiryDay <=
        sevenDaysFromToday,
  };
}

// ============================================================
// COMPONENTE
// ============================================================

function DocumentCardComponent({
  document,
  personName,
  onFavoriteToggle,
  compact = false,
  alerta,
  personColor,
  href,
}: DocumentCardProps) {
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
    showSyncTooltip,
    setShowSyncTooltip,
  ] = useState(false);

  const [
    isFavoriteAnimating,
    setIsFavoriteAnimating,
  ] = useState(false);

  const [
    isFavoriteLoading,
    setIsFavoriteLoading,
  ] = useState(false);

  // ==========================================================
  // DERIVADOS
  // ==========================================================

  const metadata =
    document.metadata as
      | Record<
          string,
          unknown
        >
      | undefined;

  const category =
    CATEGORIES[
      document.category_id
    ];

  const color =
    personColor ||
    category?.color ||
    "#6B7280";

  const TypeIcon =
    TYPE_ICONS[
      document.type
    ] ||
    FileText;

  const friendlyTypeLabel =
    TYPE_LABELS[
      document.type
    ] ||
    document.type.replace(
      /_/g,
      " "
    );

  const documentHref =
    href ||
    (
      document.id
        ? `/documentos/detalhes?id=${document.id}`
        : ""
    );

  const hasAttachments =
    Boolean(
      document.attachments?.length
    );

  const hasImageAttachment =
    Boolean(
      document.attachments?.some(
        (
          attachment
        ) =>
          attachment.type ===
          "image"
      )
    );

  // ==========================================================
  // PRIMEIRO METADATA RELEVANTE
  // ==========================================================

  const metadataKeys =
    Object.keys(
      metadata || {}
    ).filter(
      (
        key
      ) =>
        ![
          "issue_date",
          "expiry_date",
          "renewal_date",
          "prescription_date",
          "date_exame",
          "data_exame",
          "data_nascimento",
          "date",
          "doctor",
          "hospital",
          "institution",
          "medication",
          "modelo",

          /*
           * IDs internos/relacionais não devem virar
           * texto principal do card.
           */
          "medico_id",
          "from_medico_id",
          "to_medico_id",
          "hospital_id",
          "local_id",
          "laboratorio_id",
          "farmacia_id",
          "medicamento_id",
          "tratamento_id",
          "cid_id",
          "entidade_tipo",
          "entidade_id",
        ].includes(
          key
        )
    );

  const firstMetadataKey =
    metadataKeys[0];

  const rawFirstMeta =
    firstMetadataKey
      ? getMetadataString(
          metadata,
          firstMetadataKey
        )
      : undefined;

  const firstMetadata =
    (() => {
      if (
        !rawFirstMeta ||
        !firstMetadataKey
      ) {
        return null;
      }

      if (
        firstMetadataKey.includes(
          "cpf"
        ) ||
        (
          firstMetadataKey ===
            "number" &&
          rawFirstMeta.replace(
            /\D/g,
            ""
          ).length ===
            11
        )
      ) {
        return formatCPF(
          rawFirstMeta
        );
      }

      if (
        firstMetadataKey.includes(
          "rg"
        ) &&
        rawFirstMeta.length >=
          7
      ) {
        return formatRG(
          rawFirstMeta
        );
      }

      return rawFirstMeta;
    })();

  // ==========================================================
  // DATAS
  // ==========================================================

  const rawIssueDate =
    getMetadataString(
      metadata,
      "issue_date"
    ) ||
    getMetadataString(
      metadata,
      "data_nascimento"
    ) ||
    getMetadataString(
      metadata,
      "data_exame"
    ) ||
    getMetadataString(
      metadata,
      "date"
    );

  const rawExpiryDate =
    getMetadataString(
      metadata,
      "expiry_date"
    ) ||
    getMetadataString(
      metadata,
      "renewal_date"
    ) ||
    getMetadataString(
      metadata,
      "validade"
    );

  const formattedIssue =
    formatDate(
      rawIssueDate
    );

  const formattedExpiry =
    formatDate(
      rawExpiryDate
    );

  const {
    isExpired,
    isExpiring,
  } =
    getExpiryStatus(
      rawExpiryDate
    );

  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const handlePress =
    useCallback(
      () => {
        if (
          !documentHref
        ) {
          return;
        }

        trigger(
          "vibrate"
        );

        router.push(
          documentHref
        );
      },
      [
        documentHref,
        router,
        trigger,
      ]
    );

  const handleKeyDown =
    useCallback(
      (
        event:
          KeyboardEvent<HTMLDivElement>
      ) => {
        if (
          event.key !==
            "Enter" &&
          event.key !==
            " "
        ) {
          return;
        }

        event.preventDefault();

        handlePress();
      },
      [
        handlePress,
      ]
    );

  // ==========================================================
  // FAVORITO
  // ==========================================================

  const handleFavorite =
    useCallback(
      async (
        event:
          MouseEvent<HTMLButtonElement>
      ) => {
        event.stopPropagation();

        if (
          !document.id ||
          !onFavoriteToggle ||
          isFavoriteLoading
        ) {
          return;
        }

        setIsFavoriteLoading(
          true
        );

        try {
          await onFavoriteToggle(
            document.id
          );

          /*
           * Feedback somente após a ação persistir.
           *
           * Antes o card dizia "adicionado" mesmo quando
           * repository/sync/action falhava.
           */
          trigger(
            "success"
          );

          setIsFavoriteAnimating(
            true
          );

          window.setTimeout(
            () => {
              setIsFavoriteAnimating(
                false
              );
            },
            420
          );

          showToast(
            document.is_favorite
              ? "Removido dos favoritos"
              : "Adicionado aos favoritos",
            "info"
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao alterar favorito:",
            error
          );

          trigger(
            "error"
          );

          showToast(
            "Não foi possível alterar o favorito.",
            "error"
          );
        } finally {
          setIsFavoriteLoading(
            false
          );
        }
      },
      [
        document.id,
        document.is_favorite,
        isFavoriteLoading,
        onFavoriteToggle,
        showToast,
        trigger,
      ]
    );

  // ==========================================================
  // STATUS DE SYNC
  // ==========================================================

  const handleSyncIconClick =
    useCallback(
      (
        event:
          MouseEvent<HTMLButtonElement>
      ) => {
        event.stopPropagation();

        setShowSyncTooltip(
          (
            previous
          ) =>
            !previous
        );

        trigger(
          "vibrate"
        );
      },
      [
        trigger,
      ]
    );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      onClick={
        handlePress
      }
      onKeyDown={
        handleKeyDown
      }
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-surface-border/50 bg-surface shadow-sm transition-all duration-200 active:scale-[0.985] hover:border-ice/20 hover:shadow-lg"
      role="button"
      tabIndex={
        documentHref
          ? 0
          : -1
      }
      aria-label={`Abrir documento ${document.title}`}
    >
      {/* ======================================================
          BARRA DE COR
          ====================================================== */}

      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{
          backgroundColor:
            color,
        }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* ==================================================
              ÍCONE
              ================================================== */}

          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] transition-all duration-200"
            style={{
              background:
                `linear-gradient(135deg, ${color}26, ${color}0d)`,
            }}
          >
            <TypeIcon
              size={
                18
              }
              style={{
                color,
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* =================================================
                CABEÇALHO
                ================================================= */}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="w-full break-words font-display text-[15px] font-semibold leading-snug text-ink-primary">
                  {
                    document.title
                  }
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  {personName ? (
                    <span>
                      {
                        personName
                      }
                    </span>
                  ) : (
                    <span>
                      {
                        friendlyTypeLabel
                      }
                    </span>
                  )}

                  {category && (
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor:
                          `${color}14`,

                        borderColor:
                          `${color}2c`,

                        color,
                      }}
                    >
                      {
                        category.name
                      }
                    </span>
                  )}

                  {alerta && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
                      style={{
                        backgroundColor:
                          `${alerta.color}20`,

                        color:
                          alerta.color,
                      }}
                    >
                      {
                        alerta.label
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* ===============================================
                  FAVORITO
                  =============================================== */}

              {onFavoriteToggle &&
                document.id && (
                  <button
                    type="button"
                    onClick={
                      handleFavorite
                    }
                    disabled={
                      isFavoriteLoading
                    }
                    className={`shrink-0 rounded-full p-1.5 transition-all duration-150 active:scale-90 disabled:cursor-wait disabled:opacity-60 ${
                      document.is_favorite
                        ? "bg-ice/12"
                        : "hover:bg-surface-border/50"
                    }`}
                    aria-label={
                      document.is_favorite
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                    }
                    aria-pressed={
                      document.is_favorite
                    }
                  >
                    <AnimatePresence
                      mode="wait"
                      initial={
                        false
                      }
                    >
                      {isFavoriteLoading ? (
                        <motion.div
                          key="loading"
                          initial={{
                            opacity:
                              0,

                            scale:
                              0.8,
                          }}
                          animate={{
                            opacity:
                              1,

                            scale:
                              1,
                          }}
                          exit={{
                            opacity:
                              0,

                            scale:
                              0.8,
                          }}
                        >
                          <Loader2
                            size={
                              16
                            }
                            className="animate-spin text-ice"
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="star"
                          animate={
                            isFavoriteAnimating
                              ? {
                                  scale:
                                    1.22,

                                  rotate:
                                    16,
                                }
                              : {
                                  scale:
                                    1,

                                  rotate:
                                    0,
                                }
                          }
                          transition={{
                            duration:
                              0.18,
                          }}
                        >
                          <Star
                            size={
                              16
                            }
                            className={
                              document.is_favorite
                                ? "fill-ice text-ice"
                                : "text-ink-muted/55"
                            }
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                )}
            </div>

            {/* =================================================
                METADATA PRINCIPAL
                ================================================= */}

            {firstMetadata && (
              <p className="mt-1.5 truncate text-sm font-medium text-ink-primary">
                {
                  firstMetadata
                }
              </p>
            )}

            {/* =================================================
                DATAS
                ================================================= */}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {formattedIssue && (
                <div className="flex items-center gap-1 text-xs text-ink-muted">
                  <Calendar
                    size={
                      12
                    }
                  />

                  <span>
                    {document.type ===
                    "certidao_nascimento"
                      ? "Nascimento:"
                      : "Emissão:"}{" "}
                    {
                      formattedIssue
                    }
                  </span>
                </div>
              )}

              {formattedExpiry && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium transition-colors duration-150 ${
                    isExpired
                      ? "text-coral"
                      : isExpiring
                        ? "text-coral/85"
                        : "text-ink-muted"
                  }`}
                >
                  <Calendar
                    size={
                      12
                    }
                  />

                  <span>
                    {isExpired
                      ? "Vencido:"
                      : isExpiring
                        ? "Vence em:"
                        : "Vence:"}{" "}
                    {
                      formattedExpiry
                    }
                  </span>
                </div>
              )}
            </div>

            {/* =================================================
                DESCRIÇÃO
                ================================================= */}

            {document.description &&
              !compact && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
                  {
                    document.description
                  }
                </p>
              )}
          </div>
        </div>

        {/* ====================================================
            RODAPÉ
            ==================================================== */}

        <div className="mt-3 flex items-center justify-between border-t border-surface-border/40 pt-3">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            {hasAttachments && (
              <span className="inline-flex items-center gap-1">
                {hasImageAttachment ? (
                  <ImageIcon
                    size={
                      13
                    }
                  />
                ) : (
                  <Paperclip
                    size={
                      13
                    }
                  />
                )}

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
              </span>
            )}
          </div>

          {/* ==================================================
              SINCRONIZAÇÃO
              ================================================== */}

          <div className="relative">
            <button
              type="button"
              onClick={
                handleSyncIconClick
              }
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors duration-150 active:scale-95 ${
                document.synced
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-coral/10 text-coral"
              }`}
              aria-label={
                document.synced
                  ? "Documento sincronizado"
                  : "Documento aguardando sincronização"
              }
              aria-expanded={
                showSyncTooltip
              }
            >
              {document.synced ? (
                <CheckCircle2
                  size={
                    11
                  }
                />
              ) : (
                <Loader2
                  size={
                    11
                  }
                  className="animate-spin"
                />
              )}

              {document.synced
                ? "Sincronizado"
                : "Pendente"}
            </button>

            <AnimatePresence>
              {showSyncTooltip && (
                <motion.span
                  initial={{
                    opacity:
                      0,

                    y:
                      3,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,
                  }}
                  exit={{
                    opacity:
                      0,

                    y:
                      3,
                  }}
                  transition={{
                    duration:
                      0.14,
                  }}
                  className="absolute right-0 top-[-1.9rem] z-10 whitespace-nowrap rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted shadow-md"
                >
                  {document.synced
                    ? "Sincronizado com a nuvem"
                    : "Aguardando sincronização"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MEMO
//
// Não usamos mais o comparator manual antigo.
//
// Ele comparava apenas:
//
// id
// is_favorite
// synced
// compact
// personName
// alerta.status
// personColor
//
// Portanto alterações de título, descrição, metadata,
// anexos, tipo e categoria podiam não renderizar.
//
// React.memo com comparação rasa é seguro aqui porque os
// documentos retornados pelos hooks/repositories são objetos
// atualizados quando o registro muda.
// ============================================================

export const DocumentCard =
  memo(
    DocumentCardComponent
  );