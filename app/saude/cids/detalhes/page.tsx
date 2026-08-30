// app/saude/cids/detalhes/page.tsx
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  FolderHeart,
  MapPin,
  Paperclip,
  Pill,
  Plus,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";

import { db } from "@/lib/db";
import {
  cidsRepository,
} from "@/lib/repositories/cids";
import {
  getCidInsights,
} from "@/lib/health-insights";
import {
  formatCurrency,
  getClinicalTheme,
} from "@/lib/health-utils";
import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";
import {
  useMounted,
} from "@/hooks/useMounted";

import {
  ConfirmationModal,
} from "@/components/ConfirmationModal";
import {
  PageTransition,
} from "@/components/PageTransition";
import {
  DetailSkeleton,
} from "@/components/loading/DetailSkeleton";
import {
  useToast,
} from "@/components/ToastProvider";
import {
  SectionTitle,
} from "@/components/detail/DetailComponents";

import type {
  Cid,
  Document,
  Farmacia,
  Hospital,
  LocalSaude,
  Medicamento,
  Medico,
  Renovacao,
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS AUXILIARES
// ============================================================

type DocumentMetadata = {
  cid_id?: string;
  tratamento_id?: string;
};

type CidDetailsData = {
  cid: Cid;

  tratamentos: Tratamento[];
  medicamentos: Medicamento[];

  medicos: Medico[];
  hospitais: Hospital[];
  locais: LocalSaude[];
  farmacias: Farmacia[];

  documentos: Document[];

  custoTotal: number;
};

// ============================================================
// ANIMAÇÃO
// ============================================================

const fadeUp = {
  initial: {
    opacity: 0,
    y: 15,
  },

  animate: {
    opacity: 1,
    y: 0,
  },
};

// ============================================================
// HELPERS
// ============================================================

function hasId(
  value:
    | string
    | undefined
    | null
): value is string {
  return Boolean(
    value
  );
}

function belongsToPerson(
  entity:
    | {
        person_id?:
          | string;
      }
    | undefined
    | null,
  personId: string
): boolean {
  return (
    entity?.person_id ===
    personId
  );
}

function getDocumentMetadata(
  document: Document
): DocumentMetadata {
  if (
    !document.metadata ||
    typeof document.metadata !==
      "object"
  ) {
    return {};
  }

  return document.metadata as DocumentMetadata;
}

function formatDate(
  value?:
    | string
    | null
): string {
  if (!value) {
    return "";
  }

  const isoDate =
    value.includes("T")
      ? value.split("T")[0]
      : value;

  const parts =
    isoDate.split(
      "-"
    );

  if (
    parts.length !==
    3
  ) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function uniqueById<T extends {
  id?: string;
}>(
  items: T[]
): T[] {
  const seen =
    new Set<string>();

  return items.filter(
    (item) => {
      if (!item.id) {
        return false;
      }

      if (
        seen.has(
          item.id
        )
      ) {
        return false;
      }

      seen.add(
        item.id
      );

      return true;
    }
  );
}

// ============================================================
// CARREGAMENTO
// ============================================================

async function loadCidDetails(
  id: string,
  personId: string
): Promise<CidDetailsData | null> {
  /*
   * O CID em si passa obrigatoriamente pelo repository.
   * Isso impede carregar um diagnóstico pertencente a outra
   * pessoa apenas conhecendo o ID.
   */
  const cidData =
    await cidsRepository.getById(
      id,
      personId
    );

  if (!cidData) {
    return null;
  }

  /*
   * As demais leituras ainda usam o Dexie diretamente porque
   * estamos auditando a área Saúde arquivo por arquivo.
   *
   * O isolamento por pessoa acontece ANTES de qualquer
   * cruzamento relacional.
   */
  const [
    tratamentosData,
    medicamentosData,
    renovacoesData,
    medicosData,
    hospitaisData,
    locaisData,
    farmaciasData,
    documentosData,
  ] =
    await Promise.all([
      db.tratamentos.toArray(),
      db.medicamentos.toArray(),
      db.renovacoes.toArray(),
      db.medicos.toArray(),
      db.hospitais.toArray(),
      db.locais.toArray(),
      db.farmacias.toArray(),
      db.documents.toArray(),
    ]);

  // ==========================================================
  // REGISTROS DA MESMA PESSOA
  // ==========================================================

  const tratamentosDaPessoa =
    tratamentosData.filter(
      (tratamento) =>
        belongsToPerson(
          tratamento,
          personId
        )
    );

  const medicamentosDaPessoa =
    medicamentosData.filter(
      (medicamento) =>
        belongsToPerson(
          medicamento,
          personId
        )
    );

  const renovacoesDaPessoa =
    renovacoesData.filter(
      (renovacao) =>
        belongsToPerson(
          renovacao,
          personId
        )
    );

  const documentosDaPessoa =
    documentosData.filter(
      (documento) =>
        belongsToPerson(
          documento,
          personId
        )
    );

  // ==========================================================
  // TRATAMENTOS DO CID
  // ==========================================================

  const tratamentos =
    tratamentosDaPessoa.filter(
      (
        tratamento:
          Tratamento
      ) =>
        tratamento.cid_ids?.includes(
          id
        )
    );

  const tratamentoIds =
    new Set(
      tratamentos
        .map(
          (tratamento) =>
            tratamento.id
        )
        .filter(
          hasId
        )
    );

  // ==========================================================
  // MEDICAMENTOS DOS TRATAMENTOS
  // ==========================================================

  const medicamentos =
    medicamentosDaPessoa.filter(
      (
        medicamento:
          Medicamento
      ) => {
        if (
          !medicamento.tratamento_ids
            ?.length
        ) {
          return false;
        }

        return medicamento.tratamento_ids.some(
          (
            tratamentoId
          ) =>
            tratamentoIds.has(
              tratamentoId
            )
        );
      }
    );

  const medicamentoIds =
    new Set(
      medicamentos
        .map(
          (medicamento) =>
            medicamento.id
        )
        .filter(
          hasId
        )
    );

  // ==========================================================
  // CUSTO
  // ==========================================================

  const renovacoesDoCid =
    renovacoesDaPessoa.filter(
      (
        renovacao:
          Renovacao
      ) =>
        hasId(
          renovacao.medicamento_id
        ) &&
        medicamentoIds.has(
          renovacao.medicamento_id
        )
    );

  const custoTotal =
    renovacoesDoCid.reduce(
      (
        total,
        renovacao
      ) => {
        if (
          typeof renovacao.preco ===
            "number" &&
          renovacao.preco >
            0
        ) {
          return (
            total +
            renovacao.preco
          );
        }

        return total;
      },
      0
    );

  // ==========================================================
  // MÉDICOS
  //
  // Inclui:
  // - médico diretamente gravado no CID;
  // - médicos dos medicamentos vinculados.
  // ==========================================================

  const medicoIds =
    new Set<string>();

  if (
    cidData.medico_id
  ) {
    medicoIds.add(
      cidData.medico_id
    );
  }

  medicamentos.forEach(
    (medicamento) => {
      if (
        medicamento.medico_id
      ) {
        medicoIds.add(
          medicamento.medico_id
        );
      }
    }
  );

  const medicos =
    uniqueById(
      medicosData.filter(
        (medico) =>
          hasId(
            medico.id
          ) &&
          medicoIds.has(
            medico.id
          )
      )
    );

  // ==========================================================
  // HOSPITAIS
  //
  // Inclui:
  // - hospital diretamente gravado no CID;
  // - hospitais associados aos medicamentos.
  // ==========================================================

  const hospitalIds =
    new Set<string>();

  if (
    cidData.hospital_id
  ) {
    hospitalIds.add(
      cidData.hospital_id
    );
  }

  medicamentos.forEach(
    (medicamento) => {
      if (
        medicamento.hospital_id
      ) {
        hospitalIds.add(
          medicamento.hospital_id
        );
      }
    }
  );

  const hospitais =
    uniqueById(
      hospitaisData.filter(
        (hospital) =>
          hasId(
            hospital.id
          ) &&
          hospitalIds.has(
            hospital.id
          )
      )
    );

  // ==========================================================
  // LOCAIS
  //
  // Inclui:
  // - local diretamente gravado no CID;
  // - locais associados aos medicamentos.
  // ==========================================================

  const localIds =
    new Set<string>();

  if (
    cidData.local_id
  ) {
    localIds.add(
      cidData.local_id
    );
  }

  medicamentos.forEach(
    (medicamento) => {
      if (
        medicamento.local_id
      ) {
        localIds.add(
          medicamento.local_id
        );
      }
    }
  );

  const locais =
    uniqueById(
      locaisData.filter(
        (local) =>
          hasId(
            local.id
          ) &&
          localIds.has(
            local.id
          )
      )
    );

  // ==========================================================
  // FARMÁCIAS
  //
  // Farmácia não é relação direta do CID.
  // Ela aparece somente através dos medicamentos relacionados.
  // ==========================================================

  const farmaciaIds =
    new Set<string>();

  medicamentos.forEach(
    (medicamento) => {
      if (
        medicamento.farmacia_id
      ) {
        farmaciaIds.add(
          medicamento.farmacia_id
        );
      }
    }
  );

  const farmacias =
    uniqueById(
      farmaciasData.filter(
        (farmacia) =>
          hasId(
            farmacia.id
          ) &&
          farmaciaIds.has(
            farmacia.id
          )
      )
    );

  // ==========================================================
  // DOCUMENTOS
  //
  // Somente documentos:
  // - da mesma pessoa;
  // - da área Saúde;
  // - ligados diretamente ao CID ou a um tratamento do CID.
  // ==========================================================

  const documentos =
    documentosDaPessoa.filter(
      (documento) => {
        if (
          documento.category_id !==
          "saude"
        ) {
          return false;
        }

        const metadata =
          getDocumentMetadata(
            documento
          );

        if (
          metadata.cid_id ===
          id
        ) {
          return true;
        }

        if (
          metadata.tratamento_id &&
          tratamentoIds.has(
            metadata.tratamento_id
          )
        ) {
          return true;
        }

        return false;
      }
    );

  return {
    cid:
      cidData,

    tratamentos,

    medicamentos,

    medicos,

    hospitais,

    locais,

    farmacias,

    documentos,

    custoTotal,
  };
}

// ============================================================
// CONTEÚDO
// ============================================================

function CidDetalhesContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const mounted =
    useMounted();

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

  const id =
    searchParams.get(
      "id"
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    cid,
    setCid,
  ] =
    useState<Cid | null>(
      null
    );

  const [
    tratamentos,
    setTratamentos,
  ] =
    useState<
      Tratamento[]
    >([]);

  const [
    medicamentos,
    setMedicamentos,
  ] =
    useState<
      Medicamento[]
    >([]);

  const [
    medicos,
    setMedicos,
  ] =
    useState<
      Medico[]
    >([]);

  const [
    hospitais,
    setHospitais,
  ] =
    useState<
      Hospital[]
    >([]);

  const [
    locais,
    setLocais,
  ] =
    useState<
      LocalSaude[]
    >([]);

  const [
    farmacias,
    setFarmacias,
  ] =
    useState<
      Farmacia[]
    >([]);

  const [
    documentos,
    setDocumentos,
  ] =
    useState<
      Document[]
    >([]);

  const [
    custoTotal,
    setCustoTotal,
  ] =
    useState(
      0
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] =
    useState(
      false
    );

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(
      false
    );

  const [
    isMenuFlutuanteOpen,
    setIsMenuFlutuanteOpen,
  ] =
    useState(
      false
    );

  // ==========================================================
  // CARREGAMENTO
  // ==========================================================

  useEffect(() => {
    if (!id) {
      router.replace(
        "/saude/cids"
      );

      return;
    }

    if (
      !activePersonId
    ) {
      setCid(
        null
      );

      setIsLoading(
        false
      );

      return;
    }

    let cancelled =
      false;

    const fetchData =
      async () => {
        setIsLoading(
          true
        );

        try {
          const data =
            await loadCidDetails(
              id,
              activePersonId
            );

          if (
            cancelled
          ) {
            return;
          }

          if (!data) {
            showToast(
              "CID não encontrado para a pessoa ativa.",
              "error"
            );

            router.replace(
              "/saude/cids"
            );

            return;
          }

          setCid(
            data.cid
          );

          setTratamentos(
            data.tratamentos
          );

          setMedicamentos(
            data.medicamentos
          );

          setMedicos(
            data.medicos
          );

          setHospitais(
            data.hospitais
          );

          setLocais(
            data.locais
          );

          setFarmacias(
            data.farmacias
          );

          setDocumentos(
            data.documentos
          );

          setCustoTotal(
            data.custoTotal
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar detalhes do CID:",
            error
          );

          if (
            !cancelled
          ) {
            showToast(
              "Não foi possível carregar os detalhes do diagnóstico.",
              "error"
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setIsLoading(
              false
            );
          }
        }
      };

    void fetchData();

    return () => {
      cancelled =
        true;
    };
  }, [
    id,
    activePersonId,
    router,
    showToast,
  ]);

  // ==========================================================
  // RELAÇÕES DIRETAS
  // ==========================================================

  const medicoDiagnostico =
    useMemo(() => {
      if (
        !cid?.medico_id
      ) {
        return undefined;
      }

      return medicos.find(
        (medico) =>
          medico.id ===
          cid.medico_id
      );
    }, [
      cid,
      medicos,
    ]);

  const hospitalDiagnostico =
    useMemo(() => {
      if (
        !cid?.hospital_id
      ) {
        return undefined;
      }

      return hospitais.find(
        (hospital) =>
          hospital.id ===
          cid.hospital_id
      );
    }, [
      cid,
      hospitais,
    ]);

  const localDiagnostico =
    useMemo(() => {
      if (
        !cid?.local_id
      ) {
        return undefined;
      }

      return locais.find(
        (local) =>
          local.id ===
          cid.local_id
      );
    }, [
      cid,
      locais,
    ]);

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async () => {
      trigger(
        "vibrate"
      );

      if (
        !id ||
        !activePersonId ||
        isDeleting
      ) {
        return;
      }

      setIsDeleting(
        true
      );

      try {
        await cidsRepository.delete(
          id,
          activePersonId
        );

        trigger(
          "success"
        );

        showToast(
          "Diagnóstico removido com sucesso.",
          "success"
        );

        router.replace(
          "/saude/cids"
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao excluir CID:",
          error
        );

        trigger(
          "error"
        );

        showToast(
          "Erro ao excluir diagnóstico.",
          "error"
        );
      } finally {
        setIsDeleting(
          false
        );

        setShowDeleteModal(
          false
        );
      }
    };

  // ==========================================================
  // INSIGHT
  // ==========================================================

  const cidInsight =
    useMemo(() => {
      if (
        !cid?.codigo
      ) {
        return null;
      }

      return getCidInsights(
        cid.codigo
      );
    }, [
      cid,
    ]);

  // ==========================================================
  // MENU DE ADIÇÃO
  // ==========================================================

  const menuOptions =
    useMemo(
      () => {
        if (!id) {
          return [];
        }

        return [
          {
            id:
              "novo-tratamento",

            label:
              "Novo Tratamento",

            icon:
              FolderHeart,

            path:
              `/saude/tratamentos/novo?cid_id=${id}`,
          },

          {
            id:
              "novo-medicamento",

            label:
              "Novo Medicamento",

            icon:
              Pill,

            path:
              `/saude/medicamentos/novo?cid_id=${id}`,
          },

          {
            id:
              "novo-laudo",

            label:
              "Anexar Laudo",

            icon:
              FileText,

            path:
              `/saude/documentos/novo?type=laudo&cid_id=${id}`,
          },
        ];
      },
      [
        id,
      ]
    );

  const handleMenuOptionClick =
    (
      path: string
    ) => {
      trigger(
        "vibrate"
      );

      setIsMenuFlutuanteOpen(
        false
      );

      router.push(
        path
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !mounted ||
    isLoading
  ) {
    return (
      <DetailSkeleton />
    );
  }

  if (
    !activePersonId ||
    !cid
  ) {
    return null;
  }

  // ==========================================================
  // TEMA
  // ==========================================================

  const theme =
    getClinicalTheme(
      cid.descricao ||
        cid.codigo
    );

  const IconComp =
    theme.icon;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* ====================================================
            HEADER
            ==================================================== */}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl header-safe-top">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
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
              <p
                className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}
              >
                Diagnóstico CID
              </p>

              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes da Condição
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ================================================
                ADICIONAR
                ================================================ */}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  trigger(
                    "vibrate"
                  );

                  setIsMenuFlutuanteOpen(
                    (
                      current
                    ) =>
                      !current
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                aria-label="Adicionar registro relacionado"
                aria-expanded={
                  isMenuFlutuanteOpen
                }
              >
                <Plus
                  size={
                    18
                  }
                />
              </button>

              <AnimatePresence>
                {isMenuFlutuanteOpen && (
                  <>
                    <motion.div
                      initial={{
                        opacity:
                          0,
                      }}
                      animate={{
                        opacity:
                          1,
                      }}
                      exit={{
                        opacity:
                          0,
                      }}
                      transition={{
                        duration:
                          0.16,
                      }}
                      onClick={() =>
                        setIsMenuFlutuanteOpen(
                          false
                        )
                      }
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      aria-hidden="true"
                    />

                    <motion.div
                      initial={{
                        opacity:
                          0,
                        y:
                          10,
                        scale:
                          0.95,
                      }}
                      animate={{
                        opacity:
                          1,
                        y:
                          0,
                        scale:
                          1,
                      }}
                      exit={{
                        opacity:
                          0,
                        y:
                          10,
                        scale:
                          0.95,
                      }}
                      transition={{
                        duration:
                          0.18,
                        ease: [
                          0.16,
                          1,
                          0.3,
                          1,
                        ],
                      }}
                      className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                    >
                      <div className="px-3 pb-2 pt-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                          Adicionar
                        </p>
                      </div>

                      <div className="px-1.5 pb-2">
                        {menuOptions.map(
                          (
                            option
                          ) => {
                            const OptionIcon =
                              option.icon;

                            return (
                              <button
                                key={
                                  option.id
                                }
                                type="button"
                                onClick={() =>
                                  handleMenuOptionClick(
                                    option.path
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                  <OptionIcon
                                    size={
                                      15
                                    }
                                  />
                                </div>

                                <span className="text-sm font-medium text-ink-primary">
                                  {
                                    option.label
                                  }
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* ================================================
                EDITAR
                ================================================ */}

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                router.push(
                  `/saude/cids/editar?id=${cid.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              aria-label="Editar CID"
            >
              <Edit3
                size={
                  16
                }
              />
            </button>

            {/* ================================================
                EXCLUIR
                ================================================ */}

            <button
              type="button"
              onClick={() => {
                trigger(
                  "vibrate"
                );

                setShowDeleteModal(
                  true
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir CID"
            >
              <Trash2
                size={
                  16
                }
              />
            </button>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          {/* ==================================================
              HERO
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            className={`relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm ${theme.borderClass}`}
            style={{
              borderLeft:
                `6px solid ${theme.hex}`,
            }}
          >
            <div
              className={`pointer-events-none absolute -right-4 -top-4 opacity-5 ${theme.textClass}`}
            >
              <IconComp
                size={
                  140
                }
              />
            </div>

            <div className="relative z-10 flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}
              >
                <IconComp
                  size={
                    28
                  }
                />
              </div>

              <div className="min-w-0 pt-1">
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${theme.tagClass}`}
                >
                  {
                    cid.codigo
                  }
                </span>

                <h2 className="mt-1.5 font-display text-xl font-bold leading-tight text-ink-primary">
                  {
                    cid.descricao
                  }
                </h2>

                {cid.data_diagnostico && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Calendar
                      size={
                        13
                      }
                      className="text-ink-faint"
                    />

                    Diagnosticado em{" "}
                    {
                      formatDate(
                        cid.data_diagnostico
                      )
                    }
                  </p>
                )}
              </div>
            </div>

            {/* ================================================
                INSIGHT
                ================================================ */}

            {cidInsight && (
              <div className="relative z-10 mt-5 space-y-2 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-4">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold ${theme.textClass}`}
                >
                  <Sparkles
                    size={
                      14
                    }
                  />

                  <span>
                    Categoria:{" "}
                    {
                      cidInsight.categoria
                    }
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-ink-muted">
                  <strong>
                    Alerta clínico:
                  </strong>{" "}
                  {
                    cidInsight.alertaClinico
                  }
                </p>

                {cidInsight
                  .tratamentosSugeridos
                  ?.length >
                  0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cidInsight.tratamentosSugeridos.map(
                      (
                        tratamento,
                        index
                      ) => (
                        <span
                          key={`${tratamento}-${index}`}
                          className="rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] text-ink-muted"
                        >
                          {
                            tratamento
                          }
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================================================
                RESUMO
                ================================================ */}

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-surface-border/50 pt-5 text-center">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">
                  Tratamentos
                </span>

                <span className="mt-0.5 font-mono text-xl font-semibold text-ink-primary">
                  {
                    tratamentos.length
                  }
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">
                  Medicamentos
                </span>

                <span className="mt-0.5 font-mono text-xl font-semibold text-ink-primary">
                  {
                    medicamentos.length
                  }
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">
                  Documentos
                </span>

                <span className="mt-0.5 font-mono text-xl font-semibold text-ink-primary">
                  {
                    documentos.length
                  }
                </span>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              DADOS DO DIAGNÓSTICO
              ================================================== */}

          {(medicoDiagnostico ||
            hospitalDiagnostico ||
            localDiagnostico ||
            cid.observacoes ||
            cid.anexo_url) && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.02,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <Stethoscope
                    size={
                      15
                    }
                  />
                }
                title="Dados do Diagnóstico"
              />

              <div className="space-y-2 rounded-[24px] border border-surface-border/50 bg-surface p-4">
                {medicoDiagnostico && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !medicoDiagnostico.id
                      ) {
                        return;
                      }

                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/medicos/detalhes?id=${medicoDiagnostico.id}`
                      );
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.99]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Stethoscope
                        size={
                          16
                        }
                        className="shrink-0 text-ice"
                      />

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                          Médico
                        </p>

                        <p className="truncate text-sm font-medium text-ink-primary">
                          Dr(a).{" "}
                          {
                            medicoDiagnostico.nome
                          }
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={
                        15
                      }
                      className="shrink-0 text-ink-faint"
                    />
                  </button>
                )}

                {hospitalDiagnostico && (
                  <div className="flex items-start gap-3 rounded-2xl bg-surface-raised/60 p-3">
                    <Building2
                      size={
                        16
                      }
                      className="mt-0.5 shrink-0 text-violet-400"
                    />

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                        Hospital
                      </p>

                      <p className="text-sm font-medium text-ink-primary">
                        {
                          hospitalDiagnostico.nome
                        }
                      </p>

                      {hospitalDiagnostico.endereco && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {
                            hospitalDiagnostico.endereco
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {localDiagnostico && (
                  <div className="flex items-start gap-3 rounded-2xl bg-surface-raised/60 p-3">
                    <MapPin
                      size={
                        16
                      }
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />

                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                        Local
                      </p>

                      <p className="text-sm font-medium text-ink-primary">
                        {
                          localDiagnostico.nome
                        }
                      </p>

                      {localDiagnostico.endereco && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {
                            localDiagnostico.endereco
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {cid.observacoes && (
                  <div className="rounded-2xl bg-surface-raised/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                      Observações
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                      {
                        cid.observacoes
                      }
                    </p>
                  </div>
                )}

                {cid.anexo_url && (
                  <a
                    href={
                      cid.anexo_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      trigger(
                        "vibrate"
                      )
                    }
                    className="flex items-center justify-between rounded-2xl border border-ice/15 bg-ice/5 p-3 transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip
                        size={
                          16
                        }
                        className="text-ice"
                      />

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                          Anexo
                        </p>

                        <p className="text-sm font-medium text-ice">
                          Abrir arquivo do diagnóstico
                        </p>
                      </div>
                    </div>

                    <ExternalLink
                      size={
                        15
                      }
                      className="text-ice"
                    />
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              CUSTO
              ================================================== */}

          {custoTotal >
            0 && (
            <motion.div
              variants={
                fadeUp
              }
              initial="initial"
              animate="animate"
              transition={{
                delay:
                  0.03,
              }}
              className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border/40 bg-surface-raised p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <DollarSign
                    size={
                      18
                    }
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-primary">
                    Custo relacionado
                  </p>

                  <p className="text-[11px] leading-5 text-ink-muted">
                    Soma das renovações dos medicamentos vinculados aos tratamentos deste CID.
                  </p>
                </div>
              </div>

              <p className="shrink-0 text-base font-bold text-emerald-400">
                {
                  formatCurrency(
                    custoTotal
                  )
                }
              </p>
            </motion.div>
          )}

          {/* ==================================================
              TRATAMENTOS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.05,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FolderHeart
                  size={
                    15
                  }
                />
              }
              title="Tratamentos Relacionados"
            />

            {tratamentos.length ===
            0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum tratamento vinculado a este diagnóstico.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tratamentos.map(
                  (
                    tratamento
                  ) => {
                    const tratamentoTheme =
                      getClinicalTheme(
                        tratamento.nome
                      );

                    const TratamentoIcon =
                      tratamentoTheme.icon;

                    return (
                      <button
                        key={
                          tratamento.id
                        }
                        type="button"
                        onClick={() => {
                          if (
                            !tratamento.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/tratamentos/detalhes?id=${tratamento.id}`
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tratamentoTheme.bgClass} ${tratamentoTheme.textClass} ${tratamentoTheme.borderClass}`}
                          >
                            <TratamentoIcon
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {
                                tratamento.nome
                              }
                            </p>

                            <p className="text-xs capitalize text-ink-muted">
                              {
                                tratamento.status
                              }
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          size={
                            16
                          }
                          className="ml-2 shrink-0 text-ink-faint"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              MEDICAMENTOS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.1,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Pill
                  size={
                    15
                  }
                />
              }
              title="Medicamentos Relacionados"
            />

            {medicamentos.length ===
            0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum medicamento associado aos tratamentos deste CID.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentos.map(
                  (
                    medicamento
                  ) => {
                    const medico =
                      medicamento.medico_id
                        ? medicos.find(
                            (
                              item
                            ) =>
                              item.id ===
                              medicamento.medico_id
                          )
                        : undefined;

                    return (
                      <button
                        key={
                          medicamento.id
                        }
                        type="button"
                        onClick={() => {
                          if (
                            !medicamento.id
                          ) {
                            return;
                          }

                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/medicamentos/detalhes?id=${medicamento.id}`
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                            <Pill
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {
                                medicamento.nome
                              }
                            </p>

                            <p className="truncate text-xs text-ink-muted">
                              {medicamento.dosagem ||
                                "Dosagem não informada"}

                              {medico?.nome
                                ? ` • Dr(a). ${medico.nome}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          size={
                            16
                          }
                          className="ml-2 shrink-0 text-ink-faint"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              EQUIPE MÉDICA
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.15,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Stethoscope
                  size={
                    15
                  }
                />
              }
              title="Equipe Médica Associada"
            />

            {medicos.length ===
            0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum médico relacionado a este diagnóstico.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {medicos.map(
                  (
                    medico
                  ) => (
                    <button
                      key={
                        medico.id
                      }
                      type="button"
                      onClick={() => {
                        if (
                          !medico.id
                        ) {
                          return;
                        }

                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicos/detalhes?id=${medico.id}`
                        );
                      }}
                      className="rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-ink-primary shadow-sm transition-all hover:border-ice/30 active:scale-95"
                    >
                      Dr(a).{" "}
                      {
                        medico.nome
                      }
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              LOCAIS / FARMÁCIAS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.2,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <Building2
                  size={
                    15
                  }
                />
              }
              title="Locais e Farmácias Relacionados"
            />

            {hospitais.length ===
              0 &&
            locais.length ===
              0 &&
            farmacias.length ===
              0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum hospital, local ou farmácia relacionado a este CID.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {hospitais.map(
                  (
                    hospital
                  ) => (
                    <div
                      key={`hospital-${hospital.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                        <Building2
                          size={
                            16
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {
                            hospital.nome
                          }
                        </p>

                        {hospital.endereco && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                            <MapPin
                              size={
                                10
                              }
                            />

                            <span className="truncate">
                              {
                                hospital.endereco
                              }
                            </span>
                          </p>
                        )}

                        {hospital.id ===
                          cid.hospital_id && (
                          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-violet-400">
                            Hospital do diagnóstico
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}

                {locais.map(
                  (
                    local
                  ) => (
                    <div
                      key={`local-${local.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                        <MapPin
                          size={
                            16
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {
                            local.nome
                          }
                        </p>

                        {local.endereco && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {
                              local.endereco
                            }
                          </p>
                        )}

                        {local.tipo && (
                          <p className="mt-0.5 text-[10px] capitalize text-ink-faint">
                            {
                              local.tipo
                            }
                          </p>
                        )}

                        {local.id ===
                          cid.local_id && (
                          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-sky-400">
                            Local do diagnóstico
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}

                {farmacias.map(
                  (
                    farmacia
                  ) => (
                    <div
                      key={`farmacia-${farmacia.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                        <Pill
                          size={
                            16
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {
                            farmacia.nome
                          }
                        </p>

                        <p className="text-[10px] font-medium text-emerald-400">
                          Farmácia
                        </p>

                        {farmacia.endereco && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {
                              farmacia.endereco
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ==================================================
              DOCUMENTOS
              ================================================== */}

          <motion.div
            variants={
              fadeUp
            }
            initial="initial"
            animate="animate"
            transition={{
              delay:
                0.25,
            }}
            className="space-y-3"
          >
            <SectionTitle
              icon={
                <FileText
                  size={
                    15
                  }
                />
              }
              title="Documentos de Saúde Vinculados"
            />

            {documentos.length ===
            0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum documento de saúde vinculado a este CID ou aos seus tratamentos.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map(
                  (
                    documento
                  ) => (
                    <div
                      key={
                        documento.id
                      }
                      className="flex items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <FileText
                          size={
                            16
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-primary">
                          {
                            documento.title
                          }
                        </p>

                        <p className="text-xs capitalize text-ink-muted">
                          {
                            documento.type
                          }
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        </section>

        {/* ====================================================
            DELETE
            ==================================================== */}

        <ConfirmationModal
          isOpen={
            showDeleteModal
          }
          onClose={() => {
            if (
              isDeleting
            ) {
              return;
            }

            setShowDeleteModal(
              false
            );
          }}
          onConfirm={
            handleDelete
          }
          title="Excluir CID"
          message="Tem certeza que deseja remover este diagnóstico? Os tratamentos não serão excluídos, mas a referência deste CID será removida deles."
        />
      </main>
    </PageTransition>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function CidDetalhesPage() {
  return (
    <Suspense
      fallback={
        <DetailSkeleton />
      }
    >
      <CidDetalhesContent />
    </Suspense>
  );
}