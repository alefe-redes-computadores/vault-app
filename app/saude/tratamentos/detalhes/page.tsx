// app/saude/tratamentos/detalhes/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill,
  Edit3,
  ChevronRight,
  History,
  FileText,
  ArrowLeftRight,
  Clock,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Plus,
  FolderHeart,
  X,
  Receipt,
  Users,
  FileStack,
  Stethoscope,
  ShoppingCart,
  Building2,
  MapPin,
} from "lucide-react";

import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { DocumentCard } from "@/components/DocumentCard";

import { useSafeDb } from "@/hooks/useSafeDb";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useMounted } from "@/hooks/useMounted";

import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

import type {
  Tratamento,
  Document,
  Medicamento,
  Renovacao,
  Medico,
  Cid,
  Hospital,
  LocalSaude,
} from "@/lib/types";

import {
  isReceitaVencidaSegura,
  calcularEconomia,
  sugerirRenovacao,
  getCidInsights,
} from "@/lib/health-insights";

import { getClinicalTheme, formatCurrency } from "@/lib/health-utils";

import {
  SectionTitle,
  DetailInfoRow,
  StatCard,
} from "@/components/detail/DetailComponents";

/* ============================================================
   ANIMAÇÕES
   ============================================================ */

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";

  const parts = isoStr.split("-");

  if (parts.length !== 3) return isoStr;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

interface MedicamentoComAlertas extends Medicamento {
  receitaVencida?: boolean;
  insight?: ReturnType<typeof sugerirRenovacao>;
}

interface DocumentMetadata {
  tratamento_id?: string;
  cid_id?: string;
  [key: string]: unknown;
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function TratamentoContent() {
  const { trigger } = useHapticFeedback();

  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id");

  const { favorite } = useSafeDb();
  const { medicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { hospitais } = useHospitais();
  const { locais } = useLocais();
  const { activePersonId } = useActivePersonId();

  const mounted = useMounted();

  const [tratamento, setTratamento] = useState<Tratamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const [dismissEconomia, setDismissEconomia] = useState(() => {
    if (typeof window !== "undefined" && id) {
      const stored = localStorage.getItem(`dismissEconomia_${id}`);
      return stored === "true";
    }

    return false;
  });

  /* ============================================================
     DADOS
     ============================================================ */

  const allDocuments =
    useLiveQuery(() => db.documents.toArray(), []) || [];

  const allRenovacoes =
    useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const cidsVinculados =
    useLiveQuery(() => {
      if (!tratamento?.cid_ids || tratamento.cid_ids.length === 0) {
        return [];
      }

      return db.cids
        .where("id")
        .anyOf(tratamento.cid_ids)
        .toArray();
    }, [tratamento?.cid_ids]) || [];

  /* ============================================================
     MEDICAMENTOS VINCULADOS
     ============================================================ */

  const linkedMedicamentos = useMemo(() => {
    if (!id || !medicamentos) return [];

    return medicamentos.filter((m: Medicamento) => {
      // Procura tanto no padrão antigo (m.tratamento_ids) quanto no novo (tratamento.medicamento_ids)
      const inMed = m.tratamento_ids && m.tratamento_ids.includes(id);
      const inTrat = tratamento?.medicamento_ids && m.id && tratamento.medicamento_ids.includes(m.id);
      
      return inMed || inTrat;
    });
  }, [medicamentos, tratamento?.medicamento_ids, id]);

  /* ============================================================
     RENOVAÇÕES VINCULADAS
     ============================================================ */

  const linkedRenovacoes = useMemo(() => {
    const medIds = new Set(
      linkedMedicamentos
        .map((m: Medicamento) => m.id)
        .filter(Boolean)
    );

    return allRenovacoes
      .filter(
        (r: Renovacao) =>
          r.medicamento_id &&
          medIds.has(r.medicamento_id)
      )
      .sort(
        (a, b) =>
          new Date(b.data).getTime() -
          new Date(a.data).getTime()
      );
  }, [linkedMedicamentos, allRenovacoes]);

  /* ============================================================
     DOCUMENTOS VINCULADOS
     ============================================================ */

  const linkedDocuments = useMemo(() => {
    if (!id) return [];

    return allDocuments
      .filter((doc: Document) => {
        const meta = doc.metadata as DocumentMetadata;

        return meta.tratamento_id === id;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }, [allDocuments, id]);

  /* ============================================================
     CUSTO TOTAL (SOMA DE MEDICAMENTOS + RENOVAÇÕES COM PARSER SEGURO)
     ============================================================ */

  const custoTotalTratamento = useMemo(() => {
    let total = 0;

    const getSafeNumber = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      // Remove pontos de milhar e troca vírgula por ponto para não falhar
      const parsed = Number(String(val).replace(/\./g, '').replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    linkedMedicamentos.forEach((med: Medicamento) => {
      total += getSafeNumber(med.preco);
    });

    linkedRenovacoes.forEach((r: Renovacao) => {
      total += getSafeNumber(r.preco);
    });

    return total;
  }, [linkedMedicamentos, linkedRenovacoes]);

  const custoDisplay = useMemo(() => {
    if (custoTotalTratamento > 0) {
      return formatCurrency(custoTotalTratamento);
    }
    const isAllSus = linkedMedicamentos.length > 0 && linkedMedicamentos.every(m => m.tipo_aquisicao === 'sus');
    if (isAllSus) return "SUS";
    return "R$ 0,00";
  }, [custoTotalTratamento, linkedMedicamentos]);

  /* ============================================================
     ANÁLISE DE SUS
     ============================================================ */

  const statsSus = useMemo(() => {
    const isAllSus = linkedMedicamentos.length > 0 && linkedMedicamentos.every(m => m.tipo_aquisicao === 'sus');
    const hasSus = linkedMedicamentos.some(m => m.tipo_aquisicao === 'sus');
    
    return { isAllSus, hasSus };
  }, [linkedMedicamentos]);

  /* ============================================================
     ECONOMIA
     ============================================================ */

  const economiaInfo = useMemo(() => {
    return calcularEconomia(linkedRenovacoes);
  }, [linkedRenovacoes]);

  /* ============================================================
     REDE DE APOIO (MÉDICOS, HOSPITAIS E LOCAIS)
     ============================================================ */

  const linkedMedicos = useMemo(() => {
    const medIds = new Set<string>();
    
    // Pega os médicos que estão nos medicamentos
    linkedMedicamentos.forEach((m: Medicamento) => {
      if (m.medico_id) medIds.add(m.medico_id);
    });
    
    // Pega os médicos que estão direto no tratamento
    if (tratamento?.medico_ids) {
      tratamento.medico_ids.forEach(i => medIds.add(i));
    }

    return medicos.filter(
      (med: Medico) =>
        med.id && medIds.has(med.id)
    );
  }, [linkedMedicamentos, medicos, tratamento?.medico_ids]);

  const linkedHospitais = useMemo(() => {
    if (!tratamento?.hospital_ids) return [];
    
    return hospitais.filter(
      (h: Hospital) => 
        h.id && tratamento.hospital_ids!.includes(h.id)
    );
  }, [hospitais, tratamento?.hospital_ids]);

  const linkedLocais = useMemo(() => {
    if (!tratamento?.local_ids) return [];
    
    return locais.filter(
      (l: LocalSaude) => 
        l.id && tratamento.local_ids!.includes(l.id)
    );
  }, [locais, tratamento?.local_ids]);

  /* ============================================================
     ALERTAS DOS MEDICAMENTOS
     ============================================================ */

  const medicamentosComAlertas = useMemo(() => {
    return linkedMedicamentos.map(
      (
        med: Medicamento
      ): MedicamentoComAlertas => {
        const receitaVencida =
          isReceitaVencidaSegura(
            med.proxima_renovacao
          );

        const insight = sugerirRenovacao(med);

        return {
          ...med,
          receitaVencida,
          insight,
        };
      }
    );
  }, [linkedMedicamentos]);

  /* ============================================================
     INSIGHTS DOS CIDs
     ============================================================ */

  const cidsInsights = useMemo(() => {
    return cidsVinculados.map((cid: Cid) => {
      const insight = getCidInsights(
        cid.codigo
      );

      return {
        ...cid,
        insight,
      };
    });
  }, [cidsVinculados]);

  /* ============================================================
     FECHAR MENU
     ============================================================ */

  useEffect(() => {
    const handleClickOutside = () => {
      setIsMenuFlutuanteOpen(false);
    };

    if (isMenuFlutuanteOpen) {
      document.addEventListener(
        "click",
        handleClickOutside
      );

      return () =>
        document.removeEventListener(
          "click",
          handleClickOutside
        );
    }
  }, [isMenuFlutuanteOpen]);

  /* ============================================================
     BUSCAR TRATAMENTO
     ============================================================ */

  useEffect(() => {
    if (!id) {
      router.push("/saude");
      return;
    }

    const fetchTratamento = async () => {
      try {
        const data =
          await db.tratamentos.get(id);

        if (data) {
          setTratamento(data);
        } else {
          router.push("/saude");
        }
      } catch (error) {
        console.error(
          "Erro ao buscar tratamento:",
          error
        );

        router.push("/saude");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTratamento();
  }, [id, router]);

  /* ============================================================
     LOADING
     ============================================================ */

  if (!mounted) {
    return <DetailSkeleton />;
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!tratamento) {
    return null;
  }

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleFavoriteToggle = async (
    docId: string
  ) => {
    await favorite(docId);
    trigger("vibrate");
  };

  const handleDismissEconomia = () => {
    if (id) {
      localStorage.setItem(
        `dismissEconomia_${id}`,
        "true"
      );
    }

    setDismissEconomia(true);
    trigger("vibrate");
  };

  /* ============================================================
     MENU FLUTUANTE
     ============================================================ */

  const menuOptions = [
    {
      id: "adicionar-cid",
      label: "Adicionar CID",
      icon: FolderHeart,
      path: `/saude/cids?tratamento_id=${id}`,
    },
    {
      id: "novo-medicamento",
      label: "Novo Medicamento",
      icon: Pill,
      path: `/saude/medicamentos/novo?tratamento_id=${id}`,
    },
    {
      id: "adicionar-documento",
      label: "Adicionar Documento",
      icon: FileText,
      path: `/novo?tratamento_id=${id}`,
    },
    {
      id: "editar-tratamento",
      label: "Editar Tratamento",
      icon: Edit3,
      path: `/saude/tratamentos/editar?id=${id}`,
    },
  ];

  const handleMenuOptionClick = (
    path: string
  ) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  /* ============================================================
     TEMA CLÍNICO
     ============================================================ */

  const theme = getClinicalTheme(
    tratamento.nome
  );

  const IconComp = theme.icon;

  /* ============================================================
     CATEGORIAS DE MEDICAMENTOS
     ============================================================ */

  const medicamentosAtivos =
    medicamentosComAlertas.filter(
      (m) => m.status !== "descontinuado"
    );

  const medicamentosDescontinuados =
    medicamentosComAlertas.filter(
      (m) => m.status === "descontinuado"
    );

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">

            {/* Esquerda */}

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
                <ChevronRight
                  size={18}
                  className="rotate-180"
                />
              </button>

              <div className="min-w-0">
                <p
                  className={`
                    font-mono
                    text-[11px]
                    uppercase
                    tracking-[0.28em]
                    ${theme.textClass}
                  `}
                >
                  Painel Clínico
                </p>

                <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                  Visão Geral
                </h1>
              </div>
            </div>

            {/* Ações */}

            <div className="flex items-center gap-2">

              {/* Menu + */}

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();

                    trigger("vibrate");

                    setIsMenuFlutuanteOpen(
                      (prev) => !prev
                    );
                  }}
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-full
                    border border-ice/20
                    bg-ice/10
                    text-ice
                    transition-all
                    active:scale-95
                    hover:bg-ice/20
                  "
                  aria-label="Menu"
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
                          setIsMenuFlutuanteOpen(
                            false
                          )
                        }
                        className="
                          fixed inset-0 z-40
                          bg-black/50
                          backdrop-blur-sm
                        "
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
                        className="
                          absolute right-0 top-12 z-50
                          w-56 overflow-hidden
                          rounded-[24px]
                          border border-surface-border/60
                          bg-surface
                          shadow-2xl
                        "
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        <div className="px-3 pb-2 pt-3.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                            Adicionar
                          </p>
                        </div>

                        <div className="space-y-0.5 px-1.5 pb-2">
                          {menuOptions.map(
                            (option) => {
                              const Icon =
                                option.icon;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() =>
                                    handleMenuOptionClick(
                                      option.path
                                    )
                                  }
                                  className="
                                    flex w-full
                                    items-center gap-3
                                    rounded-2xl
                                    px-3 py-2.5
                                    text-left
                                    transition-colors
                                    active:scale-[0.98]
                                    hover:bg-ice/8
                                  "
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                    <Icon size={15} />
                                  </div>

                                  <span className="text-sm font-medium text-ink-primary">
                                    {option.label}
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

              {/* Editar */}

              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");

                  router.push(
                    `/saude/tratamentos/editar?id=${tratamento.id}`
                  );
                }}
                className="
                  flex h-10 w-10
                  items-center justify-center
                  rounded-full
                  border border-surface-border/50
                  bg-surface-raised
                  text-ink-primary
                  transition-all
                  active:scale-95
                "
                aria-label="Editar tratamento"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* ======================================================
            CONTEÚDO
        ====================================================== */}

        <section className="space-y-6 px-5 pt-6">

          {/* ====================================================
              CARD PRINCIPAL
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className={`
              relative
              overflow-hidden
              rounded-[32px]
              border
              bg-surface
              p-6
              shadow-sm
              ${theme.borderClass}
            `}
            style={{
              borderLeft: `6px solid ${theme.hex}`,
            }}
          >
            {/* Ícone decorativo */}

            <div
              className={`
                pointer-events-none
                absolute
                -bottom-8
                -right-8
                opacity-[0.03]
                z-0
                ${theme.textClass}
              `}
            >
              <IconComp size={180} />
            </div>

            {/* Identidade */}

            <div className="relative z-10 flex items-start gap-4">
              <div
                className={`
                  flex h-16 w-16 shrink-0
                  items-center justify-center
                  rounded-2xl
                  border
                  shadow-sm
                  ${theme.bgClass}
                  ${theme.borderClass}
                  ${theme.textClass}
                `}
              >
                <IconComp size={28} />
              </div>

              <div className="min-w-0 pt-1">
                <h2 className="font-display text-2xl font-bold leading-tight text-ink-primary">
                  {tratamento.nome}
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`
                      flex items-center gap-1.5
                      rounded-full
                      px-2.5 py-1
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      ${
                        tratamento.status ===
                        "ativo"
                          ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                          : tratamento.status ===
                            "concluido"
                          ? "border border-ice/20 bg-ice/10 text-ice"
                          : "border border-coral/20 bg-coral/10 text-coral"
                      }
                    `}
                  >
                    {tratamento.status ===
                      "ativo" && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    )}

                    {tratamento.status ===
                    "ativo"
                      ? "Em andamento"
                      : tratamento.status ===
                        "concluido"
                      ? "Concluído"
                      : "Suspenso"}
                  </span>
                </div>
              </div>
            </div>

            {/* ==================================================
                CIDs
            ================================================== */}

            {cidsVinculados.length > 0 && (
              <div className="relative z-10 mt-4 rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  <FolderHeart
                    size={14}
                    className="text-violet-400"
                  />
                  Diagnósticos vinculados:
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {cidsInsights.map((cid) => {
                    const cidTheme =
                      getClinicalTheme(
                        cid.descricao ||
                          cid.codigo
                      );

                    const CidIcon =
                      cidTheme.icon;

                    return (
                      <div
                        key={cid.id}
                        className={`
                          flex items-center gap-1.5
                          rounded-full
                          border
                          px-2.5 py-1
                          ${cidTheme.tagClass}
                        `}
                      >
                        <CidIcon size={12} />

                        <span className="text-[10px] font-semibold">
                          {cid.codigo}
                        </span>

                        <span className="text-[10px] opacity-80">
                          - {cid.descricao}
                        </span>

                        {cid.insight && (
                          <Sparkles
                            size={12}
                            className="opacity-80"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {cidsInsights.some(
                  (c) => c.insight
                ) && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5">
                    <Sparkles
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />

                    <p className="text-[11px] leading-relaxed text-ink-muted">
                      <span className="font-medium text-amber-400">
                        Dica clínica:
                      </span>{" "}
                      {cidsInsights
                        .map(
                          (c) =>
                            c.insight
                              ?.alertaClinico
                        )
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ==================================================
                TAG DO SUS (Custo Zero)
            ================================================== */}

            {statsSus.hasSus && (
              <div className="relative z-10 mt-3 flex items-start gap-2 rounded-lg border border-blue-400/30 bg-blue-400/10 p-2.5">
                <Building2 size={16} className="mt-0.5 shrink-0 text-blue-400" />
                <p className="text-[11px] leading-relaxed text-blue-200">
                  <span className="font-bold text-blue-400">Cobertura SUS:</span>{" "}
                  {statsSus.isAllSus 
                    ? "Este tratamento é 100% garantido pela rede pública (Custo Zero)." 
                    : "Alguns medicamentos deste tratamento são retirados gratuitamente pelo SUS."}
                </p>
              </div>
            )}

            {/* ==================================================
                MÉTRICAS
            ================================================== */}

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-surface-border/50 pt-5">
              <StatCard
                icon={<Pill size={14} />}
                label="Ativos"
                value={`${medicamentosAtivos.length}`}
                description="Medicamentos"
              />

              <StatCard
                icon={<FileStack size={14} />}
                label="Laudos"
                value={`${linkedDocuments.length}`}
                description="Documentos"
              />

              <StatCard
                icon={<Receipt size={14} />}
                label="Custo Total"
                value={custoDisplay}
                description={
                  statsSus.isAllSus 
                    ? "Integral" 
                    : "Histórico completo"
                }
              />
            </div>
          </motion.div>

          {/* ====================================================
              ECONOMIA
          ==================================================== */}

          {economiaInfo &&
            isFinite(
              economiaInfo.percentual
            ) &&
            !dismissEconomia && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className={`
                  flex items-center
                  justify-between
                  rounded-2xl
                  border
                  p-4
                  ${
                    economiaInfo.economia >
                    0
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-coral/30 bg-coral/10"
                  }
                `}
              >
                <div className="flex flex-1 items-center gap-3">
                  <div
                    className={`
                      rounded-full
                      p-2
                      ${
                        economiaInfo.economia >
                        0
                          ? "bg-emerald-500/20"
                          : "bg-coral/20"
                      }
                    `}
                  >
                    {economiaInfo.economia >
                    0 ? (
                      <TrendingDown
                        size={20}
                        className="text-emerald-400"
                      />
                    ) : (
                      <TrendingUp
                        size={20}
                        className="text-coral"
                      />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      {economiaInfo.economia >
                      0
                        ? "💰 Economia na última compra"
                        : "📈 Aumento de custo"}
                    </p>

                    <p className="text-xs text-ink-muted">
                      {economiaInfo.economia >
                      0
                        ? `Você economizou ${formatCurrency(
                            Math.abs(
                              economiaInfo.economia
                            )
                          )} (${Math.abs(
                            economiaInfo.percentual
                          ).toFixed(
                            1
                          )}%) em relação à média anterior.`
                        : `A última compra custou ${formatCurrency(
                            Math.abs(
                              economiaInfo.economia
                            )
                          )} (${Math.abs(
                            economiaInfo.percentual
                          ).toFixed(
                            1
                          )}%) a mais que a média.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleDismissEconomia
                  }
                  className="
                    ml-2 shrink-0
                    rounded-full p-1.5
                    transition-colors
                    hover:bg-void/20
                  "
                  aria-label="Fechar alerta"
                >
                  <X
                    size={16}
                    className="text-ink-muted"
                  />
                </button>
              </motion.div>
            )}

          {/* ====================================================
              REDE DE APOIO (MÉDICOS, HOSPITAIS E LOCAIS)
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.03 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Users size={15} />}
              title="Rede de Apoio"
            />

            {linkedMedicos.length === 0 && linkedHospitais.length === 0 && linkedLocais.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum profissional ou local de saúde vinculado.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                
                {/* Médicos */}
                {linkedMedicos.map(
                  (med: Medico) => (
                    <DetailInfoRow
                      key={med.id}
                      icon={
                        <Stethoscope
                          size={18}
                        />
                      }
                      iconClassName="bg-ice/10 text-ice"
                      label="Profissional"
                      action={
                        <ChevronRight
                          size={17}
                          className="text-ink-faint"
                        />
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/medicos/detalhes?id=${med.id}`
                          );
                        }}
                        className="
                          max-w-full
                          truncate
                          text-left
                          text-sm
                          font-semibold
                          text-ink-primary
                          transition-colors
                          hover:text-ice
                        "
                      >
                        Dr(a). {med.nome}
                      </button>
                    </DetailInfoRow>
                  )
                )}

                {/* Hospitais */}
                {linkedHospitais.map(
                  (hosp: Hospital) => (
                    <DetailInfoRow
                      key={hosp.id}
                      icon={
                        <Building2
                          size={18}
                        />
                      }
                      iconClassName="bg-violet-400/10 text-violet-400"
                      label="Hospital / Clínica"
                      action={
                        <ChevronRight
                          size={17}
                          className="text-ink-faint"
                        />
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/hospitais/detalhes?id=${hosp.id}`
                          );
                        }}
                        className="
                          max-w-full
                          truncate
                          text-left
                          text-sm
                          font-semibold
                          text-ink-primary
                          transition-colors
                          hover:text-violet-400
                        "
                      >
                        {hosp.nome}
                      </button>
                    </DetailInfoRow>
                  )
                )}

                {/* Locais SUS / Postos */}
                {linkedLocais.map(
                  (loc: LocalSaude) => (
                    <DetailInfoRow
                      key={loc.id}
                      icon={
                        <MapPin
                          size={18}
                        />
                      }
                      iconClassName="bg-emerald-400/10 text-emerald-400"
                      label="Posto de Saúde"
                      action={
                        <ChevronRight
                          size={17}
                          className="text-ink-faint"
                        />
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );

                          router.push(
                            `/saude/locais/detalhes?id=${loc.id}`
                          );
                        }}
                        className="
                          max-w-full
                          truncate
                          text-left
                          text-sm
                          font-semibold
                          text-ink-primary
                          transition-colors
                          hover:text-emerald-400
                        "
                      >
                        {loc.nome}
                      </button>
                    </DetailInfoRow>
                  )
                )}

              </div>
            )}
          </motion.div>

          {/* ====================================================
              ÚLTIMAS COMPRAS
          ==================================================== */}

          {linkedRenovacoes.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.04 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Clock size={15} />}
                title="Últimas Compras"
                action={
                  linkedRenovacoes.length >
                  5 ? (
                    <span className="text-[10px] font-medium text-ink-faint">
                      {linkedRenovacoes.length}{" "}
                      registros
                    </span>
                  ) : undefined
                }
              />

              <div className="space-y-2">
                {linkedRenovacoes
                  .slice(0, 5)
                  .map(
                    (
                      ren: Renovacao
                    ) => {
                      const med =
                        linkedMedicamentos.find(
                          (
                            m: Medicamento
                          ) =>
                            m.id ===
                            ren.medicamento_id
                        );

                      return (
                        <DetailInfoRow
                          key={ren.id}
                          icon={
                            <ShoppingCart
                              size={17}
                            />
                          }
                          iconClassName="bg-emerald-400/10 text-emerald-400"
                          label={formatDateDisplay(
                            ren.data
                          )}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-semibold text-ink-primary">
                              {med?.nome ||
                                "Medicamento"}
                            </p>

                            {typeof ren.preco ===
                              "number" &&
                              ren.preco > 0 && (
                                <span className="shrink-0 text-sm font-semibold text-emerald-400">
                                  {formatCurrency(
                                    ren.preco
                                  )}
                                </span>
                              )}
                          </div>
                        </DetailInfoRow>
                      );
                    }
                  )}
              </div>

              {linkedRenovacoes.length >
                5 && (
                <p className="pt-1 text-center text-[10px] text-ink-muted">
                  E mais{" "}
                  {linkedRenovacoes.length -
                    5}{" "}
                  compra(s)...
                </p>
              )}
            </motion.div>
          )}

          {/* ====================================================
              MEDICAMENTOS EM USO
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Pill size={15} />}
              title="Medicamentos em Uso"
              action={
                medicamentosAtivos.length >
                0 ? (
                  <span className="text-[10px] font-medium text-ink-faint">
                    {medicamentosAtivos.length}{" "}
                    ativo
                    {medicamentosAtivos.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                ) : undefined
              }
            />

            {medicamentosAtivos.length ===
            0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">
                  Nenhum medicamento ativo
                  vinculado a este tratamento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {medicamentosAtivos.map(
                  (med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicamentos/detalhes?id=${med.id}`
                        );
                      }}
                      className="
                        group relative
                        w-full
                        cursor-pointer
                        rounded-[24px]
                        border
                        border-surface-border/50
                        bg-surface
                        p-4
                        text-left
                        shadow-sm
                        transition-all
                        hover:border-ice/30
                        active:scale-[0.98]
                      "
                      style={{
                        borderLeft: `4px solid ${
                          activePersonId
                            ? "var(--person-accent, #38BDF8)"
                            : "#38BDF8"
                        }`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ice/10 bg-ice/10 text-ice">
                            <Pill size={18} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-[15px] font-semibold text-ink-primary">
                                {med.nome}
                              </p>

                              {med.receitaVencida && (
                                <span className="shrink-0 rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                                  Vencida
                                </span>
                              )}

                              {med.insight
                                ?.deveRenovar && (
                                <span className="shrink-0 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                  Renovar
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 truncate text-xs text-ink-muted">
                              {med.dosagem} • Dr(a).{" "}
                              {med.medico}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          size={18}
                          className="
                            shrink-0
                            text-ink-faint
                            transition-colors
                            group-hover:text-ice
                          "
                        />
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              HISTÓRICO DESCONTINUADOS
          ==================================================== */}

          {medicamentosDescontinuados.length >
            0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<History size={15} />}
                title="Histórico (Descontinuados)"
                action={
                  <span className="text-[10px] font-medium text-coral">
                    {medicamentosDescontinuados.length}{" "}
                    suspenso
                    {medicamentosDescontinuados.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                }
              />

              <div className="ml-3 space-y-3 border-l-2 border-surface-border/50 pl-4">
                {medicamentosDescontinuados.map(
                  (med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );

                        router.push(
                          `/saude/medicamentos/detalhes?id=${med.id}`
                        );
                      }}
                      className="
                        relative
                        w-full
                        cursor-pointer
                        rounded-2xl
                        border border-coral/10
                        bg-surface-raised/60
                        p-3.5
                        text-left
                        transition-all
                        active:scale-[0.98]
                      "
                    >
                      <div className="absolute -left-[23px] top-4 h-2.5 w-2.5 rounded-full border-2 border-void bg-coral ring-1 ring-surface-border/50" />

                      <div className="mb-1 flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold text-ink-primary line-through opacity-70">
                          {med.nome}{" "}
                          {med.dosagem}
                        </p>

                        <span className="shrink-0 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coral">
                          SUSPENSO
                        </span>
                      </div>

                      {med.motivo_descontinuacao && (
                        <p className="mb-2 text-xs italic text-ink-muted">
                          "
                          {
                            med.motivo_descontinuacao
                          }
                          "
                        </p>
                      )}

                      {med.substituido_por_id && (
                        <div className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-ice/10 bg-ice/10 px-2 py-1 text-[11px] font-medium text-ice">
                          <ArrowLeftRight
                            size={10}
                          />
                          Substituído por
                          outro medicamento
                        </div>
                      )}
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}

          {/* ====================================================
              RECEITAS E LAUDOS
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<FileText size={15} />}
              title="Receitas e Laudos"
              action={
                linkedDocuments.length >
                0 ? (
                  <span className="text-[10px] font-medium text-ink-faint">
                    {linkedDocuments.length}{" "}
                    documento
                    {linkedDocuments.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                ) : undefined
              }
            />

            {linkedDocuments.length ===
            0 ? (
              <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised/50 p-6 text-center">
                <p className="text-sm text-ink-muted">
                  Nenhum documento ou laudo
                  vinculado a este tratamento.
                </p>
              </div>
            ) : (
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {linkedDocuments.map(
                  (doc) => (
                    <motion.div
                      key={doc.id}
                      variants={cardVariants}
                    >
                      <DocumentCard
                        document={doc}
                        onFavoriteToggle={
                          handleFavoriteToggle
                        }
                      />
                    </motion.div>
                  )
                )}
              </motion.div>
            )}
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function TratamentoPage() {
  return (
    <Suspense
      fallback={<DetailSkeleton />}
    >
      <TratamentoContent />
    </Suspense>
  );
}
