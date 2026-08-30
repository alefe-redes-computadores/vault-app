// app/saude/documentos/detalhes/page.tsx
"use client";

import {
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  motion,
} from "framer-motion";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  FileHeart,
  FileOutput,
  FileText,
  FlaskConical,
  FolderHeart,
  Heart,
  HeartPulse,
  Image as ImageIcon,
  Link2,
  MapPin,
  Paperclip,
  Pill,
  Star,
  Stethoscope,
  Store,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  useDocument,
  useDocumentActions,
} from "@/hooks/useDocuments";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  useMedicamentos,
} from "@/hooks/useMedicamentos";

import {
  useTratamentos,
} from "@/hooks/useTratamentos";

import {
  useCids,
} from "@/hooks/useCids";

import {
  useConsultas,
} from "@/hooks/useConsultas";

import {
  useExames,
} from "@/hooks/useExames";

import {
  useCirurgias,
} from "@/hooks/useCirurgias";

import {
  useMedicos,
} from "@/hooks/useMedicos";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  useHospitais,
} from "@/hooks/useHospitais";

import {
  useLocais,
} from "@/hooks/useLocais";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useRegistrosSaude,
} from "@/hooks/useRegistrosSaude";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  isReceitaVencidaSegura,
} from "@/lib/health-insights";

import {
  getDaysUntil,
} from "@/lib/health-utils";

import {
  cancelDocumentExpiryNotification,
} from "@/lib/notifications";

import {
  DOCUMENT_FIELDS,
  type Attachment,
  type Document,
  type DocumentField,
} from "@/lib/types";

import {
  PageTransition,
} from "@/components/PageTransition";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  Button,
} from "@/components/ui/Button";

import {
  useToast,
} from "@/components/ToastProvider";

// ============================================================
// TIPOS
// ============================================================

interface ResolvedClinicalEntity {
  type:
    string;

  label:
    string;

  description?:
    string;

  route?:
    string;

  icon:
    LucideIcon;

  colorClass:
    string;
}

interface MetadataItem {
  key:
    string;

  label:
    string;

  value:
    string;

  icon:
    LucideIcon;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const DOCUMENT_TYPE_LABELS: Record<
  string,
  string
> = {
  receita:
    "Receita Médica",

  prontuario:
    "Prontuário Médico",

  laudo:
    "Laudo ou Parecer",

  encaminhamento:
    "Encaminhamento",

  consulta:
    "Documento de Consulta",

  cirurgia:
    "Documento de Cirurgia",

  exame_sangue:
    "Exame Laboratorial",

  exame_imagem:
    "Exame de Imagem",
};

const DOCUMENT_TYPE_ICONS: Record<
  string,
  LucideIcon
> = {
  receita:
    Pill,

  prontuario:
    Heart,

  laudo:
    FileText,

  encaminhamento:
    FileOutput,

  consulta:
    Stethoscope,

  cirurgia:
    Activity,

  exame_sangue:
    FlaskConical,

  exame_imagem:
    ImageIcon,
};

// ============================================================
// HELPERS
// ============================================================

function getMetadataValue(
  document:
    Document,
  key:
    string
): string {
  const value =
    document.metadata?.[
      key
    ];

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
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

  return "";
}

function formatDateBR(
  value:
    string
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .slice(
        0,
        10
      )
      .split(
        "-"
      );

  return `${day}/${month}/${year}`;
}

function formatDateTimeBR(
  value?:
    string
): string {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    ).format(
      date
    );
  } catch {
    return value;
  }
}

function isDateField(
  fields:
    DocumentField[],
  key:
    string
): boolean {
  return fields.some(
    (
      field
    ) =>
      field.key ===
        key &&
      field.type ===
        "date"
  );
}

function getFieldLabel(
  fields:
    DocumentField[],
  key:
    string
): string {
  const configured =
    fields.find(
      (
        field
      ) =>
        field.key ===
        key
    );

  if (
    configured
  ) {
    return configured.label;
  }

  return key
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function getFieldIcon(
  key:
    string
): LucideIcon {
  switch (
    key
  ) {
    case "medicamento_id":
    case "medication_id":
      return Pill;

    case "medico_id":
    case "from_medico_id":
    case "to_medico_id":
      return Stethoscope;

    case "hospital_id":
      return Building2;

    case "local_id":
      return MapPin;

    case "farmacia_id":
      return Store;

    default:
      if (
        key.includes(
          "date"
        ) ||
        key.includes(
          "data"
        ) ||
        key.includes(
          "validade"
        ) ||
        key.includes(
          "renewal"
        )
      ) {
        return Calendar;
      }

      return FileText;
  }
}

function getExpiryDate(
  document:
    Document
): string {
  /*
   * renewal_date NÃO representa validade.
   *
   * É contexto de renovação e não pode tornar uma receita
   * visualmente vencida.
   */
  return (
    getMetadataValue(
      document,
      "expiry_date"
    ) ||
    getMetadataValue(
      document,
      "expiration_date"
    ) ||
    getMetadataValue(
      document,
      "validade"
    )
  );
}

function shouldHideMetadataItem(
  document:
    Document,
  key:
    string
): boolean {
  if (
    document.entidade_tipo ===
      "medicamento" &&
    (
      key ===
        "medicamento_id" ||
      key ===
        "medication_id"
    )
  ) {
    return true;
  }

  return false;
}

function getSafeAttachmentUrl(
  value?:
    string
): string | null {
  if (
    !value
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        value
      );

    if (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    ) {
      return value;
    }

    return null;
  } catch {
    return null;
  }
}

function getSafeAttachments(
  document:
    Document
): Attachment[] {
  if (
    !Array.isArray(
      document.attachments
    )
  ) {
    return [];
  }

  return document.attachments.filter(
    (
      attachment
    ): attachment is Attachment =>
      Boolean(
        attachment &&
        typeof attachment.id ===
          "string" &&
        typeof attachment.name ===
          "string" &&
        typeof attachment.url ===
          "string"
      )
  );
}

// ============================================================
// WRAPPER
// ============================================================

export default function DocumentoSaudeDetalhesPage() {
  return (
    <Suspense
      fallback={
        <DetailsLoading />
      }
    >
      <DocumentoSaudeDetalhesContent />
    </Suspense>
  );
}

// ============================================================
// CONTENT
// ============================================================

function DocumentoSaudeDetalhesContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const id =
    searchParams.get(
      "id"
    )?.trim() ||
    "";

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    showToast,
  } =
    useToast();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const document =
    useDocument(
      id
    );

  const {
    deleteDocument,
    favoriteDocument,
  } =
    useDocumentActions();

  const {
    medicamentos = [],
  } =
    useMedicamentos();

  const {
    tratamentos = [],
  } =
    useTratamentos();

  const {
    cids = [],
  } =
    useCids();

  const {
    consultas = [],
  } =
    useConsultas();

  const {
    exames = [],
  } =
    useExames();

  const {
    cirurgias = [],
  } =
    useCirurgias();

  const {
    medicos = [],
  } =
    useMedicos();

  const {
    farmacias = [],
  } =
    useFarmacias();

  const {
    hospitais = [],
  } =
    useHospitais();

  const {
    locais = [],
  } =
    useLocais();

  const {
    renovacoes = [],
  } =
    useRenovacoes();

  const {
    registros = [],
  } =
    useRegistrosSaude();

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(
      false
    );

  const [
    deleting,
    setDeleting,
  ] =
    useState(
      false
    );

  const [
    favoriting,
    setFavoriting,
  ] =
    useState(
      false
    );

  // ==========================================================
  // PERSON-SCOPED CLINICAL DATA
  // ==========================================================

  const scopedMedicamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return medicamentos.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        medicamentos,
        activePersonId,
      ]
    );

  const scopedTratamentos =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return tratamentos.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        tratamentos,
        activePersonId,
      ]
    );

  const scopedCids =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cids.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        cids,
        activePersonId,
      ]
    );

  const scopedConsultas =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return consultas.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        consultas,
        activePersonId,
      ]
    );

  const scopedExames =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return exames.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        exames,
        activePersonId,
      ]
    );

  const scopedCirurgias =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return cirurgias.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        cirurgias,
        activePersonId,
      ]
    );

  const scopedRenovacoes =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return renovacoes.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        renovacoes,
        activePersonId,
      ]
    );

  const scopedRegistros =
    useMemo(
      () => {
        if (
          !activePersonId
        ) {
          return [];
        }

        return registros.filter(
          (
            item
          ) =>
            item.person_id ===
            activePersonId
        );
      },
      [
        registros,
        activePersonId,
      ]
    );

  // ==========================================================
  // DOCUMENT TYPE
  // ==========================================================

  const typeLabel =
    document
      ? DOCUMENT_TYPE_LABELS[
          document.type
        ] ||
        "Documento de Saúde"
      : "";

  const DocumentTypeIcon:
    LucideIcon =
    document
      ? DOCUMENT_TYPE_ICONS[
          document.type
        ] ||
        FileText
      : FileText;

  // ==========================================================
  // CANONICAL ENTITY
  // ==========================================================

  const clinicalEntity =
    useMemo<
      ResolvedClinicalEntity | null
    >(
      () => {
        if (
          !document?.entidade_tipo ||
          !document.entidade_id
        ) {
          return null;
        }

        const entityId =
          document.entidade_id;

        switch (
          document.entidade_tipo
        ) {
          case "medicamento": {
            const item =
              scopedMedicamentos.find(
                (
                  medicamento
                ) =>
                  medicamento.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "medicamento",

                label:
                  "Medicamento indisponível",

                description:
                  "O vínculo foi preservado, mas o medicamento não está disponível localmente.",

                icon:
                  Pill,

                colorClass:
                  "text-amber-400",
              };
            }

            return {
              type:
                "medicamento",

              label:
                item.nome,

              description:
                item.dosagem ||
                undefined,

              route:
                `/saude/medicamentos/detalhes?id=${item.id}`,

              icon:
                Pill,

              colorClass:
                "text-amber-400",
            };
          }

          case "tratamento": {
            const item =
              scopedTratamentos.find(
                (
                  tratamento
                ) =>
                  tratamento.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "tratamento",

                label:
                  "Tratamento indisponível",

                description:
                  "O vínculo foi preservado, mas o tratamento não está disponível localmente.",

                icon:
                  FolderHeart,

                colorClass:
                  "text-violet-400",
              };
            }

            return {
              type:
                "tratamento",

              label:
                item.nome,

              description:
                item.condicao ||
                item.status,

              route:
                `/saude/tratamentos/detalhes?id=${item.id}`,

              icon:
                FolderHeart,

              colorClass:
                "text-violet-400",
            };
          }

          case "cid": {
            const item =
              scopedCids.find(
                (
                  cid
                ) =>
                  cid.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "cid",

                label:
                  "CID indisponível",

                description:
                  "O vínculo foi preservado, mas a condição não está disponível localmente.",

                icon:
                  Tag,

                colorClass:
                  "text-teal-400",
              };
            }

            return {
              type:
                "cid",

              label:
                `${item.codigo} · ${item.descricao}`,

              description:
                item.data_diagnostico
                  ? `Registrado em ${formatDateBR(
                      item.data_diagnostico
                    )}`
                  : undefined,

              route:
                `/saude/cids/detalhes?id=${item.id}`,

              icon:
                Tag,

              colorClass:
                "text-teal-400",
            };
          }

          case "consulta": {
            const item =
              scopedConsultas.find(
                (
                  consulta
                ) =>
                  consulta.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "consulta",

                label:
                  "Consulta indisponível",

                description:
                  "O vínculo foi preservado, mas a consulta não está disponível localmente.",

                icon:
                  Stethoscope,

                colorClass:
                  "text-ice",
              };
            }

            return {
              type:
                "consulta",

              label:
                item.medico ||
                item.especialidade ||
                "Consulta",

              description:
                [
                  item.especialidade,
                  item.data
                    ? formatDateBR(
                        item.data
                      )
                    : undefined,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " · "
                  ) ||
                undefined,

              route:
                `/saude/consultas/detalhes?id=${item.id}`,

              icon:
                Stethoscope,

              colorClass:
                "text-ice",
            };
          }

          case "exame": {
            const item =
              scopedExames.find(
                (
                  exame
                ) =>
                  exame.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "exame",

                label:
                  "Exame indisponível",

                description:
                  "O vínculo foi preservado, mas o exame não está disponível localmente.",

                icon:
                  FlaskConical,

                colorClass:
                  "text-emerald-400",
              };
            }

            return {
              type:
                "exame",

              label:
                item.nome,

              description:
                item.data
                  ? formatDateBR(
                      item.data
                    )
                  : undefined,

              route:
                `/saude/exames/detalhes?id=${item.id}`,

              icon:
                FlaskConical,

              colorClass:
                "text-emerald-400",
            };
          }

          case "cirurgia": {
            const item =
              scopedCirurgias.find(
                (
                  cirurgia
                ) =>
                  cirurgia.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "cirurgia",

                label:
                  "Cirurgia indisponível",

                description:
                  "O vínculo foi preservado, mas a cirurgia não está disponível localmente.",

                icon:
                  Activity,

                colorClass:
                  "text-coral",
              };
            }

            return {
              type:
                "cirurgia",

              label:
                item.procedimento,

              description:
                [
                  item.data
                    ? formatDateBR(
                        item.data
                      )
                    : undefined,
                  item.status,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " · "
                  ) ||
                undefined,

              route:
                `/saude/cirurgias/detalhes?id=${item.id}`,

              icon:
                Activity,

              colorClass:
                "text-coral",
            };
          }

          case "registro_saude": {
            const item =
              scopedRegistros.find(
                (
                  registro
                ) =>
                  registro.id ===
                  entityId
              );

            if (
              !item
            ) {
              return {
                type:
                  "registro_saude",

                label:
                  "Registro de Saúde indisponível",

                description:
                  "O vínculo foi preservado, mas o registro clínico não está disponível localmente.",

                icon:
                  HeartPulse,

                colorClass:
                  "text-pink-400",
              };
            }

            const registroNome =
              String(
                item.nome ||
                ""
              ).trim() ||
              "Registro de Saúde";

            return {
              type:
                "registro_saude",

              label:
                registroNome,

              description:
                [
                  item.data
                    ? formatDateBR(
                        item.data
                      )
                    : undefined,
                  item.horario ||
                    undefined,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " · "
                  ) ||
                undefined,

              icon:
                HeartPulse,

              colorClass:
                "text-pink-400",
            };
          }

          case "renovacao": {
            const renovacao =
              scopedRenovacoes.find(
                (
                  item
                ) =>
                  item.id ===
                  entityId
              );

            if (
              !renovacao
            ) {
              return {
                type:
                  "renovacao",

                label:
                  "Renovação indisponível",

                description:
                  "O vínculo foi preservado, mas a renovação não está disponível localmente.",

                icon:
                  Pill,

                colorClass:
                  "text-amber-400",
              };
            }

            const medicamento =
              renovacao.medicamento_id
                ? scopedMedicamentos.find(
                    (
                      item
                    ) =>
                      item.id ===
                      renovacao.medicamento_id
                  )
                : undefined;

            return {
              type:
                "renovacao",

              label:
                medicamento
                  ? `Renovação · ${medicamento.nome}`
                  : "Renovação de Medicamento",

              description:
                [
                  medicamento?.dosagem,
                  renovacao.data
                    ? `Registrada em ${formatDateBR(
                        renovacao.data
                      )}`
                    : undefined,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " · "
                  ) ||
                "Documento vinculado ao histórico de renovação.",

              icon:
                Pill,

              colorClass:
                "text-amber-400",
            };
          }

          default:
            return null;
        }
      },
      [
        document,
        scopedMedicamentos,
        scopedTratamentos,
        scopedCids,
        scopedConsultas,
        scopedExames,
        scopedCirurgias,
        scopedRenovacoes,
        scopedRegistros,
      ]
    );

  const ClinicalEntityIcon:
    LucideIcon =
    clinicalEntity?.icon ||
    Link2;

  // ==========================================================
  // METADATA
  // ==========================================================

  const fields =
    useMemo(
      () =>
        document
          ? DOCUMENT_FIELDS[
              document.type
            ] ||
            []
          : [],
      [
        document,
      ]
    );

  const metadataItems =
    useMemo<
      MetadataItem[]
    >(
      () => {
        if (
          !document
        ) {
          return [];
        }

        const items:
          Array<
            MetadataItem |
            null
          > =
          Object.entries(
            document.metadata ||
              {}
          )
            .filter(
              (
                [
                  key,
                ]
              ) =>
                !shouldHideMetadataItem(
                  document,
                  key
                )
            )
            .map(
              (
                [
                  key,
                  rawValue,
                ]
              ):
                MetadataItem |
                null => {
                if (
                  rawValue ===
                    null ||
                  rawValue ===
                    undefined ||
                  rawValue ===
                    ""
                ) {
                  return null;
                }

                if (
                  typeof rawValue !==
                    "string" &&
                  typeof rawValue !==
                    "number" &&
                  typeof rawValue !==
                    "boolean"
                ) {
                  return null;
                }

                const value =
                  String(
                    rawValue
                  ).trim();

                if (
                  !value
                ) {
                  return null;
                }

                let resolvedValue =
                  value;

                switch (
                  key
                ) {
                  case "medicamento_id":
                  case "medication_id":
                    resolvedValue =
                      scopedMedicamentos.find(
                        (
                          item
                        ) =>
                          item.id ===
                          value
                      )?.nome ||
                      "Medicamento indisponível";
                    break;

                  case "medico_id":
                  case "from_medico_id":
                  case "to_medico_id":
                    resolvedValue =
                      medicos.find(
                        (
                          item
                        ) =>
                          item.id ===
                          value
                      )?.nome ||
                      "Médico indisponível";
                    break;

                  case "hospital_id":
                    resolvedValue =
                      hospitais.find(
                        (
                          item
                        ) =>
                          item.id ===
                          value
                      )?.nome ||
                      "Hospital indisponível";
                    break;

                  case "farmacia_id":
                    resolvedValue =
                      farmacias.find(
                        (
                          item
                        ) =>
                          item.id ===
                          value
                      )?.nome ||
                      "Farmácia indisponível";
                    break;

                  case "local_id":
                    resolvedValue =
                      locais.find(
                        (
                          item
                        ) =>
                          item.id ===
                          value
                      )?.nome ||
                      "Local indisponível";
                    break;
                }

                if (
                  isDateField(
                    fields,
                    key
                  )
                ) {
                  resolvedValue =
                    formatDateBR(
                      resolvedValue
                    );
                }

                return {
                  key,

                  label:
                    getFieldLabel(
                      fields,
                      key
                    ),

                  value:
                    resolvedValue,

                  icon:
                    getFieldIcon(
                      key
                    ),
                };
              }
            );

        return items.filter(
          (
            item
          ): item is MetadataItem =>
            item !==
            null
        );
      },
      [
        document,
        fields,
        scopedMedicamentos,
        medicos,
        hospitais,
        farmacias,
        locais,
      ]
    );

  // ==========================================================
  // EXPIRY
  // ==========================================================

  const expiryContext =
    useMemo(
      () => {
        if (
          !document ||
          document.type !==
            "receita"
        ) {
          return null;
        }

        const expiryDate =
          getExpiryDate(
            document
          );

        if (
          !expiryDate
        ) {
          return null;
        }

        const expired =
          isReceitaVencidaSegura(
            expiryDate
          );

        const days =
          getDaysUntil(
            expiryDate
          );

        if (
          expired
        ) {
          return {
            label:
              "Validade registrada já passou",

            description:
              `Validade registrada em ${formatDateBR(
                expiryDate
              )}.`,

            className:
              "border-coral/25 bg-coral/8 text-coral",
          };
        }

        if (
          days !==
            null &&
          days >=
            0 &&
          days <=
            7
        ) {
          return {
            label:
              "Validade próxima",

            description:
              days ===
              0
                ? "A validade registrada termina hoje."
                : `A validade registrada termina em ${days} dia${
                    days ===
                    1
                      ? ""
                      : "s"
                  }.`,

            className:
              "border-amber-400/25 bg-amber-400/8 text-amber-300",
          };
        }

        return {
          label:
            "Validade registrada",

          description:
            `Até ${formatDateBR(
              expiryDate
            )}.`,

          className:
            "border-emerald-400/25 bg-emerald-400/8 text-emerald-300",
        };
      },
      [
        document,
      ]
    );

  // ==========================================================
  // ACTIONS
  // ==========================================================

  const handleFavorite =
    async () => {
      if (
        !document?.id ||
        favoriting
      ) {
        return;
      }

      const wasFavorite =
        document.is_favorite;

      trigger(
        "vibrate"
      );

      setFavoriting(
        true
      );

      try {
        await favoriteDocument(
          document.id
        );

        showToast(
          wasFavorite
            ? "Documento removido dos favoritos"
            : "Documento adicionado aos favoritos",
          "success"
        );
      } catch (
        error
      ) {
        console.error(
          "[DocumentoDetalhes] Erro ao favoritar:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Não foi possível atualizar o favorito.",
          "error"
        );
      } finally {
        setFavoriting(
          false
        );
      }
    };

  const handleDelete =
    async () => {
      if (
        !document?.id ||
        deleting
      ) {
        return;
      }

      setDeleting(
        true
      );

      const documentId =
        document.id;

      const wasPrescription =
        document.type ===
        "receita";

      try {
        await deleteDocument(
          documentId
        );

        if (
          wasPrescription
        ) {
          try {
            await cancelDocumentExpiryNotification(
              documentId
            );
          } catch (
            notificationError
          ) {
            console.warn(
              "[DocumentoDetalhes] Documento excluído, mas a notificação de validade não pôde ser cancelada:",
              notificationError
            );
          }
        }

        trigger(
          "success"
        );

        showToast(
          "Documento excluído do Acervo Clínico.",
          "success"
        );

        router.replace(
          "/saude/documentos"
        );
      } catch (
        error
      ) {
        console.error(
          "[DocumentoDetalhes] Erro ao excluir:",
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
        setDeleting(
          false
        );
      }
    };

  // ==========================================================
  // INVALID / LOADING
  // ==========================================================

  if (
    !id
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento não identificado"
          description="O endereço não contém um documento válido."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    !activePersonId
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Pessoa ativa necessária"
          description="Selecione uma pessoa antes de acessar documentos clínicos."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    document ===
    null
  ) {
    return (
      <DetailsLoading />
    );
  }

  if (
    document ===
    undefined
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento não encontrado"
          description="O documento não existe ou não pertence à pessoa ativa."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  if (
    document.category_id !==
    "saude"
  ) {
    return (
      <PageTransition>
        <StatePage
          title="Documento incompatível"
          description="Este documento não pertence ao Acervo Clínico."
          onBack={
            () =>
              router.replace(
                "/saude/documentos"
              )
          }
        />
      </PageTransition>
    );
  }

  const attachments =
    getSafeAttachments(
      document
    );

  const createdAt =
    formatDateTimeBR(
      document.created_at
    );

  const updatedAt =
    formatDateTimeBR(
      document.updated_at
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-[100dvh] bg-void pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/88 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    router.back();
                  }
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-transform active:scale-95"
                aria-label="Voltar"
              >
                <ArrowLeft
                  size={
                    18
                  }
                  className="text-ink-primary"
                />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileHeart
                    size={
                      13
                    }
                    className="text-emerald-400"
                  />

                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400">
                    Acervo Clínico
                  </p>
                </div>

                <h1 className="truncate font-display text-base font-semibold text-ink-primary">
                  Detalhes do documento
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleFavorite
              }
              disabled={
                favoriting
              }
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 disabled:opacity-50 ${
                document.is_favorite
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                  : "border-surface-border/50 bg-surface-raised text-ink-muted"
              }`}
              aria-label={
                document.is_favorite
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
            >
              <Star
                size={
                  17
                }
                fill={
                  document.is_favorite
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-3xl space-y-4 px-5 pt-5">
          <motion.div
            initial={{
              opacity:
                0,

              y:
                8,
            }}
            animate={{
              opacity:
                1,

              y:
                0,
            }}
            className="relative overflow-hidden rounded-[30px] border border-surface-border/50 bg-surface p-5 shadow-sm"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/8 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-emerald-400/15 bg-emerald-400/10 text-emerald-400">
                <DocumentTypeIcon
                  size={
                    24
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                  {
                    typeLabel
                  }
                </p>

                <h2 className="mt-1 break-words font-display text-xl font-semibold leading-tight text-ink-primary">
                  {
                    document.title
                  }
                </h2>

                {document.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                    {
                      document.description
                    }
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-surface-border/50 bg-surface-raised px-2.5 py-1 text-[10px] font-medium text-ink-muted">
                    Saúde
                  </span>

                  {attachments.length >
                    0 && (
                    <span className="flex items-center gap-1 rounded-full border border-ice/20 bg-ice/8 px-2.5 py-1 text-[10px] font-medium text-ice">
                      <Paperclip
                        size={
                          10
                        }
                      />

                      {
                        attachments.length
                      }{" "}
                      anexo
                      {attachments.length ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  )}

                  {document.is_favorite && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/8 px-2.5 py-1 text-[10px] font-medium text-amber-300">
                      <Star
                        size={
                          10
                        }
                        fill="currentColor"
                      />

                      Favorito
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {clinicalEntity && (
            <section className="rounded-[28px] border border-violet-400/20 bg-violet-400/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Link2
                  size={
                    14
                  }
                  className="text-violet-300"
                />

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
                  Vínculo no Acervo Clínico
                </p>
              </div>

              <button
                type="button"
                disabled={
                  !clinicalEntity.route
                }
                onClick={
                  () => {
                    if (
                      !clinicalEntity.route
                    ) {
                      return;
                    }

                    trigger(
                      "vibrate"
                    );

                    router.push(
                      clinicalEntity.route
                    );
                  }
                }
                className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-surface-border/40 bg-surface/70 p-3.5 text-left transition-all enabled:hover:border-violet-400/30 enabled:active:scale-[0.99] disabled:cursor-default"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                    <ClinicalEntityIcon
                      size={
                        17
                      }
                      className={
                        clinicalEntity.colorClass
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-primary">
                      {
                        clinicalEntity.label
                      }
                    </p>

                    {clinicalEntity.description && (
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {
                          clinicalEntity.description
                        }
                      </p>
                    )}
                  </div>
                </div>

                {clinicalEntity.route && (
                  <ChevronRight
                    size={
                      16
                    }
                    className="shrink-0 text-violet-300"
                  />
                )}
              </button>
            </section>
          )}

          {!clinicalEntity &&
            (
              document.entidade_tipo ||
              document.entidade_id
            ) && (
            <div className="flex gap-3 rounded-[22px] border border-amber-400/20 bg-amber-400/5 p-4">
              <AlertTriangle
                size={
                  17
                }
                className="mt-0.5 shrink-0 text-amber-300"
              />

              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Vínculo clínico indisponível
                </p>

                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  O documento possui uma referência clínica que não pôde ser interpretada pelo Acervo.
                </p>
              </div>
            </div>
          )}

          {expiryContext && (
            <div
              className={`rounded-[22px] border p-4 ${expiryContext.className}`}
            >
              <div className="flex items-start gap-3">
                <Calendar
                  size={
                    17
                  }
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-semibold">
                    {
                      expiryContext.label
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 opacity-85">
                    {
                      expiryContext.description
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {metadataItems.length >
            0 && (
            <section className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              <div className="mb-4">
                <p className="font-display text-sm font-semibold text-ink-primary">
                  Dados do documento
                </p>

                <p className="mt-1 text-xs text-ink-muted">
                  Informações registradas especificamente neste documento.
                </p>
              </div>

              <div className="space-y-2.5">
                {metadataItems.map(
                  (
                    item
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <div
                        key={
                          item.key
                        }
                        className="flex items-start gap-3 rounded-[18px] border border-surface-border/35 bg-surface-raised/55 p-3.5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ice">
                          <Icon
                            size={
                              15
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                            {
                              item.label
                            }
                          </p>

                          <p className="mt-1 break-words text-sm font-medium text-ink-primary">
                            {
                              item.value
                            }
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-ink-primary">
                  Arquivos
                </p>

                <p className="mt-1 text-xs text-ink-muted">
                  Imagens e PDFs associados ao documento.
                </p>
              </div>

              <span className="rounded-full bg-surface-raised px-2.5 py-1 font-mono text-[10px] text-ink-muted">
                {
                  attachments.length
                }
              </span>
            </div>

            {attachments.length ===
            0 ? (
              <div className="rounded-[20px] border border-dashed border-surface-border/50 bg-surface-raised/30 px-5 py-8 text-center">
                <Paperclip
                  size={
                    20
                  }
                  className="mx-auto text-ink-faint"
                />

                <p className="mt-2 text-xs text-ink-muted">
                  Nenhum arquivo anexado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map(
                  (
                    attachment
                  ) => {
                    const isImage =
                      attachment.type ===
                      "image";

                    const safeUrl =
                      getSafeAttachmentUrl(
                        attachment.url
                      );

                    if (
                      !safeUrl
                    ) {
                      return (
                        <div
                          key={
                            attachment.id
                          }
                          className="flex items-center gap-3 rounded-[20px] border border-amber-400/20 bg-amber-400/5 p-3"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface">
                            <AlertTriangle
                              size={
                                19
                              }
                              className="text-amber-300"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {
                                attachment.name
                              }
                            </p>

                            <p className="mt-1 text-[10px] text-amber-300">
                              Endereço do arquivo inválido
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={
                          attachment.id
                        }
                        href={
                          safeUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={
                          () =>
                            trigger(
                              "vibrate"
                            )
                        }
                        className="group flex items-center gap-3 rounded-[20px] border border-surface-border/40 bg-surface-raised/55 p-3 transition-all hover:border-ice/30 active:scale-[0.99]"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-border/40 bg-surface">
                          {isImage ? (
                            <img
                              src={
                                safeUrl
                              }
                              alt={
                                attachment.name
                              }
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText
                              size={
                                20
                              }
                              className="text-ice"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {
                              attachment.name
                            }
                          </p>

                          <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-faint">
                            {isImage
                              ? "Imagem"
                              : "PDF"}
                          </p>
                        </div>

                        <ExternalLink
                          size={
                            15
                          }
                          className="shrink-0 text-ink-muted transition-colors group-hover:text-ice"
                        />
                      </a>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-surface-border/50 bg-surface p-4 shadow-sm">
            <p className="font-display text-sm font-semibold text-ink-primary">
              Registro no Vault
            </p>

            <div className="mt-4 space-y-3">
              <InfoRow
                icon={
                  UserRound
                }
                label="Proprietário clínico"
                value="Pessoa ativa"
              />

              {createdAt && (
                <InfoRow
                  icon={
                    Calendar
                  }
                  label="Criado"
                  value={
                    createdAt
                  }
                />
              )}

              {updatedAt &&
                updatedAt !==
                  createdAt && (
                  <InfoRow
                    icon={
                      Check
                    }
                    label="Última atualização"
                    value={
                      updatedAt
                    }
                  />
                )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  router.push(
                    `/saude/documentos/editar?id=${document.id}`
                  );
                }
              }
              className="flex items-center justify-center gap-2"
            >
              <FileText
                size={
                  16
                }
              />

              Editar
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setDeleteOpen(
                    true
                  );
                }
              }
              className="flex items-center justify-center gap-2 text-coral"
            >
              <Trash2
                size={
                  16
                }
              />

              Excluir
            </Button>
          </section>
        </section>

        <BottomSheet
          isOpen={
            deleteOpen
          }
          onClose={
            () => {
              if (
                deleting
              ) {
                return;
              }

              setDeleteOpen(
                false
              );
            }
          }
          title="Excluir documento"
        >
          <div className="px-1 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/10 text-coral">
              <Trash2
                size={
                  20
                }
              />
            </div>

            <h3 className="mt-4 font-display text-lg font-semibold text-ink-primary">
              Remover do Acervo Clínico?
            </h3>

            <p className="mt-2 text-sm leading-6 text-ink-muted">
              O documento será removido desta pessoa. Os anexos armazenados pelo Vault serão limpos depois da exclusão local. A entidade clínica vinculada não será apagada.
            </p>

            <div className="mt-5 rounded-[20px] border border-surface-border/40 bg-surface p-3.5">
              <p className="text-xs font-semibold text-ink-primary">
                {
                  document.title
                }
              </p>

              <p className="mt-1 text-[10px] text-ink-muted">
                {
                  typeLabel
                }
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                disabled={
                  deleting
                }
                onClick={
                  () =>
                    setDeleteOpen(
                      false
                    )
                }
              >
                Cancelar
              </Button>

              <button
                type="button"
                disabled={
                  deleting
                }
                onClick={
                  handleDelete
                }
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-coral px-4 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <Trash2
                  size={
                    16
                  }
                />

                {deleting
                  ? "Excluindo..."
                  : "Excluir"}
              </button>
            </div>
          </div>
        </BottomSheet>
      </main>
    </PageTransition>
  );
}

// ============================================================
// INFO ROW
// ============================================================

interface InfoRowProps {
  icon:
    LucideIcon;

  label:
    string;

  value:
    string;
}

function InfoRow({
  icon:
    Icon,
  label,
  value,
}: InfoRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted">
        <Icon
          size={
            15
          }
        />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">
          {
            label
          }
        </p>

        <p className="mt-0.5 text-xs font-medium text-ink-primary">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}

// ============================================================
// STATE PAGE
// ============================================================

interface StatePageProps {
  title:
    string;

  description:
    string;

  onBack:
    () => void;
}

function StatePage({
  title,
  description,
  onBack,
}: StatePageProps) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-void px-5">
      <div className="w-full max-w-sm rounded-[30px] border border-surface-border/50 bg-surface p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <AlertTriangle
            size={
              22
            }
          />
        </div>

        <h1 className="mt-4 font-display text-lg font-semibold text-ink-primary">
          {
            title
          }
        </h1>

        <p className="mt-2 text-sm leading-6 text-ink-muted">
          {
            description
          }
        </p>

        <button
          type="button"
          onClick={
            onBack
          }
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void transition-transform active:scale-95"
        >
          <ArrowLeft
            size={
              16
            }
          />

          Voltar ao acervo
        </button>
      </div>
    </main>
  );
}

// ============================================================
// LOADING
// ============================================================

function DetailsLoading() {
  return (
    <main className="min-h-[100dvh] bg-void px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-3xl animate-pulse space-y-4">
        <div className="h-14 rounded-2xl bg-surface" />

        <div className="h-52 rounded-[30px] bg-surface" />

        <div className="h-28 rounded-[28px] bg-surface" />

        <div className="h-64 rounded-[28px] bg-surface" />
      </div>
    </main>
  );
}