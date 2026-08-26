// app/saude/locais/detalhes/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  FileWarning,
  FlaskConical,
  FolderHeart,
  MapPin,
  Pill,
  Plus,
  PlusCircle,
  Stethoscope,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import type {
  Consulta,
  Exame,
  LocalSaude,
  Medico,
  Renovacao,
  Tratamento,
} from "@/lib/types";

import { useLocais } from "@/hooks/useLocais";
import { useMounted } from "@/hooks/useMounted";
import { useHapticFeedback } from "@/lib/haptics";
import { useSubmitAction } from "@/hooks/useSubmitAction";

import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import { formatDateDisplay } from "@/lib/health-utils";

/* ============================================================
   CONSTANTES / TIPOS
   ============================================================ */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface LocalTypeStyle {
  color: string;
  icon: LucideIcon;
}

interface MenuOption {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface RenovacaoComMedicamento
  extends Renovacao {
  medicamento_nome: string;
}

interface AnaliseLocal {
  totalGasto: number;
  ultimaRenovacao: Renovacao | null;
  renovacoesComMed: RenovacaoComMedicamento[];
  consultasLocal: Consulta[];
  examesLocal: Exame[];
  proximasConsultas: Consulta[];
  consultasPassadas: Consulta[];
}

/* ============================================================
   ESTILOS DOS TIPOS DE LOCAL
   ============================================================ */

const LOCAL_TYPE_STYLE: Record<
  string,
  LocalTypeStyle
> = {
  posto_saude: {
    color: "#34D399",
    icon: PlusCircle,
  },
  laboratorio: {
    color: "#A78BFA",
    icon: FlaskConical,
  },
  clinica: {
    color: "#38BDF8",
    icon: Building2,
  },
  outro: {
    color: "#F59E0B",
    icon: MapPin,
  },
};

/* ============================================================
   CORES DOS TRATAMENTOS
   ============================================================ */

const TREATMENT_COLORS: Record<string, string> = {
  tdah: "#8B5CF6",
  ansiedade: "#F59E0B",
  depressão: "#EF4444",
  insônia: "#6366F1",
  enxaqueca: "#8B5CF6",
  neuropatia: "#EC4899",
  hipertensão: "#EF4444",
  colesterol: "#F59E0B",
  diabetes: "#3B82F6",
  tireoide: "#8B5CF6",
  "dor crônica": "#EC4899",
  fibromialgia: "#F472B6",
  asma: "#06B6D4",
  dpoc: "#06B6D4",
  refluxo: "#F59E0B",
  gastrite: "#F59E0B",
  "transtorno bipolar": "#8B5CF6",
  esquizofrenia: "#8B5CF6",
  lúpus: "#EC4899",
  "esclerose múltipla": "#EC4899",
  "artrite reumatoide": "#EC4899",
  câncer: "#EF4444",
  obesidade: "#F59E0B",
  alergia: "#06B6D4",
};

const DEFAULT_TREATMENT_COLOR = "#38BDF8";

/* ============================================================
   HELPERS
   ============================================================ */

function formatCurrency(
  value: number | undefined | null
): string {
  const amount =
    typeof value === "number" ? value : 0;

  return `R$ ${amount
    .toFixed(2)
    .replace(".", ",")}`;
}

function getTreatmentColor(nome: string): string {
  const normalizedName = nome.toLowerCase();

  for (const [key, color] of Object.entries(
    TREATMENT_COLORS
  )) {
    if (normalizedName.includes(key)) {
      return color;
    }
  }

  return DEFAULT_TREATMENT_COLOR;
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesLocalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { trigger } = useHapticFeedback();
  const { deleteLocal } = useLocais();
  const deleteAction = useSubmitAction();
  const mounted = useMounted();

  const [local, setLocal] =
    useState<LocalSaude | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] =
    useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] =
    useState(false);
  const [showAllRetiradas, setShowAllRetiradas] =
    useState(false);

  /* ==========================================================
     DEXIE
     ========================================================== */

  const renovacoes = useLiveQuery(
    () =>
      id
        ? db.renovacoes
            .where("local_id")
            .equals(id)
            .toArray()
        : Promise.resolve([] as Renovacao[]),
    [id]
  ) ?? [];

  const medicamentos = useLiveQuery(
    () => db.medicamentos.toArray(),
    []
  ) ?? [];

  const consultas = useLiveQuery(
    () => db.consultas.toArray(),
    []
  ) ?? [];

  const exames = useLiveQuery(
    () => db.exames.toArray(),
    []
  ) ?? [];

  /* ==========================================================
     VÍNCULOS
     ========================================================== */

  const medicoIds = useMemo(
    () =>
      [...(local?.medico_ids ?? [])]
        .filter(Boolean)
        .sort(),
    [local?.medico_ids]
  );

  const tratamentoIds = useMemo(
    () =>
      [...(local?.tratamento_ids ?? [])]
        .filter(Boolean)
        .sort(),
    [local?.tratamento_ids]
  );

  const medicosVinculados = useLiveQuery(
    () =>
      medicoIds.length > 0
        ? db.medicos
            .where("id")
            .anyOf(medicoIds)
            .toArray()
        : Promise.resolve([] as Medico[]),
    [medicoIds]
  ) ?? [];

  const tratamentosVinculados = useLiveQuery(
    () =>
      tratamentoIds.length > 0
        ? db.tratamentos
            .where("id")
            .anyOf(tratamentoIds)
            .toArray()
        : Promise.resolve([] as Tratamento[]),
    [tratamentoIds]
  ) ?? [];

  /* ==========================================================
     CARREGAMENTO DO LOCAL
     ========================================================== */

  useEffect(() => {
    if (!id) {
      router.replace("/saude/locais");
      return;
    }

    let active = true;

    setIsLoading(true);

    db.locais
      .get(id)
      .then((result) => {
        if (!active) return;

        setLocal(result ?? null);

        if (!result) {
          router.replace("/saude/locais");
        }
      })
      .catch(() => {
        if (active) {
          router.replace("/saude/locais");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, router]);

  /* ==========================================================
     ANÁLISE DO LOCAL
     ========================================================== */

  const analiseLocal = useMemo<AnaliseLocal>(() => {
    if (!id) {
      return {
        totalGasto: 0,
        ultimaRenovacao: null,
        renovacoesComMed: [],
        consultasLocal: [],
        examesLocal: [],
        proximasConsultas: [],
        consultasPassadas: [],
      };
    }

    const renovacoesComMed: RenovacaoComMedicamento[] =
      renovacoes.map((renovacao) => {
        const medicamento = medicamentos.find(
          (item) =>
            item.id === renovacao.medicamento_id
        );

        return {
          ...renovacao,
          medicamento_nome:
            medicamento?.nome || "Medicamento",
        };
      });

    const renovacoesOrdenadas = [
      ...renovacoesComMed,
    ].sort(
      (a, b) =>
        new Date(b.data).getTime() -
        new Date(a.data).getTime()
    );

    const totalGasto = renovacoes.reduce(
      (total, renovacao) => {
        const preco =
          typeof renovacao.preco === "number"
            ? renovacao.preco
            : Number(renovacao.preco) || 0;

        return preco > 0 ? total + preco : total;
      },
      0
    );

    const consultasLocal = consultas
      .filter(
        (consulta) => consulta.local_id === id
      )
      .sort((a, b) =>
        (b.data || "").localeCompare(
          a.data || ""
        )
      );

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximasConsultas = consultasLocal
      .filter(
        (consulta) =>
          !!consulta.data &&
          new Date(consulta.data) >= hoje
      )
      .sort((a, b) =>
        (a.data || "").localeCompare(
          b.data || ""
        )
      );

    const consultasPassadas = consultasLocal
      .filter(
        (consulta) =>
          !!consulta.data &&
          new Date(consulta.data) < hoje
      )
      .sort((a, b) =>
        (b.data || "").localeCompare(
          a.data || ""
        )
      );

    const examesLocal = exames
      .filter((exame) => exame.local_id === id)
      .sort((a, b) =>
        (b.data || "").localeCompare(
          a.data || ""
        )
      );

    return {
      totalGasto,
      ultimaRenovacao:
        renovacoesOrdenadas[0] ?? null,
      renovacoesComMed: renovacoesOrdenadas,
      consultasLocal,
      examesLocal,
      proximasConsultas,
      consultasPassadas,
    };
  }, [
    consultas,
    exames,
    id,
    medicamentos,
    renovacoes,
  ]);

  /* ==========================================================
     ESTADOS
     ========================================================== */

  if (!mounted || isLoading) {
    return <DetailSkeleton />;
  }

  if (!local) {
    return null;
  }

  /* ==========================================================
     CONFIGURAÇÕES
     ========================================================== */

  const localStyle =
    LOCAL_TYPE_STYLE[local.tipo || "outro"] ??
    LOCAL_TYPE_STYLE.outro;

  const LocalIcon = localStyle.icon;

  const retiradasVisiveis = showAllRetiradas
    ? analiseLocal.renovacoesComMed
    : analiseLocal.renovacoesComMed.slice(0, 5);

  /* ==========================================================
     MENU
     ========================================================== */

  const menuOptions: MenuOption[] = [
    {
      id: "nova-renovacao",
      label: "Nova Retirada/Renovação",
      icon: FileWarning,
      path: `/saude/renovacao/nova?local_id=${id}`,
    },
    {
      id: "novo-medicamento",
      label: "Novo Medicamento",
      icon: Pill,
      path: `/saude/medicamentos/novo?local_id=${id}`,
    },
  ];

  const handleMenuToggle = () => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen((open) => !open);
  };

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  const handleDelete = () => {
    if (!id) return;

    deleteAction.run(
      async () => {
        await deleteLocal(id);
        router.replace("/saude/locais");
      },
      {
        successMessage: "Local excluído com sucesso",
        errorMessage: "Erro ao excluir local",
        goBackOnSuccess: false,
      }
    );
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft
                size={18}
                className="text-ink-primary"
              />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                Unidade de Saúde
              </p>

              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes do Local
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* MENU */}

            <div className="relative">
              <button
                type="button"
                onClick={handleMenuToggle}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all hover:bg-ice/20 active:scale-95"
                aria-label="Adicionar registro"
                aria-expanded={isMenuFlutuanteOpen}
              >
                <Plus size={18} />
              </button>

              <AnimatePresence>
                {isMenuFlutuanteOpen && (
                  <>
                    <motion.button
                      type="button"
                      aria-label="Fechar menu"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      onClick={() =>
                        setIsMenuFlutuanteOpen(false)
                      }
                      className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm"
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
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                    >
                      <div className="px-3 pb-2 pt-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                          Ações
                        </p>
                      </div>

                      <div className="px-1.5 pb-2">
                        {menuOptions.map((option) => {
                          const Icon = option.icon;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                handleMenuOptionClick(
                                  option.path
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ice/8 active:scale-[0.98]"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                <Icon size={15} />
                              </span>

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

            {/* EDITAR */}

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                router.push(
                  `/saude/locais/editar?id=${local.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:text-emerald-400 active:scale-95"
              aria-label="Editar local"
            >
              <Edit3 size={16} />
            </button>

            {/* EXCLUIR */}

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              aria-label="Excluir local"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* ====================================================
            CONTEÚDO
        ==================================================== */}

        <section className="space-y-5 px-5 pt-6">
          {/* ==================================================
              HERO
          ================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="space-y-4 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft: `6px solid ${localStyle.color}`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  backgroundColor: `${localStyle.color}15`,
                  color: localStyle.color,
                  borderColor: `${localStyle.color}30`,
                }}
              >
                <LocalIcon size={24} />
              </div>

              <div className="min-w-0 pt-1">
                <h2 className="truncate font-display text-xl font-bold text-ink-primary">
                  {local.nome}
                </h2>

                <p className="mt-1 leading-relaxed text-sm text-ink-muted">
                  {local.endereco ||
                    "Endereço não informado."}
                </p>

                {local.telefone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <MapPin size={12} />
                    {local.telefone}
                  </p>
                )}
              </div>
            </div>

            {/* VÍNCULOS RESUMIDOS */}

            {(medicosVinculados.length > 0 ||
              tratamentosVinculados.length > 0) && (
              <div className="flex flex-wrap gap-2 border-t border-surface-border/40 pt-2">
                {medicosVinculados.map((medico) => (
                  <span
                    key={medico.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ice/10 px-2.5 py-1 text-xs text-ice"
                  >
                    <Stethoscope size={12} />

                    Dr(a).{" "}
                    {medico.nome.split(" ")[0]}
                  </span>
                ))}

                {tratamentosVinculados.map(
                  (tratamento) => {
                    const color = getTreatmentColor(
                      tratamento.nome
                    );

                    return (
                      <span
                        key={tratamento.id}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${color}20`,
                          color,
                        }}
                      >
                        <Activity size={10} />
                        {tratamento.nome}
                      </span>
                    );
                  }
                )}
              </div>
            )}

            {/* MÉTRICAS */}

            <div className="grid grid-cols-3 gap-3 border-t border-surface-border/40 pt-4">
              <StatCard
                icon={<Stethoscope size={14} />}
                label="Médicos"
                value={String(
                  medicosVinculados.length
                )}
              />

              <StatCard
                icon={<FolderHeart size={14} />}
                label="Tratamentos"
                value={String(
                  tratamentosVinculados.length
                )}
              />

              <StatCard
                icon={<FileWarning size={14} />}
                label="Retiradas"
                value={String(
                  analiseLocal.renovacoesComMed.length
                )}
              />
            </div>

            {analiseLocal.ultimaRenovacao && (
              <div className="border-t border-surface-border/40 pt-2">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock
                    size={14}
                    style={{
                      color: localStyle.color,
                    }}
                  />

                  <span>
                    Última retirada:{" "}
                    <span className="font-medium text-ink-primary">
                      {formatDateDisplay(
                        analiseLocal.ultimaRenovacao
                          .data
                      )}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* ==================================================
              MÉDICOS
          ================================================== */}

          {medicosVinculados.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.02 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Stethoscope size={15} />}
                title="Médicos que atendem aqui"
              />

              <div className="grid grid-cols-1 gap-2">
                {medicosVinculados.map((medico) => (
                  <button
                    key={medico.id}
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      router.push(
                        `/saude/medicos/detalhes?id=${medico.id}`
                      );
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-colors hover:border-ice/30 active:scale-[0.98]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                      <Stethoscope size={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-primary">
                        Dr(a). {medico.nome}
                      </span>

                      {medico.especialidade && (
                        <span className="block text-[11px] text-ink-muted">
                          {medico.especialidade}
                        </span>
                      )}
                    </span>

                    <ChevronRight
                      size={16}
                      className="shrink-0 text-ink-faint"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              TRATAMENTOS
          ================================================== */}

          {tratamentosVinculados.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.03 }}
              className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={<FolderHeart size={15} />}
                title="Tratamentos neste local"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {tratamentosVinculados.map(
                  (tratamento) => {
                    const color = getTreatmentColor(
                      tratamento.nome
                    );

                    return (
                      <span
                        key={tratamento.id}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: `${color}20`,
                          borderColor: `${color}40`,
                          color,
                        }}
                      >
                        <Activity size={10} />
                        {tratamento.nome}
                      </span>
                    );
                  }
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              PRÓXIMAS CONSULTAS
          ================================================== */}

          {analiseLocal.proximasConsultas.length >
            0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.04 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Calendar size={15} />}
                title="Próximas consultas"
              />

              <div className="space-y-2">
                {analiseLocal.proximasConsultas.map(
                  (consulta) => (
                    <button
                      key={consulta.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          `/saude/consultas/detalhes?id=${consulta.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-emerald-400/30 active:scale-[0.98]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                          <Calendar size={16} />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-primary">
                            {consulta.especialidade ||
                              "Consulta"}
                          </span>

                          <span className="block text-[11px] text-ink-muted">
                            {formatDateDisplay(
                              consulta.data
                            )}
                            {consulta.horario &&
                              ` às ${consulta.horario}`}
                          </span>
                        </span>
                      </span>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              EXAMES
          ================================================== */}

          {analiseLocal.examesLocal.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<FlaskConical size={15} />}
                title="Exames realizados"
              />

              <div className="space-y-2">
                {analiseLocal.examesLocal.map(
                  (exame) => (
                    <button
                      key={exame.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          `/saude/exames/detalhes?id=${exame.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-violet-400/30 active:scale-[0.98]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                          <FlaskConical size={16} />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-primary">
                            {exame.nome}
                          </span>

                          <span className="block text-[11px] text-ink-muted">
                            {formatDateDisplay(
                              exame.data
                            )}
                          </span>
                        </span>
                      </span>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              RETIRADAS
          ================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.06 }}
            className="space-y-4 pt-2"
          >
            <SectionTitle
              icon={<FileWarning size={15} />}
              title={`Últimas retiradas (${analiseLocal.renovacoesComMed.length})`}
            />

            <div className="space-y-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm">
              {analiseLocal.renovacoesComMed.length ===
              0 ? (
                <p className="py-2 text-xs text-ink-muted">
                  Nenhum registro de retirada vinculado a
                  este local.
                </p>
              ) : (
                <>
                  {retiradasVisiveis.map((renovacao) => (
                    <button
                      key={renovacao.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          `/saude/renovacao/detalhes?id=${renovacao.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3.5 text-left transition-colors hover:border-emerald-400/30 active:scale-[0.98]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-border/40 bg-surface">
                          <FileText
                            size={14}
                            className="text-ink-muted"
                          />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-primary">
                            {
                              renovacao.medicamento_nome
                            }
                          </span>

                          <span className="block text-[11px] text-ink-muted">
                            {formatDateDisplay(
                              renovacao.data
                            )}
                          </span>
                        </span>
                      </span>

                      {typeof renovacao.preco ===
                        "number" &&
                      renovacao.preco > 0 ? (
                        <span className="shrink-0 text-sm font-semibold text-emerald-400">
                          {formatCurrency(
                            renovacao.preco
                          )}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                          Gratuito (SUS)
                        </span>
                      )}
                    </button>
                  ))}

                  {analiseLocal.renovacoesComMed.length >
                    5 && (
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        setShowAllRetiradas(
                          (value) => !value
                        );
                      }}
                      className="w-full py-2 text-center text-xs font-bold text-ice transition-colors hover:text-ice-light"
                    >
                      {showAllRetiradas
                        ? "Ver menos"
                        : `Ver todas (${analiseLocal.renovacoesComMed.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              CUSTOS EVENTUAIS
          ================================================== */}

          {analiseLocal.totalGasto > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.07 }}
              className="flex items-center justify-between rounded-2xl border border-surface-border/40 bg-surface-raised p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <DollarSign size={18} />
                </div>

                <div>
                  <p className="text-xs font-medium text-ink-primary">
                    Custos eventuais (fora do SUS)
                  </p>

                  <p className="text-[11px] text-ink-muted">
                    Gastos particulares registrados nesta
                    unidade
                  </p>
                </div>
              </div>

              <p className="text-base font-bold text-emerald-400">
                {formatCurrency(
                  analiseLocal.totalGasto
                )}
              </p>
            </motion.div>
          )}
        </section>

        {/* ====================================================
            CONFIRMAÇÃO DE EXCLUSÃO
        ==================================================== */}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Local"
          message="Tem certeza que deseja excluir este posto/clínica? Os registros associados não serão apagados, mas perderão a referência a este local."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleteAction.isSubmitting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function DetalhesLocalPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetalhesLocalContent />
    </Suspense>
  );
}