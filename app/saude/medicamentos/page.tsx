// app/saude/medicamentos/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Pill,
  Circle,
  Droplet,
  Syringe,
  StickyNote,
  ChevronDown,
  Calendar,
  Search,
  Check,
  Zap,
  EyeOff,
  Eye,
  FileWarning,
  Store,
  Building2,
  Stethoscope,
} from "lucide-react";

import { useMedicamentos } from "@/hooks/useMedicamentos";
import { usePersons } from "@/hooks/usePersons";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/Input";

import {
  computeEstoqueInfo,
  getDaysUntil,
} from "@/lib/health-utils";

import {
  sugerirRenovacao,
  isReceitaVencidaSegura,
} from "@/lib/health-insights";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type {
  Medicamento,
  Person,
} from "@/lib/types";

import { QuickDoseModal } from "@/components/saude/QuickDoseModal";

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const FORMATOS = [
  {
    id: "inteiro",
    label: "Inteiro",
    icon: Circle,
  },
  {
    id: "comprimido",
    label: "Comprimido",
    icon: Pill,
  },
  {
    id: "partido",
    label: "Partido",
    icon: Pill,
  },
  {
    id: "capsula",
    label: "Cápsula",
    icon: Pill,
  },
  {
    id: "gota",
    label: "Gota",
    icon: Droplet,
  },
  {
    id: "gotas",
    label: "Gotas",
    icon: Droplet,
  },
  {
    id: "injecao",
    label: "Injeção",
    icon: Syringe,
  },
  {
    id: "adesivo",
    label: "Adesivo",
    icon: StickyNote,
  },
] as const;

type SortOption = "urgency" | "renewal" | "name";

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
}[] = [
  {
    value: "urgency",
    label: "Urgência",
  },
  {
    value: "renewal",
    label: "Renovação",
  },
  {
    value: "name",
    label: "Nome",
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(date?: string) {
  if (!date) return null;

  try {
    return format(new Date(date), "dd MMM", {
      locale: ptBR,
    });
  } catch {
    return null;
  }
}

function getTratamentoStyle(
  nome: string,
  cor?: string
) {
  if (cor) {
    return {
      backgroundColor: `${cor}18`,
      borderColor: `${cor}38`,
      color: cor,
    };
  }

  const n = (nome || "").toLowerCase();

  if (n.includes("tdah")) {
    return {
      backgroundColor: "rgb(16 185 129 / 0.10)",
      borderColor: "rgb(16 185 129 / 0.20)",
      color: "rgb(52 211 153)",
    };
  }

  if (n.includes("dor")) {
    return {
      backgroundColor: "rgb(255 107 107 / 0.10)",
      borderColor: "rgb(255 107 107 / 0.20)",
      color: "var(--color-coral, #ff6b6b)",
    };
  }

  if (n.includes("depress")) {
    return {
      backgroundColor: "rgb(59 130 246 / 0.10)",
      borderColor: "rgb(59 130 246 / 0.20)",
      color: "rgb(96 165 250)",
    };
  }

  if (n.includes("ansied")) {
    return {
      backgroundColor: "rgb(251 191 36 / 0.10)",
      borderColor: "rgb(251 191 36 / 0.20)",
      color: "rgb(251 191 36)",
    };
  }

  return {
    backgroundColor: "rgb(139 92 246 / 0.10)",
    borderColor: "rgb(139 92 246 / 0.20)",
    color: "rgb(167 139 250)",
  };
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function MedicamentosListPage() {
  const router = useRouter();

  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const { medicamentos: medicamentosTodas } =
    useMedicamentos();

  const { activePersonId } =
    useActivePersonId();

  const persons = usePersons() as Person[];

  const { tratamentos = [] } =
    useTratamentos();

  const [searchQuery, setSearchQuery] =
    useState("");

  const [showDescontinuados, setShowDescontinuados] =
    useState(false);

  const [sortBy, setSortBy] =
    useState<SortOption>("urgency");

  const [isSortDropdownOpen, setIsSortDropdownOpen] =
    useState(false);

  const [quickDoseMedId, setQuickDoseMedId] =
    useState<string | null>(null);

  /* ============================================================
     MEDICAMENTOS DA PESSOA ATIVA
     ============================================================ */

  const medicamentos = useMemo(() => {
    if (!activePersonId) return [];

    return (medicamentosTodas || []).filter(
      (medicamento) =>
        medicamento.person_id === activePersonId
    );
  }, [
    medicamentosTodas,
    activePersonId,
  ]);

  /* ============================================================
     MAPA DE TRATAMENTOS
     ============================================================ */

  const tratamentoMap = useMemo(() => {
    const map = new Map<
      string,
      {
        nome: string;
        cor?: string;
      }
    >();

    (tratamentos || []).forEach((tratamento) => {
      if (!tratamento.id) return;

      map.set(tratamento.id, {
        nome: tratamento.nome,
        cor: tratamento.cor,
      });
    });

    return map;
  }, [tratamentos]);

  /* ============================================================
     PESSOA ATIVA
     ============================================================ */

  const activePerson = (persons || []).find(
    (person) =>
      person.id === activePersonId
  );

  const activePersonColor =
    activePerson?.color || "#38BDF8";

  /* ============================================================
     LISTA FILTRADA E ORDENADA
     ============================================================ */

  const filteredAndSorted = useMemo(() => {
    if (!medicamentos) return [];

    let list = [...medicamentos];

    /* ----------------------------------------------------------
       Suspensos
       ---------------------------------------------------------- */

    if (!showDescontinuados) {
      list = list.filter(
        (medicamento) =>
          medicamento.status !== "descontinuado"
      );
    }

    /* ----------------------------------------------------------
       Busca
       ---------------------------------------------------------- */

    const query = searchQuery
      .toLowerCase()
      .trim();

    if (query) {
      list = list.filter((medicamento) => {
        const nome =
          medicamento.nome?.toLowerCase() || "";

        const medico =
          medicamento.medico?.toLowerCase() || "";

        const farmacia =
          medicamento.farmacia?.toLowerCase() || "";

        return (
          nome.includes(query) ||
          medico.includes(query) ||
          farmacia.includes(query)
        );
      });
    }

    /* ----------------------------------------------------------
       Ordenação
       ---------------------------------------------------------- */

    return list.sort((a, b) => {
      /* ========================================================
         POR NOME
         ======================================================== */

      if (sortBy === "name") {
        return a.nome.localeCompare(
          b.nome,
          "pt-BR",
          {
            sensitivity: "base",
          }
        );
      }

      /* ========================================================
         POR RENOVAÇÃO
         ======================================================== */

      if (sortBy === "renewal") {
        const aRenovacao =
          getDaysUntil(a.proxima_renovacao) ??
          9999;

        const bRenovacao =
          getDaysUntil(b.proxima_renovacao) ??
          9999;

        const aVencida = aRenovacao < 0;
        const bVencida = bRenovacao < 0;

        if (aVencida && !bVencida) return -1;
        if (!aVencida && bVencida) return 1;

        return aRenovacao - bRenovacao;
      }

      /* ========================================================
         POR URGÊNCIA
         ======================================================== */

      const aVencida =
        isReceitaVencidaSegura(
          a.proxima_renovacao
        );

      const bVencida =
        isReceitaVencidaSegura(
          b.proxima_renovacao
        );

      if (aVencida && !bVencida) return -1;
      if (!aVencida && bVencida) return 1;

      const isSOSA =
        a.tipo_uso !== "continuo";

      const isSOSB =
        b.tipo_uso !== "continuo";

      const estoqueA = isSOSA
        ? a.estoque_quantidade ?? 9999
        : computeEstoqueInfo(a)
            ?.quantidadeRestante ??
          a.estoque_quantidade ??
          9999;

      const estoqueB = isSOSB
        ? b.estoque_quantidade ?? 9999
        : computeEstoqueInfo(b)
            ?.quantidadeRestante ??
          b.estoque_quantidade ??
          9999;

      const isCriticoA = estoqueA < 10;
      const isCriticoB = estoqueB < 10;

      if (isCriticoA && !isCriticoB) return -1;
      if (!isCriticoA && isCriticoB) return 1;

      const diasA =
        getDaysUntil(
          a.proxima_renovacao
        ) ?? 9999;

      const diasB =
        getDaysUntil(
          b.proxima_renovacao
        ) ?? 9999;

      return diasA - diasB;
    });
  }, [
    medicamentos,
    searchQuery,
    showDescontinuados,
    sortBy,
  ]);

  /* ============================================================
     ORDENAÇÃO
     ============================================================ */

  const handleSortChange = (
    value: SortOption
  ) => {
    trigger("vibrate");

    setSortBy(value);
    setIsSortDropdownOpen(false);
  };

  /* ============================================================
     LOADING
     ============================================================ */

  if (medicamentosTodas === undefined) {
    return <CardListSkeleton />;
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ======================================================
            HEADER
            ====================================================== */}

        <header
          className="
            sticky top-0 z-30
            border-b border-surface-border/30
            bg-void/85
            px-5
            pb-4
            pt-4
            header-safe-top
            backdrop-blur-xl
          "
        >
          {/* ----------------------------------------------------
              TÍTULO
              ---------------------------------------------------- */}

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="
                  flex h-11 w-11 shrink-0
                  items-center justify-center
                  rounded-full
                  border border-surface-border/50
                  bg-surface-raised
                  text-ink-primary
                  transition-transform
                  active:scale-95
                "
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                  Meus medicamentos
                </h1>

                <p className="mt-0.5 text-sm text-ink-muted">
                  {filteredAndSorted.length}{" "}
                  {filteredAndSorted.length === 1
                    ? "ativo"
                    : "ativos"}
                </p>
              </div>
            </div>

            {/* --------------------------------------------------
                SUSPENSOS
                -------------------------------------------------- */}

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                setShowDescontinuados(
                  (current) => !current
                );
              }}
              aria-label={
                showDescontinuados
                  ? "Ocultar medicamentos suspensos"
                  : "Mostrar medicamentos suspensos"
              }
              aria-pressed={showDescontinuados}
              className={`
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-full
                border
                transition-all
                active:scale-95
                ${
                  showDescontinuados
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                    : "border-surface-border/50 bg-surface-raised text-ink-muted"
                }
              `}
            >
              {showDescontinuados ? (
                <Eye size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
          </div>

          {/* ----------------------------------------------------
              BUSCA + ORDENAÇÃO
              ---------------------------------------------------- */}

          <div className="mt-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="
                  pointer-events-none
                  absolute left-3.5 top-1/2
                  -translate-y-1/2
                  text-ink-muted
                "
              />

              <Input
                placeholder="Buscar remédio ou médico..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                className="
                  h-11 w-full
                  rounded-2xl
                  bg-surface-raised/60
                  pl-10
                  text-sm
                "
              />
            </div>

            {/* --------------------------------------------------
                ORDENAÇÃO
                -------------------------------------------------- */}

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setIsSortDropdownOpen(
                    (current) => !current
                  );
                }}
                aria-expanded={
                  isSortDropdownOpen
                }
                className="
                  flex h-11 items-center gap-1.5
                  rounded-2xl
                  border border-surface-border/60
                  bg-surface-raised
                  px-3
                  text-xs font-semibold
                  text-ink-muted
                  outline-none
                  transition-all
                  hover:border-surface-border/80
                  active:scale-[0.98]
                "
              >
                <span className="max-w-[60px] truncate">
                  {
                    SORT_OPTIONS.find(
                      (option) =>
                        option.value === sortBy
                    )?.label
                  }
                </span>

                <ChevronDown
                  size={14}
                  className={`
                    transition-transform
                    ${
                      isSortDropdownOpen
                        ? "rotate-180"
                        : ""
                    }
                  `}
                />
              </button>

              <AnimatePresence>
                {isSortDropdownOpen && (
                  <>
                    {/* Backdrop invisível */}

                    <motion.button
                      type="button"
                      aria-label="Fechar ordenação"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() =>
                        setIsSortDropdownOpen(
                          false
                        )
                      }
                      className="
                        fixed inset-0 z-40
                        cursor-default
                        bg-transparent
                      "
                    />

                    {/* Menu */}

                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 8,
                        scale: 0.96,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: 8,
                        scale: 0.96,
                      }}
                      transition={{
                        duration: 0.15,
                      }}
                      className="
                        absolute right-0 top-12 z-50
                        w-44 overflow-hidden
                        rounded-[20px]
                        border border-surface-border/60
                        bg-surface
                        p-1.5
                        shadow-xl
                      "
                    >
                      {SORT_OPTIONS.map(
                        (option) => {
                          const isSelected =
                            sortBy ===
                            option.value;

                          return (
                            <button
                              key={
                                option.value
                              }
                              type="button"
                              onClick={() =>
                                handleSortChange(
                                  option.value
                                )
                              }
                              className={`
                                flex w-full
                                items-center
                                justify-between
                                rounded-2xl
                                px-3 py-2.5
                                text-left
                                text-sm
                                transition-colors
                                ${
                                  isSelected
                                    ? "bg-ice/10 font-semibold text-ice"
                                    : "text-ink-primary hover:bg-surface-raised"
                                }
                              `}
                            >
                              <span>
                                {
                                  option.label
                                }
                              </span>

                              {isSelected && (
                                <Check
                                  size={14}
                                  className="text-ice"
                                />
                              )}
                            </button>
                          );
                        }
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* ======================================================
            LISTA
            ====================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          {filteredAndSorted.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="Nenhum medicamento encontrado"
              description={
                searchQuery.trim()
                  ? "Não encontramos medicamentos para essa busca."
                  : showDescontinuados
                    ? "Não há medicamentos suspensos cadastrados."
                    : "Cadastre um medicamento para começar a acompanhar seu tratamento."
              }
              actionLabel={
                searchQuery.trim() ||
                showDescontinuados
                  ? "Limpar filtros"
                  : undefined
              }
              onAction={
                searchQuery.trim() ||
                showDescontinuados
                  ? () => {
                      setSearchQuery("");
                      setShowDescontinuados(
                        false
                      );
                      trigger("vibrate");
                    }
                  : undefined
              }
            />
          ) : (
            filteredAndSorted.map(
              (med: Medicamento, index) => {
                /* ==============================================
                   ESTADO DO MEDICAMENTO
                   ============================================== */

                const isSOS =
                  med.tipo_uso !== "continuo";

                const estoqueInfo =
                  computeEstoqueInfo(med);

                const qtd = isSOS
                  ? (med.estoque_quantidade ??
                    null)
                  : (estoqueInfo?.quantidadeRestante ??
                    med.estoque_quantidade ??
                    null);

                const tratamentoIds =
                  med.tratamento_ids || [];

                const isSuspenso =
                  med.status ===
                  "descontinuado";

                const isControlado =
                  med.tipo_receita ===
                    "amarela" ||
                  med.tipo_receita === "azul";

                const insight = isSuspenso
                  ? null
                  : sugerirRenovacao(med);

                const receitaVencida =
                  isReceitaVencidaSegura(
                    med.proxima_renovacao
                  );

                /* ==============================================
                   FORMATO
                   ============================================== */

                const formatoBanco =
                  med.formato
                    ?.toLowerCase()
                    .trim() ||
                  "inteiro";

                const itemFormato =
                  FORMATOS.find(
                    (formato) =>
                      formato.id ===
                      formatoBanco
                  ) || FORMATOS[0];

                const SelectedFormatIcon =
                  itemFormato.icon;

                /* ==============================================
                   CORES
                   ============================================== */

                const cor1 =
                  med.cores &&
                  med.cores.length > 0
                    ? med.cores[0]
                    : "#60A5FA";

                const cor2 =
                  med.cores &&
                  med.cores.length > 1
                    ? med.cores[1]
                    : null;

                const cardBorderColor =
                  activePersonColor || cor1;

                const iconContainerStyle =
                  cor2
                    ? {
                        background: `linear-gradient(135deg, ${cor1}25 50%, ${cor2}25 50%)`,
                        borderColor: `${cor1}55`,
                      }
                    : {
                        backgroundColor: `${cor1}15`,
                        borderColor: `${cor1}40`,
                      };

                /* ==============================================
                   ESTOQUE / URGÊNCIA
                   ============================================== */

                const estoqueCritico =
                  qtd !== null &&
                  qtd < 10;

                const estoqueZerado =
                  qtd !== null &&
                  qtd <= 0;

                /* ==============================================
                   CARD
                   ============================================== */

                return (
                  <motion.article
                    key={med.id}
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.18,
                      delay: Math.min(
                        index * 0.025,
                        0.2
                      ),
                    }}
                    className={`
                      group relative
                      overflow-hidden
                      rounded-[24px]
                      border
                      bg-surface
                      shadow-md
                      transition-all
                      ${
                        isSuspenso
                          ? "border-coral/30 opacity-60"
                          : "border-surface-border hover:bg-surface-raised"
                      }
                    `}
                    style={{
                      borderColor: isSuspenso
                        ? undefined
                        : `${cardBorderColor}40`,
                    }}
                  >
                    {/* Barra lateral de identidade */}

                    <div
                      className={`
                        absolute
                        bottom-0 left-0 top-0
                        w-1.5
                        ${
                          isSuspenso
                            ? "bg-coral"
                            : med.tipo_receita ===
                                "amarela"
                              ? "bg-amber-400"
                              : med.tipo_receita ===
                                  "azul"
                                ? "bg-blue-400"
                                : ""
                        }
                      `}
                      style={
                        !isSuspenso &&
                        med.tipo_receita !==
                          "amarela" &&
                        med.tipo_receita !==
                          "azul"
                          ? {
                              backgroundColor:
                                cardBorderColor,
                            }
                          : undefined
                      }
                    />

                    <div className="p-4 pl-5">
                      {/* ========================================
                          CABEÇALHO DO CARD
                          ======================================== */}

                      <button
                        type="button"
                        onClick={() => {
                          trigger("vibrate");

                          router.push(
                            `/saude/medicamentos/detalhes?id=${med.id}`
                          );
                        }}
                        className="
                          flex w-full
                          items-start gap-3.5
                          text-left
                          outline-none
                        "
                      >
                        {/* ÍCONE */}

                        <div
                          className="
                            flex h-12 w-12
                            shrink-0
                            items-center
                            justify-center
                            rounded-2xl
                            border
                            shadow-inner
                          "
                          style={
                            iconContainerStyle
                          }
                        >
                          <SelectedFormatIcon
                            size={24}
                            style={{
                              color: cor1,
                            }}
                            strokeWidth={2.4}
                          />
                        </div>

                        {/* INFORMAÇÕES */}

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-baseline gap-2">
                            <h3 className="
                              min-w-0 flex-1
                              truncate
                              font-display
                              text-base
                              font-bold
                              uppercase
                              text-ink-primary
                            ">
                              {med.nome}
                            </h3>

                            {med.dosagem && (
                              <span className="
                                shrink-0
                                whitespace-nowrap
                                text-xs
                                font-semibold
                                text-ink-muted
                              ">
                                {med.dosagem}
                              </span>
                            )}
                          </div>

                          {/* BADGES */}

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {isSOS && (
                              <span className="
                                flex shrink-0
                                items-center gap-0.5
                                rounded-md
                                border border-amber-400/20
                                bg-amber-400/10
                                px-1.5 py-0.5
                                text-[9px]
                                font-bold
                                uppercase
                                text-amber-400
                              ">
                                <Zap
                                  size={8}
                                  fill="currentColor"
                                />
                                SOS
                              </span>
                            )}

                            {isControlado && (
                              <span className="
                                shrink-0
                                rounded-md
                                border border-blue-400/20
                                bg-blue-400/10
                                px-1.5 py-0.5
                                text-[9px]
                                font-bold
                                uppercase
                                text-blue-400
                              ">
                                Controlado
                              </span>
                            )}

                            {receitaVencida &&
                              !isSuspenso && (
                                <span className="
                                  shrink-0
                                  rounded-md
                                  border border-coral/20
                                  bg-coral/10
                                  px-1.5 py-0.5
                                  text-[9px]
                                  font-bold
                                  uppercase
                                  text-coral
                                ">
                                  Vencida
                                </span>
                              )}

                            {isSuspenso && (
                              <span className="
                                shrink-0
                                rounded-md
                                border border-coral/20
                                bg-coral/10
                                px-1.5 py-0.5
                                text-[9px]
                                font-bold
                                uppercase
                                text-coral
                              ">
                                Suspenso
                              </span>
                            )}
                          </div>

                          {/* ======================================
                              MÉDICO / FARMÁCIA
                              ====================================== */}

                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="
                              flex max-w-[170px]
                              items-center gap-1.5
                              truncate
                              text-xs
                              font-medium
                              text-ink-muted
                            ">
                              <Stethoscope
                                size={11}
                                className="
                                  shrink-0
                                  text-ink-faint
                                "
                              />

                              <span className="truncate">
                                {med.medico ||
                                  "Médico não informado"}
                              </span>
                            </p>

                            {med.farmacia && (
                              <span className="
                                flex max-w-[140px]
                                items-center gap-1
                                truncate
                                border-l
                                border-surface-border/60
                                pl-2
                                text-[10px]
                                text-ink-muted
                              ">
                                <Store
                                  size={10}
                                  className="
                                    shrink-0
                                    text-emerald-400/80
                                  "
                                />

                                <span className="truncate">
                                  {med.farmacia}
                                </span>
                              </span>
                            )}

                            {med.hospital_id &&
                              !med.farmacia && (
                                <span className="
                                  flex items-center gap-1
                                  border-l
                                  border-surface-border/60
                                  pl-2
                                  text-[10px]
                                  text-ink-muted
                                ">
                                  <Building2
                                    size={10}
                                    className="
                                      text-violet-400/80
                                    "
                                  />
                                  Hospital
                                </span>
                              )}
                          </div>

                          {/* ======================================
                              TRATAMENTOS
                              ====================================== */}

                          {tratamentoIds.length >
                            0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tratamentoIds
                                .slice(0, 3)
                                .map(
                                  (
                                    tratamentoId: string
                                  ) => {
                                    const tratamento =
                                      tratamentoMap.get(
                                        tratamentoId
                                      );

                                    if (
                                      !tratamento
                                    ) {
                                      return null;
                                    }

                                    const style =
                                      getTratamentoStyle(
                                        tratamento.nome,
                                        tratamento.cor
                                      );

                                    return (
                                      <span
                                        key={
                                          tratamentoId
                                        }
                                        className="
                                          max-w-[100px]
                                          truncate
                                          rounded-full
                                          border
                                          px-2 py-0.5
                                          text-[9px]
                                          font-bold
                                          uppercase
                                          tracking-wide
                                        "
                                        style={style}
                                      >
                                        {
                                          tratamento.nome
                                        }
                                      </span>
                                    );
                                  }
                                )}

                              {tratamentoIds.length >
                                3 && (
                                <span className="
                                  flex items-center
                                  text-[9px]
                                  font-medium
                                  text-ink-faint
                                ">
                                  +
                                  {tratamentoIds.length -
                                    3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>

                      {/* ==========================================
                          INSIGHT
                          ========================================== */}

                      {insight?.deveRenovar && (
                        <button
                          type="button"
                          onClick={() => {
                            trigger("vibrate");

                            router.push(
                              `/saude/renovacao/nova?medicamento_id=${med.id}`
                            );
                          }}
                          className={`
                            mt-3
                            flex w-fit
                            items-center gap-1.5
                            rounded-xl
                            border
                            px-2.5 py-1.5
                            text-[10px]
                            font-semibold
                            transition-all
                            active:scale-[0.98]
                            ${
                              insight.urgencia ===
                              "alta"
                                ? "border-coral/30 bg-coral/15 text-coral-200"
                                : "border-amber-400/30 bg-amber-400/15 text-amber-200"
                            }
                          `}
                        >
                          <FileWarning size={12} />

                          <span className="text-left">
                            {insight.mensagem}
                          </span>
                        </button>
                      )}

                      {/* ==========================================
                          RODAPÉ DO CARD
                          ========================================== */}

                      <div className="
                        mt-3
                        flex items-center
                        justify-between
                        gap-2
                        border-t
                        border-surface-border/40
                        pt-3
                      ">
                        {/* ESTOQUE + TOMAR */}

                        <div className="
                          flex min-w-0
                          items-center gap-2
                        ">
                          <span
                            className={`
                              truncate
                              text-[11px]
                              font-bold
                              ${
                                estoqueZerado
                                  ? "text-coral"
                                  : estoqueCritico
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                              }
                            `}
                          >
                            {qtd !== null
                              ? `${qtd} ${
                                  med.estoque_unidade_medida ||
                                  "unidades"
                                }`
                              : "Sem estoque"}
                          </span>

                          {qtd !== null &&
                            qtd > 0 &&
                            !isSuspenso && (
                              <button
                                type="button"
                                onClick={() => {
                                  trigger(
                                    "vibrate"
                                  );

                                  setQuickDoseMedId(
                                    med.id!
                                  );
                                }}
                                className="
                                  flex shrink-0
                                  items-center gap-1
                                  rounded-lg
                                  border
                                  border-emerald-500/30
                                  bg-emerald-500/10
                                  px-2.5 py-1
                                  text-[10px]
                                  font-bold
                                  text-emerald-400
                                  transition-all
                                  hover:bg-emerald-500/20
                                  active:scale-95
                                "
                              >
                                <Zap
                                  size={10}
                                  fill="currentColor"
                                />
                                Tomar
                              </button>
                            )}
                        </div>

                        {/* RENOVAÇÃO */}

                        {!isSuspenso && (
                          <div className="
                            flex shrink-0
                            items-center
                            overflow-hidden
                            rounded-lg
                            border
                            border-surface-border
                            bg-surface-raised
                          ">
                            <button
                              type="button"
                              onClick={() => {
                                trigger(
                                  "vibrate"
                                );

                                router.push(
                                  `/saude/renovacao/nova?medicamento_id=${med.id}`
                                );
                              }}
                              className="
                                flex items-center
                                gap-1
                                px-2.5 py-1
                                text-[10px]
                                font-bold
                                text-ink-muted
                                transition-colors
                                hover:text-ink-primary
                                active:bg-surface-border
                              "
                            >
                              <Calendar
                                size={10}
                                className={
                                  insight?.urgencia ===
                                  "alta"
                                    ? "text-coral"
                                    : "text-amber-400"
                                }
                              />

                              Renovar
                            </button>

                            {med.proxima_renovacao && (
                              <span className="
                                border-l
                                border-surface-border
                                bg-surface
                                px-2 py-1
                                text-[9px]
                                font-bold
                                text-ink-muted
                                whitespace-nowrap
                              ">
                                {formatDate(
                                  med.proxima_renovacao
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              }
            )
          )}
        </section>

        {/* ======================================================
            QUICK DOSE
            ====================================================== */}

        <QuickDoseModal
          isOpen={!!quickDoseMedId}
          onClose={() =>
            setQuickDoseMedId(null)
          }
          preselectedMedicamentoId={
            quickDoseMedId || undefined
          }
          onSuccess={() => {
            if (
              typeof window !==
              "undefined"
            ) {
              window.dispatchEvent(
                new Event("sync:process")
              );
            }
          }}
        />
      </main>
    </PageTransition>
  );
}
