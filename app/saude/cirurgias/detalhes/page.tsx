// app/saude/cirurgias/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  Calendar,
  Building2,
  UserCheck,
  Edit3,
  Trash2,
  CheckCircle2,
  Pill,
  FileText,
  Syringe,
  Plus,
  Stethoscope,
  FlaskConical,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useMounted } from "@/hooks/useMounted";

import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";

import {
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

import type {
  Cirurgia,
  Medico,
  Hospital,
  Medicamento,
  Exame,
} from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";

  const parts = isoStr.split("-");

  if (parts.length !== 3) {
    return isoStr;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDiasRestantesLabel(
  dias: number | null
): string | null {
  if (dias === null) return null;

  if (dias === 0) {
    return "Hoje";
  }

  if (dias < 0) {
    return `Há ${Math.abs(dias)} dia${
      Math.abs(dias) > 1 ? "s" : ""
    }`;
  }

  return `Em ${dias} dia${dias > 1 ? "s" : ""}`;
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesCirurgiaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { trigger } = useHapticFeedback();
  const mounted = useMounted();

  const {
    getCirurgia,
    updateCirurgia,
    deleteCirurgia,
  } = useCirurgias();

  const [cirurgia, setCirurgia] =
    useState<Cirurgia | null>(null);

  const [medico, setMedico] =
    useState<Medico | null>(null);

  const [hospital, setHospital] =
    useState<Hospital | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] =
    useState(false);

  /* ==========================================================
     DEXIE
     ========================================================== */

  const medicamentos =
    useLiveQuery(
      () => db.medicamentos.toArray(),
      []
    ) || [];

  const exames =
    useLiveQuery(
      () => db.exames.toArray(),
      []
    ) || [];

  /* ==========================================================
     DADOS DERIVADOS
     ========================================================== */

  const cirurgiaVencida = useMemo(() => {
    if (!cirurgia?.data) {
      return false;
    }

    return isReceitaVencidaSegura(cirurgia.data);
  }, [cirurgia?.data]);

  const diasRestantes = useMemo(() => {
    if (!cirurgia?.data) {
      return null;
    }

    return getDaysUntil(cirurgia.data);
  }, [cirurgia?.data]);

  const medicamentosPosOperatorios = useMemo(() => {
    if (!cirurgia) {
      return [];
    }

    return medicamentos.filter((medicamento: Medicamento) => {
      const matchMedico =
        Boolean(cirurgia.medico_id) &&
        medicamento.medico_id === cirurgia.medico_id;

      const matchData =
        medicamento.data_receita === cirurgia.data;

      return matchMedico || matchData;
    });
  }, [medicamentos, cirurgia]);

  const examesPreOperatorios = useMemo(() => {
    if (!cirurgia) {
      return [];
    }

    return exames.filter((exame: Exame) => {
      return (
        Boolean(cirurgia.medico_id) &&
        exame.medico_id === cirurgia.medico_id
      );
    });
  }, [exames, cirurgia]);

  /* ==========================================================
     CARREGAMENTO
     ========================================================== */

  useEffect(() => {
    let active = true;

    if (!id) {
      router.replace("/saude/cirurgias");
      return;
    }

    const fetchData = async () => {
      try {
        const cirData = await getCirurgia(id);

        if (!active) {
          return;
        }

        if (!cirData) {
          router.replace("/saude/cirurgias");
          return;
        }

        setCirurgia(cirData);

        if (cirData.medico_id) {
          const medData = await db.medicos.get(
            cirData.medico_id
          );

          if (active && medData) {
            setMedico(medData);
          }
        }

        if (cirData.hospital_id) {
          const hospData = await db.hospitais.get(
            cirData.hospital_id
          );

          if (active && hospData) {
            setHospital(hospData);
          }
        }
      } catch (error) {
        console.error(
          "Erro ao buscar detalhes da cirurgia:",
          error
        );

        if (active) {
          router.replace("/saude/cirurgias");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [id, router, getCirurgia]);

  /* ==========================================================
     LOADING
     ========================================================== */

  if (!mounted || isLoading) {
    return <DetailSkeleton />;
  }

  if (!cirurgia) {
    return null;
  }

  /* ==========================================================
     AÇÕES
     ========================================================== */

  const handleStatusChange = async (
    novoStatus:
      | "agendada"
      | "realizada"
      | "cancelada"
  ) => {
    trigger("vibrate");

    if (!id || !cirurgia) {
      return;
    }

    try {
      await updateCirurgia(id, {
        status: novoStatus,
      });

      setCirurgia({
        ...cirurgia,
        status: novoStatus,
      });

      trigger("success");
    } catch (error) {
      console.error(
        "Erro ao atualizar status:",
        error
      );

      trigger("error");
    }
  };

  const handleDelete = async () => {
    trigger("vibrate");

    if (!id) {
      return;
    }

    try {
      await deleteCirurgia(id);

      trigger("success");
      router.replace("/saude/cirurgias");
    } catch (error) {
      console.error(
        "Erro ao excluir cirurgia:",
        error
      );

      trigger("error");
    }
  };

  /* ==========================================================
     MENU
     ========================================================== */

  const menuOptions = [
    {
      id: "nova-consulta",
      label: "Nova Consulta",
      icon: Stethoscope,
      path: `/saude/consultas/nova?medico_id=${
        cirurgia.medico_id || ""
      }&hospital_id=${cirurgia.hospital_id || ""}`,
    },
    {
      id: "novo-exame",
      label: "Novo Exame",
      icon: FlaskConical,
      path: `/saude/exames/novo?medico_id=${
        cirurgia.medico_id || ""
      }&hospital_id=${cirurgia.hospital_id || ""}`,
    },
    {
      id: "novo-medicamento",
      label: "Novo Medicamento",
      icon: Pill,
      path: `/saude/medicamentos/novo?medico_id=${
        cirurgia.medico_id || ""
      }`,
    },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  /* ==========================================================
     DADOS VISUAIS
     ========================================================== */

  const corBorda =
    cirurgiaVencida
      ? "#EF4444"
      : cirurgia.status === "agendada"
        ? "#F59E0B"
        : cirurgia.status === "realizada"
          ? "#34D399"
          : "#EF4444";

  const temHorario =
    typeof cirurgia.horario === "string" &&
    cirurgia.horario.trim().length > 0;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
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
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral">
                  Prontuário
                </p>

                <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                  Detalhes da Cirurgia
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setIsMenuFlutuanteOpen(
                      (previous) => !previous
                    );
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                  type="button"
                  aria-label="Adicionar registro"
                >
                  <Plus size={18} />
                </button>

                <AnimatePresence>
                  {isMenuFlutuanteOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.16,
                        }}
                        onClick={() =>
                          setIsMenuFlutuanteOpen(false)
                        }
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      />

                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 10,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: 10,
                          scale: 0.95,
                        }}
                        transition={{
                          duration: 0.18,
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
                          {menuOptions.map((option) => {
                            const Icon = option.icon;

                            return (
                              <button
                                key={option.id}
                                onClick={() =>
                                  handleMenuOptionClick(
                                    option.path
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
                                type="button"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                  <Icon size={15} />
                                </div>

                                <span className="text-sm font-medium text-ink-primary">
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push(
                    `/saude/cirurgias/editar?id=${cirurgia.id}`
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95 hover:bg-coral/20"
                type="button"
                aria-label="Editar cirurgia"
              >
                <Edit3 size={16} />
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  setShowDeleteModal(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
                type="button"
                aria-label="Excluir cirurgia"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO
          ================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="relative space-y-4 overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft: `6px solid ${corBorda}`,
            }}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-coral/5" />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-coral/20 bg-coral/10 text-coral">
                  <Activity size={24} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar
                      size={14}
                      className="text-coral"
                    />

                    <span className="font-mono text-sm font-bold text-coral">
                      {formatDateDisplay(cirurgia.data)}
                    </span>

                    {temHorario && (
                      <span className="font-mono text-sm text-ink-muted">
                        • {cirurgia.horario}
                      </span>
                    )}

                    {cirurgiaVencida && (
                      <span className="rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold text-coral">
                        Vencida
                      </span>
                    )}

                    {diasRestantes !== null &&
                      diasRestantes >= 0 &&
                      cirurgia.status === "agendada" && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                            diasRestantes <= 2
                              ? "bg-amber-400/20 text-amber-400"
                              : "bg-ice/20 text-ice"
                          }`}
                        >
                          {getDiasRestantesLabel(
                            diasRestantes
                          )}
                        </span>
                      )}
                  </div>

                  <h2 className="mt-1 font-display text-xl font-bold text-ink-primary">
                    {cirurgia.procedimento}
                  </h2>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  cirurgia.status === "agendada"
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
                    : cirurgia.status === "realizada"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                      : "border-coral/20 bg-coral/10 text-coral"
                }`}
              >
                {cirurgia.status}
              </span>
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-3 border-t border-surface-border/40 pt-4 sm:grid-cols-2">
              <DetailInfoRow
                icon={<UserCheck size={18} />}
                iconClassName="bg-coral/10 text-coral"
                label="Cirurgião Responsável"
              >
                <p className="truncate text-sm font-medium text-ink-primary">
                  {medico
                    ? `Dr(a). ${medico.nome}`
                    : "Não vinculado"}
                </p>
              </DetailInfoRow>

              <DetailInfoRow
                icon={<Building2 size={18} />}
                iconClassName="bg-coral/10 text-coral"
                label="Local / Hospital"
              >
                <p className="truncate text-sm font-medium text-ink-primary">
                  {hospital?.nome || "Não informado"}
                </p>
              </DetailInfoRow>
            </div>

            {cirurgia.observacoes && (
              <div className="relative z-10 rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <FileText
                    size={12}
                    className="text-coral"
                  />
                  Orientações, Preparo e Pós-Operatório
                </p>

                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-primary">
                  {cirurgia.observacoes}
                </p>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              REGISTROS CLÍNICOS
          ================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.03 }}
            className="space-y-4"
          >
            <SectionTitle
              icon={<FileText size={15} />}
              title="Registros Clínicos do Procedimento"
            />

            <div className="grid grid-cols-1 gap-3">
              <section className="space-y-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <SectionTitle
                  icon={<Pill size={15} />}
                  title={`Prescrições Relacionadas (${medicamentosPosOperatorios.length})`}
                />

                {medicamentosPosOperatorios.length === 0 ? (
                  <p className="py-2 text-xs text-ink-muted">
                    Nenhum medicamento vinculado a esta
                    data ou equipe médica.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {medicamentosPosOperatorios.map(
                      (medicamento: Medicamento) => (
                        <button
                          key={medicamento.id}
                          onClick={() => {
                            trigger("vibrate");
                            router.push(
                              `/saude/medicamentos/detalhes?id=${medicamento.id}`
                            );
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-coral/30"
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-primary">
                              {medicamento.nome} ·{" "}
                              <span className="text-coral">
                                {medicamento.dosagem}
                              </span>
                            </p>

                            <p className="text-[11px] text-ink-muted">
                              Prescrito em:{" "}
                              {formatDateDisplay(
                                medicamento.data_receita
                              )}
                            </p>
                          </div>

                          <span className="ml-3 shrink-0 text-xs font-mono text-coral">
                            Ver
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
                <SectionTitle
                  icon={<Syringe size={15} />}
                  title={`Exames Relacionados (${examesPreOperatorios.length})`}
                />

                {examesPreOperatorios.length === 0 ? (
                  <p className="py-2 text-xs text-ink-muted">
                    Nenhum exame pré-operatório registrado
                    com esta equipe.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {examesPreOperatorios.map(
                      (exame: Exame) => (
                        <button
                          key={exame.id}
                          onClick={() => {
                            trigger("vibrate");
                            router.push(
                              `/saude/exames/detalhes?id=${exame.id}`
                            );
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-colors hover:border-coral/30"
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-primary">
                              {exame.nome}
                            </p>

                            <p className="text-[11px] text-ink-muted">
                              Solicitado em:{" "}
                              {formatDateDisplay(
                                exame.data
                              )}
                            </p>
                          </div>

                          <span className="ml-3 shrink-0 text-xs font-mono text-coral">
                            Ver
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </section>
            </div>
          </motion.div>

          {/* ==================================================
              AÇÕES DE ATUALIZAÇÃO
          ================================================== */}

          {cirurgia.status === "agendada" && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.06 }}
              className="space-y-3 pt-2"
            >
              <SectionTitle
                icon={<CheckCircle2 size={15} />}
                title="Ações de Atualização"
              />

              <button
                onClick={() =>
                  handleStatusChange("realizada")
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3.5 text-sm font-medium text-emerald-300 transition-all active:scale-[0.98]"
                type="button"
              >
                <CheckCircle2 size={18} />
                Marcar Procedimento como Realizado
              </button>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            CONFIRMAÇÃO
        ==================================================== */}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Cirurgia"
          message="Tem certeza que deseja excluir o registro deste procedimento cirúrgico? Essa ação não pode ser desfeita."
        />
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function DetalhesCirurgiaPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetalhesCirurgiaContent />
    </Suspense>
  );
}