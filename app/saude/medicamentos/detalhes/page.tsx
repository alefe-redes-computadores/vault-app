// app/saude/medicamentos/detalhes/page.tsx
"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Pill,
  Circle,
  Droplet,
  Syringe,
  StickyNote,
  Edit3,
  Package,
  Stethoscope,
  Store,
  FileText,
  Calendar,
  Activity,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Building2,
  Info,
  MapPin,
  Zap,
  Clock,
  TrendingUp,
  LineChart,
  Check,
  ExternalLink,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  FileWarning,
  Gift,
  AlertCircle,
  Trash2,
  Phone,
  Award,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { db } from "@/lib/db";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { QuickDoseModal } from "@/components/saude/QuickDoseModal";
import { ListIcon } from "@/components/list/ListIcon";
import {
  SectionTitle,
  DetailInfoRow,
  StatCard,
} from "@/components/detail/DetailComponents";

import {
  computeEstoqueInfo,
  TIPO_RECEITA_LABELS,
  VALIDADE_RECEITA_DIAS,
  getDaysUntil,
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  sugerirRenovacao,
  isReceitaVencidaSegura,
  analisarComportamentoUso,
  analisarMelhorFarmacia,
} from "@/lib/health-insights";

import type {
  Medicamento,
  Tratamento,
  Renovacao,
  Cid,
} from "@/lib/types";

interface HistDosagem {
  dosagem_antiga: string;
  data_mudanca: string;
  medico_responsavel: string;
}
/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(isoStr?: string) {
  if (!isoStr) return "—";

  try {
    return format(new Date(isoStr), "dd MMM yyyy", {
      locale: ptBR,
    });
  } catch {
    return isoStr;
  }
}

/* ============================================================
   ÍCONE DE COMPRIMIDO PARTIDO
   ============================================================ */

const SplitPillIcon = ({
  size,
  fill = "currentColor",
  stroke = "currentColor",
  strokeWidth = 2,
}: {
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" fill={fill} />
    <line
      x1="12"
      y1="2"
      x2="12"
      y2="22"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="2"
    />
  </svg>
);

/* ============================================================
   FORMATOS
   ============================================================ */

const FORMATOS = [
  {
    id: "comprimido",
    label: "Inteiro",
    icon: Circle,
  },
  {
    id: "partido",
    label: "Partido",
    icon: SplitPillIcon,
  },
  {
    id: "capsula",
    label: "Cápsula",
    icon: Pill,
  },
  {
    id: "gota",
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
];

/* ============================================================
   CONTEÚDO
   ============================================================ */

function MedicamentoDetalhesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id");

  const { trigger } = useHapticFeedback();
  const { deleteMedicamento } = useMedicamentos();
  const { activePersonId } = useActivePersonId();

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [showAllRenovacoes, setShowAllRenovacoes] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "loading";
  } | null>(null);

  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [isQuickDoseOpen, setIsQuickDoseOpen] =
    useState(false);

  /* ==========================================================
     DEXIE
     ========================================================== */

  const med = useLiveQuery(
    () => (id ? db.medicamentos.get(id) : undefined),
    [id]
  );

  const medico = useLiveQuery(
    () =>
      med?.medico_id
        ? db.medicos.get(med.medico_id)
        : undefined,
    [med?.medico_id]
  );

  const hospital = useLiveQuery(
    () =>
      med?.hospital_id
        ? db.hospitais.get(med.hospital_id)
        : undefined,
    [med?.hospital_id]
  );

  const local = useLiveQuery(
    () =>
      med?.local_id
        ? db.locais.get(med.local_id)
        : undefined,
    [med?.local_id]
  );

  const farmacia = useLiveQuery(
    () =>
      med?.farmacia_id
        ? db.farmacias.get(med.farmacia_id)
        : undefined,
    [med?.farmacia_id]
  );

  const renovacoes =
    useLiveQuery(
      () =>
        db.renovacoes
          .where("medicamento_id")
          .equals(id || "")
          .reverse()
          .sortBy("data"),
      [id]
    ) || [];

  const documento = useLiveQuery(
    () =>
      med?.document_id
        ? db.documents.get(med.document_id)
        : undefined,
    [med?.document_id]
  );

  const ultimaDose = useLiveQuery(
    () =>
      db.doseLogs
        .where("medicamento_id")
        .equals(id || "")
        .reverse()
        .first(),
    [id]
  );

  const todosMedicamentosAtivos =
    useLiveQuery(
      () =>
        db.medicamentos
          .where("status")
          .notEqual("descontinuado")
          .toArray(),
      []
    ) || [];

  const doseLogs =
    useLiveQuery(
      () =>
        db.doseLogs
          .where("medicamento_id")
          .equals(id || "")
          .toArray(),
      [id]
    ) || [];

  const tratamentos =
    useLiveQuery(() => {
      if (
        !med?.tratamento_ids ||
        med.tratamento_ids.length === 0
      ) {
        return [];
      }

      return db.tratamentos
        .where("id")
        .anyOf(med.tratamento_ids)
        .toArray();
    }, [med?.tratamento_ids]) || [];

  const cids =
    useLiveQuery(() => {
      if (!med?.cid_ids || med.cid_ids.length === 0) {
        return [];
      }

      return db.cids
        .where("id")
        .anyOf(med.cid_ids)
        .toArray();
    }, [med?.cid_ids]) || [];

  const farmaciasMap =
    useLiveQuery(
      () =>
        db.farmacias
          .toArray()
          .then(
            (farmacias) =>
              new Map(
                farmacias.map((item) => [
                  item.id,
                  item.nome,
                ])
              )
          ),
      []
    ) || new Map<string, string>();

  /* ==========================================================
     DADOS DERIVADOS
     ========================================================== */

  const melhorFarmacia = useMemo(() => {
    const resultado = analisarMelhorFarmacia(renovacoes);

    return resultado.length > 0
      ? resultado[0]
      : null;
  }, [renovacoes]);

  if (!med || med === undefined) {
    return <DetailSkeleton />;
  }

  if (isDeleting) {
    return <div className="min-h-screen bg-void" />;
  }

  const isSOS = med.tipo_uso !== "continuo";

  const estoqueInfo = computeEstoqueInfo(med);

  const qtd = isSOS
    ? med.estoque_quantidade ?? 0
    : estoqueInfo?.quantidadeRestante ??
      med.estoque_quantidade ??
      0;

  const isVencida = isReceitaVencidaSegura(
    med.proxima_renovacao
  );

  const alertaInteligente = sugerirRenovacao(med);

  const diasRestantes = getDaysUntil(
    med.proxima_renovacao
  );

  const comportamento = analisarComportamentoUso(
    med,
    doseLogs
  );

  /* ==========================================================
     ESTOQUE
     ========================================================== */

  const getEstoqueStyle = () => {
    if (qtd <= 9) {
      return {
        color: "text-coral animate-pulse font-bold",
        icon: AlertTriangle,
        label: "CRÍTICO",
        bg: "bg-coral/10",
        border: "border-coral/20",
      };
    }

    if (qtd <= 14) {
      return {
        color: "text-amber-400 font-semibold",
        icon: AlertTriangle,
        label: "BAIXO",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
      };
    }

    return {
      color: "text-emerald-400 font-bold",
      icon: CheckCircle2,
      label: "OK",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
    };
  };

  const estoqueStatus = getEstoqueStyle();

  /* ==========================================================
     RECEITA
     ========================================================== */

  const getReceitaBadgeStyle = () => {
    const tipo = med.tipo_receita || "comum";

    if (tipo === "amarela") {
      return "border-amber-400/50 bg-amber-400/10 text-amber-300";
    }

    if (tipo === "azul") {
      return "border-blue-400/50 bg-blue-400/10 text-blue-300";
    }

    if (tipo === "branca") {
      return "border-zinc-300/50 bg-zinc-300/10 text-zinc-200";
    }

    return "border-ice/30 bg-ice/5 text-ice";
  };

  const tipoReceitaLabel =
    TIPO_RECEITA_LABELS[
      med.tipo_receita as keyof typeof TIPO_RECEITA_LABELS
    ] ||
    med.tipo_receita ||
    "comum";

  /* ==========================================================
     MENU
     ========================================================== */

  const menuOptions = [
    {
      id: "nova-renovacao",
      label: "Nova Renovação",
      icon: FileWarning,
      path: `/saude/renovacao/nova?medicamento_id=${id}`,
    },
    {
      id: "duplicar-medicamento",
      label: "Duplicar Medicamento",
      icon: Copy,
      path: `/saude/medicamentos/novo?duplicar=${id}`,
    },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");

    setIsMenuFlutuanteOpen(false);

    router.push(path);
  };

  /* ==========================================================
     EXCLUSÃO
     ========================================================== */

  const handleDelete = async () => {
    if (!med?.id) return;

    setIsDeleting(true);

    setToastMessage({
      text: "Excluindo medicamento...",
      type: "loading",
    });

    try {
      await deleteMedicamento(med.id);

      trigger("success");

      setToastMessage({
        text: "Excluído com sucesso!",
        type: "success",
      });

      setTimeout(() => {
        router.replace("/saude/medicamentos");
      }, 400);
    } catch (error) {
      console.error(
        "Erro ao excluir medicamento:",
        error
      );

      trigger("error");

      setToastMessage({
        text: "Erro ao excluir medicamento.",
        type: "error",
      });

      setTimeout(
        () => setToastMessage(null),
        3000
      );

      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ==========================================================
     AÇÕES
     ========================================================== */

  const abrirNoMapa = (enderecoStr?: string) => {
    if (!enderecoStr) return;

    trigger("vibrate");

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        enderecoStr
      )}`,
      "_blank"
    );
  };

  const abrirAnexo = () => {
    if (documento?.attachments?.[0]?.url) {
      trigger("vibrate");

      window.open(
        documento.attachments[0].url,
        "_blank"
      );
    }
  };

  const compartilharWhatsApp = () => {
    trigger("vibrate");

    const texto = `*${med.nome}*\nDosagem: ${med.dosagem}\nPróxima renovação: ${formatDate(
      med.proxima_renovacao
    )}\nEstoque Atual: ${qtd} doses`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  };

  const copiarInfo = () => {
    trigger("vibrate");

    const texto = `${med.nome}\nDosagem: ${med.dosagem}\nPróxima renovação: ${formatDate(
      med.proxima_renovacao
    )}\nEstoque: ${qtd} doses`;

    navigator.clipboard.writeText(texto);

    setToastMessage({
      text: "Informações copiadas!",
      type: "success",
    });

    setTimeout(
      () => setToastMessage(null),
      3000
    );
  };

  const ligarFarmacia = (telefone?: string) => {
    if (!telefone) return;

    trigger("vibrate");

    window.open(`tel:${telefone}`, "_blank");
  };

  /* ==========================================================
     FINANCEIRO
     ========================================================== */

  const custoTotalRenovacoes =
    renovacoes.reduce(
      (acc, r: Renovacao) => {
        const preco =
          typeof r.preco === "number"
            ? r.preco
            : Number(r.preco) || 0;

        return acc + preco;
      },
      0
    );

  const custoTotalAcumulado =
    custoTotalRenovacoes +
    Number(med.preco || 0);

  const qtdeCompras =
    renovacoes.length +
    (med.preco ? 1 : 0);

  const precoMedio =
    qtdeCompras > 0
      ? custoTotalAcumulado / qtdeCompras
      : 0;

  const ultimaRenovacao =
    renovacoes.length > 0
      ? renovacoes[0]
      : null;

  const isUltimaRenovacaoGratuita =
    ultimaRenovacao?.tipo_aquisicao ===
    "gratuito";

  /* ==========================================================
     OUTROS MEDICAMENTOS DO MÉDICO
     ========================================================== */

  const outrosMedsDesteMedico =
    todosMedicamentosAtivos.filter(
      (m: Medicamento) =>
        m.medico_id === med.medico_id &&
        m.id !== med.id
    );

  const displayedRenovacoes =
    showAllRenovacoes
      ? renovacoes
      : renovacoes.slice(0, 3);

  /* ==========================================================
     FORMATO / IDENTIDADE
     ========================================================== */

  const formatoBanco =
    med.formato?.toLowerCase().trim() ||
    "comprimido";

  const itemFormato =
    FORMATOS.find(
      (formato) =>
        formato.id === formatoBanco
    ) || FORMATOS[0];

  const SelectedFormatIcon =
    itemFormato.icon;

  const color1 =
    med.cores && med.cores.length > 0
      ? med.cores[0]
      : "#60A5FA";

  const color2 =
    med.cores && med.cores.length > 1
      ? med.cores[1]
      : undefined;

  const personAccent = activePersonId
    ? "var(--person-accent, #38BDF8)"
    : "#38BDF8";

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ====================================================
            TOAST
        ==================================================== */}

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{
                opacity: 0,
                y: 50,
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.9,
              }}
              className="
                fixed bottom-24 left-5 right-5 z-[70]
                mx-auto flex max-w-md items-center gap-3
                rounded-2xl border border-ice/30
                bg-surface p-4
                shadow-vault backdrop-blur-xl
              "
            >
              <div
                className={`
                  flex h-10 w-10 shrink-0 items-center
                  justify-center rounded-xl
                  ${
                    toastMessage.type === "error"
                      ? "bg-coral/10 text-coral"
                      : "bg-ice/15 text-ice"
                  }
                `}
              >
                {toastMessage.type === "success" && (
                  <Check size={20} />
                )}

                {toastMessage.type === "loading" && (
                  <Activity
                    size={20}
                    className="animate-pulse"
                  />
                )}

                {toastMessage.type === "error" && (
                  <AlertTriangle size={20} />
                )}
              </div>

              <p className="text-sm font-semibold text-ink-primary">
                {toastMessage.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header
          className="
            sticky top-0 z-30
            border-b border-surface-border/30
            bg-void/85
            px-5 pb-3 pt-4
            backdrop-blur-xl
          "
        >
          <div className="flex items-center justify-between gap-2">
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

            <div className="min-w-0 flex-1 px-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-ice/80">
                Medicamento
              </p>

              <h1 className="truncate text-base font-semibold text-ink-primary">
                Detalhes
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={copiarInfo}
                aria-label="Copiar informações"
                className="
                  flex h-10 w-10 items-center
                  justify-center rounded-full
                  border border-surface-border
                  bg-surface-raised
                  text-ink-muted
                  transition-all
                  hover:text-ice
                  active:scale-95
                "
              >
                <Copy size={17} />
              </button>

              <button
                type="button"
                onClick={compartilharWhatsApp}
                aria-label="Compartilhar no WhatsApp"
                className="
                  flex h-10 w-10 items-center
                  justify-center rounded-full
                  border border-emerald-400/20
                  bg-emerald-400/10
                  text-emerald-400
                  transition-all
                  active:scale-95
                "
              >
                <Share2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setIsMenuFlutuanteOpen(
                    (previous) => !previous
                  );
                }}
                aria-label="Mais ações"
                className="
                  flex h-10 w-10 items-center
                  justify-center rounded-full
                  border border-ice/20
                  bg-ice/10
                  text-ice
                  transition-all
                  active:scale-95
                "
              >
                <Plus size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");

                  router.push(
                    `/saude/medicamentos/editar?id=${id}`
                  );
                }}
                aria-label="Editar medicamento"
                className="
                  hidden h-10 w-10 items-center
                  justify-center rounded-full
                  border border-surface-border
                  bg-surface-raised
                  text-ice
                  transition-all
                  active:scale-95
                  sm:flex
                "
              >
                <Edit3 size={17} />
              </button>
            </div>
          </div>

          {/* MENU DE AÇÕES */}

          <AnimatePresence>
            {isMenuFlutuanteOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Fechar menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() =>
                    setIsMenuFlutuanteOpen(false)
                  }
                  className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-sm"
                />

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
                  className="
                    absolute right-5 top-[68px] z-50
                    w-60 overflow-hidden
                    rounded-[24px]
                    border border-surface-border/60
                    bg-surface p-1.5
                    shadow-2xl
                  "
                >
                  <div className="px-3 pb-2 pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                      Ações
                    </p>
                  </div>

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
                        className="
                          flex w-full items-center gap-3
                          rounded-2xl px-3 py-2.5
                          text-left
                          transition-colors
                          hover:bg-surface-raised
                          active:scale-[0.98]
                        "
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Icon size={16} />
                        </div>

                        <span className="text-sm font-medium text-ink-primary">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuFlutuanteOpen(false);

                      router.push(
                        `/saude/medicamentos/editar?id=${id}`
                      );
                    }}
                    className="
                      flex w-full items-center gap-3
                      rounded-2xl px-3 py-2.5
                      text-left
                      transition-colors
                      hover:bg-surface-raised
                      active:scale-[0.98]
                      sm:hidden
                    "
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <Edit3 size={16} />
                    </div>

                    <span className="text-sm font-medium text-ink-primary">
                      Editar Medicamento
                    </span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>

        <div className="mx-auto max-w-3xl space-y-6 px-5 pt-5">
          {/* ==================================================
              ALERTA DE RENOVAÇÃO
          ================================================== */}

          <AnimatePresence>
            {alertaInteligente.deveRenovar &&
              med.status !== "descontinuado" && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                  }}
                  className={`
                    rounded-[24px] border p-4
                    ${
                      alertaInteligente.urgencia ===
                      "alta"
                        ? "border-coral/30 bg-coral/10"
                        : "border-amber-400/30 bg-amber-400/10"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-xl
                        ${
                          alertaInteligente.urgencia ===
                          "alta"
                            ? "bg-coral/10 text-coral"
                            : "bg-amber-400/10 text-amber-400"
                        }
                      `}
                    >
                      <AlertTriangle size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={`
                            text-sm font-bold
                            ${
                              alertaInteligente.urgencia ===
                              "alta"
                                ? "text-coral"
                                : "text-amber-400"
                            }
                          `}
                        >
                          Ação necessária
                        </p>

                        {diasRestantes !== null &&
                          diasRestantes > 0 &&
                          diasRestantes <= 30 && (
                            <span
                              className={`
                                rounded-lg px-2 py-1
                                text-[9px] font-bold uppercase
                                ${
                                  alertaInteligente.urgencia ===
                                  "alta"
                                    ? "bg-coral/10 text-coral"
                                    : "bg-amber-400/10 text-amber-400"
                                }
                              `}
                            >
                              {diasRestantes} dias
                            </span>
                          )}
                      </div>

                      <p
                        className={`
                          mt-1 text-xs leading-relaxed
                          ${
                            alertaInteligente.urgencia ===
                            "alta"
                              ? "text-coral/80"
                              : "text-amber-400/80"
                          }
                        `}
                      >
                        {alertaInteligente.mensagem}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/saude/renovacao/nova?medicamento_id=${id}`
                          )
                        }
                        className={`
                          mt-3 rounded-xl px-3 py-2
                          text-xs font-bold
                          transition-transform
                          active:scale-95
                          ${
                            alertaInteligente.urgencia ===
                            "alta"
                              ? "bg-coral text-void"
                              : "bg-amber-400 text-void"
                          }
                        `}
                      >
                        Resolver agora
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {/* ==================================================
              ALERTA DE COMPORTAMENTO
          ================================================== */}

          {comportamento && (
            <motion.div
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`
                rounded-[24px] border p-4
                ${
                  comportamento.tipo ===
                  "alerta_adesao"
                    ? "border-amber-400/30 bg-amber-400/10"
                    : "border-violet-400/30 bg-violet-400/10"
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                    flex h-10 w-10 shrink-0
                    items-center justify-center
                    rounded-xl
                    ${
                      comportamento.tipo ===
                      "alerta_adesao"
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-violet-400/10 text-violet-400"
                    }
                  `}
                >
                  <Activity size={18} />
                </div>

                <div>
                  <p
                    className={`
                      text-sm font-bold
                      ${
                        comportamento.tipo ===
                        "alerta_adesao"
                          ? "text-amber-400"
                          : "text-violet-400"
                      }
                    `}
                  >
                    {comportamento.titulo}
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {comportamento.mensagem}
                  </p>

                  <p className="mt-1 text-[10px] text-ink-faint">
                    Sugestão:{" "}
                    {comportamento.acaoSugerida}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              HERO
          ================================================== */}

          <section
            className="
              relative overflow-hidden
              rounded-[30px]
              border border-surface-border/70
              bg-surface
              shadow-lg
            "
          >
            <div
              className="absolute bottom-0 left-0 top-0 w-1.5"
              style={{
                backgroundColor:
                  med.status === "descontinuado"
                    ? "#fb7185"
                    : med.tipo_receita === "amarela"
                    ? "#fbbf24"
                    : med.tipo_receita === "azul"
                    ? "#60a5fa"
                    : personAccent,
              }}
            />

            <div className="p-5 pl-6 sm:p-6 sm:pl-7">
              <div className="flex items-start gap-4">
                <ListIcon
                  color={color1}
                  color2={color2}
                  isGradient={Boolean(color2)}
                  size={32}
                  icon={
                    <SelectedFormatIcon
                      size={30}
                      stroke={color1}
                      strokeWidth={2}
                      fill={`${color1}44`}
                    />
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-xl font-bold uppercase tracking-wide text-ink-primary sm:text-2xl">
                      {med.nome}
                    </h2>

                    {med.status ===
                      "descontinuado" && (
                      <span className="rounded-full border border-coral/20 bg-coral/10 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">
                        Suspenso
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-ink-muted">
                    {med.dosagem}
                    {med.tipo_uso ===
                      "esporadico" && (
                      <span> • Uso SOS</span>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tratamentos.map(
                      (tratamento: Tratamento) => (
                        <span
                          key={tratamento.id}
                          className="
                            rounded-full
                            border border-surface-border
                            bg-surface-raised
                            px-2 py-1
                            text-[9px] font-bold
                            uppercase tracking-wide
                            text-ink-muted
                          "
                        >
                          {tratamento.nome}
                        </span>
                      )
                    )}
                  </div>

                  {cids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cids.map((cid: Cid) => {
                        const theme =
                          getClinicalTheme(
                            cid.descricao ||
                              cid.codigo
                          );

                        const Icon = theme.icon;

                        return (
                          <span
                            key={cid.id}
                            className={`
                              inline-flex items-center gap-1
                              rounded-full border
                              px-2 py-1
                              text-[9px] font-bold
                              uppercase tracking-wide
                              ${theme.tagClass}
                            `}
                          >
                            <Icon size={10} />
                            {cid.codigo}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              ESTOQUE
          ================================================== */}

          {med.status !== "descontinuado" &&
            typeof med.estoque_quantidade ===
              "number" && (
              <section
                className={`
                  overflow-hidden rounded-[28px]
                  border ${estoqueStatus.border}
                  ${estoqueStatus.bg}
                  p-1
                `}
              >
                <div className="rounded-[24px] bg-surface p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                        <Package size={14} />
                        Estoque Atual
                      </p>

                      <div className="mt-1 flex items-baseline gap-2">
                        <p
                          className={`text-3xl font-display font-bold ${estoqueStatus.color}`}
                        >
                          {qtd}
                        </p>

                        <span className="text-sm font-medium uppercase text-ink-muted">
                          {med.estoque_unidade_medida ||
                            "doses"}
                        </span>

                        <span
                          className={`
                            ml-1 rounded-lg px-2 py-1
                            text-[9px] font-bold uppercase
                            ${estoqueStatus.bg}
                            ${estoqueStatus.color}
                          `}
                        >
                          {estoqueStatus.label}
                        </span>
                      </div>

                      {ultimaDose && (
                        <div
                          className="
                            mt-2 inline-flex items-center
                            gap-1.5 rounded-lg
                            border border-surface-border/50
                            bg-surface-raised
                            px-2 py-1
                            text-[10px] font-medium
                            text-ink-muted
                          "
                        >
                          <Clock
                            size={10}
                            className="text-ice"
                          />

                          Última dose:{" "}
                          {formatDate(
                            ultimaDose.data
                          )}{" "}
                          às {ultimaDose.horario}
                        </div>
                      )}
                    </div>

                    {qtd > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setIsQuickDoseOpen(true)
                        }
                        className="
                          flex items-center
                          justify-center gap-2
                          rounded-2xl
                          bg-emerald-500
                          px-5 py-3.5
                          font-bold text-void
                          shadow-lg
                          shadow-emerald-500/20
                          transition-all
                          active:scale-95
                        "
                      >
                        <Zap
                          size={18}
                          fill="currentColor"
                        />
                        Tomar 1 Dose
                      </button>
                    )}
                  </div>

                  <div
                    className="
                      mt-4 flex flex-col gap-1.5
                      border-t border-surface-border/50
                      pt-4 text-[10px] text-ink-muted
                      sm:flex-row sm:items-center
                      sm:justify-between
                    "
                  >
                    <span>
                      Dosagem:{" "}
                      <b className="text-ink-primary">
                        {med.estoque_unidade_por_dose ||
                          1}{" "}
                        {med.estoque_unidade_medida ||
                          "unidade(s)"}
                      </b>
                    </span>

                    <span>
                      Última contagem:{" "}
                      <b className="text-ink-primary">
                        {formatDate(
                          med.estoque_data_referencia
                        )}
                      </b>
                    </span>
                  </div>
                </div>
              </section>
            )}

          {/* ==================================================
              MELHOR FARMÁCIA
          ================================================== */}

          {melhorFarmacia && (
            <div
              className="
                flex items-center gap-2.5
                rounded-2xl
                border border-emerald-400/20
                bg-emerald-400/10
                px-4 py-3
              "
            >
              <Award
                size={16}
                className="shrink-0 text-emerald-400"
              />

              <p className="text-xs text-ink-primary">
                Melhor preço médio:{" "}
                <span className="font-bold text-emerald-400">
                  R${" "}
                  {melhorFarmacia.media_preco.toFixed(
                    2
                  )}
                </span>

                {melhorFarmacia.total_compras >
                  0 && (
                  <span className="text-ink-muted">
                    {" "}
                    (
                    {
                      melhorFarmacia.total_compras
                    }{" "}
                    compra
                    {melhorFarmacia.total_compras >
                    1
                      ? "s"
                      : ""}
                    )
                  </span>
                )}
              </p>
            </div>
          )}

          {/* ==================================================
              EVOLUÇÃO CLÍNICA
          ================================================== */}

          {med.historico_dosagens &&
            med.historico_dosagens.length > 0 && (
              <section className="space-y-3">
                <SectionTitle
                  icon={<TrendingUp size={15} />}
                  title="Evolução Clínica"
                />

                <div className="rounded-[26px] border border-surface-border/60 bg-surface p-5">
                  <div className="relative ml-3 space-y-6 border-l-2 border-surface-border pb-1">
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ice bg-surface">
                        <div className="h-1.5 w-1.5 rounded-full bg-ice" />
                      </div>

                      <p className="text-sm font-bold text-ice">
                        {med.dosagem}

                        <span className="ml-1.5 text-[9px] font-normal uppercase text-ink-muted">
                          Atual
                        </span>
                      </p>

                      <p className="mt-0.5 text-xs text-ink-muted">
                        Dosagem atual
                      </p>
                    </div>

                    {[...med.historico_dosagens]
                      .reverse()
                      .map(
                        (
                          hist: HistDosagem,
                          index: number
                        ) => (
                          <div
                            key={index}
                            className="relative pl-6 opacity-70"
                          >
                            <div className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface-border bg-surface">
                              <div className="h-1.5 w-1.5 rounded-full bg-surface-border" />
                            </div>

                            <p className="text-sm font-semibold text-ink-primary">
                              {hist.dosagem_antiga}
                            </p>

                            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                              Alterado em{" "}
                              {formatDate(
                                hist.data_mudanca
                              )}{" "}
                              por{" "}
                              {
                                hist.medico_responsavel
                              }
                            </p>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </section>
            )}

          {/* ==================================================
              FINANCEIRO
          ================================================== */}

          {custoTotalAcumulado > 0 && (
            <section className="space-y-3">
              <SectionTitle
                icon={<LineChart size={15} />}
                title="Investimento"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<LineChart size={14} />}
                  label="Custo acumulado"
                  value={`R$ ${custoTotalAcumulado.toFixed(
                    2
                  )}`}
                  description="Total investido no histórico"
                />

                <StatCard
                  icon={<DollarSign size={14} />}
                  label="Preço médio"
                  value={`R$ ${precoMedio.toFixed(
                    2
                  )}`}
                  description={`Por compra (${qtdeCompras})`}
                />
              </div>
            </section>
          )}

          {/* ==================================================
              REDE DE PRESCRIÇÃO
          ================================================== */}

          <section className="space-y-3">
            <SectionTitle
              icon={<Stethoscope size={15} />}
              title="Prescrição & Aquisição"
            />

            <div className="space-y-2">
              <DetailInfoRow
                icon={<Stethoscope size={19} />}
                iconClassName="bg-ice/10 text-ice"
                label="Médico Responsável"
              >
                <p className="truncate text-sm font-bold text-ink-primary">
                  {medico?.nome ||
                    med.medico ||
                    "Não informado"}
                </p>

                {outrosMedsDesteMedico.length >
                  0 && (
                  <span className="mt-1 inline-block rounded-md bg-ice/10 px-2 py-0.5 text-[9px] font-medium text-ice">
                    Prescreve{" "}
                    {
                      outrosMedsDesteMedico.length
                    }{" "}
                    outros medicamentos seus
                  </span>
                )}
              </DetailInfoRow>

              {(hospital || local) && (
                <DetailInfoRow
                  icon={<Building2 size={19} />}
                  iconClassName="bg-violet-400/10 text-violet-400"
                  label="Unidade / Hospital Emissor"
                  action={
                    hospital?.endereco ||
                    local?.endereco ? (
                      <button
                        type="button"
                        onClick={() =>
                          abrirNoMapa(
                            hospital?.endereco ||
                              local?.endereco
                          )
                        }
                        aria-label="Abrir no mapa"
                        className="
                          flex h-10 w-10
                          items-center justify-center
                          rounded-xl
                          bg-violet-400/10
                          text-violet-400
                          transition-all
                          active:scale-95
                        "
                      >
                        <MapPin size={17} />
                      </button>
                    ) : undefined
                  }
                >
                  <p className="truncate text-sm font-bold text-ink-primary">
                    {hospital?.nome ||
                      local?.nome ||
                      "Não informado"}
                  </p>

                  {(hospital?.endereco ||
                    local?.endereco) && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {hospital?.endereco ||
                        local?.endereco}
                    </p>
                  )}
                </DetailInfoRow>
              )}

              {(farmacia || med.farmacia) && (
                <DetailInfoRow
                  icon={<Store size={19} />}
                  iconClassName="bg-emerald-400/10 text-emerald-400"
                  label="Última Aquisição"
                  action={
                    <>
                      {farmacia?.telefone && (
                        <button
                          type="button"
                          onClick={() =>
                            ligarFarmacia(
                              farmacia.telefone
                            )
                          }
                          aria-label="Ligar para farmácia"
                          className="
                            flex h-10 w-10
                            items-center justify-center
                            rounded-xl
                            bg-emerald-400/10
                            text-emerald-400
                            transition-all
                            active:scale-95
                          "
                        >
                          <Phone size={17} />
                        </button>
                      )}

                      {farmacia?.endereco && (
                        <button
                          type="button"
                          onClick={() =>
                            abrirNoMapa(
                              farmacia.endereco
                            )
                          }
                          aria-label="Abrir no mapa"
                          className="
                            flex h-10 w-10
                            items-center justify-center
                            rounded-xl
                            bg-emerald-400/10
                            text-emerald-400
                            transition-all
                            active:scale-95
                          "
                        >
                          <MapPin size={17} />
                        </button>
                      )}
                    </>
                  }
                >
                  <p className="truncate text-sm font-bold text-ink-primary">
                    {farmacia?.nome ||
                      med.farmacia}
                  </p>

                  {farmacia?.endereco && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {farmacia.endereco}
                    </p>
                  )}
                </DetailInfoRow>
              )}

              {ultimaRenovacao &&
                isUltimaRenovacaoGratuita && (
                  <div className="flex items-start gap-3 rounded-[22px] border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <Gift
                      size={17}
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />

                    <div className="text-xs">
                      <p className="font-semibold text-emerald-400">
                        Última renovação gratuita
                      </p>

                      {ultimaRenovacao.data_proxima_retirada && (
                        <p className="mt-1 text-ink-muted">
                          Próxima retirada:{" "}
                          {formatDate(
                            ultimaRenovacao.data_proxima_retirada
                          )}
                        </p>
                      )}

                      {ultimaRenovacao.exige_nova_receita && (
                        <p className="mt-1 flex items-center gap-1 text-amber-400">
                          <AlertCircle size={12} />
                          Levar nova receita na próxima retirada
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* ==================================================
              RECEITA
          ================================================== */}

          <section className="space-y-3">
            <SectionTitle
              icon={<FileText size={15} />}
              title="Status da Receita"
              action={
                <button
                  type="button"
                  onClick={() => {
                    trigger("vibrate");
                    setInfoModalOpen(true);
                  }}
                  className="
                    flex items-center gap-1
                    rounded-full
                    bg-surface-raised
                    px-2.5 py-1
                    text-[9px] font-bold
                    uppercase
                    text-ink-muted
                  "
                >
                  <Info size={11} />
                  Regras
                </button>
              }
            />

            <div
              className={`
                rounded-[24px]
                border p-4
                ${getReceitaBadgeStyle()}
              `}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em]">
                  <FileText size={14} />
                  {tipoReceitaLabel}
                </span>

                {isVencida ? (
                  <span className="rounded-full bg-coral px-2 py-1 text-[9px] font-bold uppercase text-void">
                    Vencida
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold uppercase text-void">
                    No prazo
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-current/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase opacity-70">
                    Válida até
                  </p>

                  <p className="mt-0.5 text-sm font-bold">
                    {formatDate(
                      med.proxima_renovacao
                    )}
                  </p>
                </div>

                {documento?.attachments &&
                documento.attachments.length >
                  0 ? (
                  <button
                    type="button"
                    onClick={abrirAnexo}
                    className="
                      flex items-center
                      justify-center gap-1.5
                      rounded-xl
                      bg-current/10
                      px-3 py-2
                      text-xs font-bold
                      transition-colors
                      hover:bg-current/20
                    "
                  >
                    <ExternalLink size={14} />
                    Ver Anexo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/saude/medicamentos/editar?id=${id}`
                      )
                    }
                    className="
                      flex items-center
                      justify-center gap-1.5
                      rounded-xl
                      bg-current/10
                      px-3 py-2
                      text-xs font-bold
                      transition-colors
                      hover:bg-current/20
                    "
                  >
                    <Plus size={14} />
                    Vincular receita
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ==================================================
              HISTÓRICO DE RENOVAÇÕES
          ================================================== */}

          {renovacoes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                    Histórico
                  </p>

                  <h2 className="mt-0.5 text-sm font-semibold text-ink-primary">
                    Compras & Renovações
                  </h2>
                </div>

                {renovacoes.length > 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllRenovacoes(
                        (previous) => !previous
                      )
                    }
                    className="
                      flex items-center gap-1
                      rounded-lg
                      bg-ice/10
                      px-2.5 py-1.5
                      text-[9px] font-bold
                      text-ice
                    "
                  >
                    {showAllRenovacoes ? (
                      <>
                        <ChevronUp size={12} />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} />
                        Ver todas ({renovacoes.length})
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {displayedRenovacoes.map(
                    (
                      r: Renovacao,
                      index: number
                    ) => {
                      const farmaciaNome =
                        r.farmacia_id
                          ? farmaciasMap.get(
                              r.farmacia_id
                            )
                          : null;

                      const isGratuita =
                        r.tipo_aquisicao ===
                        "gratuito";

                      return (
                        <motion.article
                          key={r.id || index}
                          initial={{
                            opacity: 0,
                            height: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                          }}
                          className={`
                            rounded-[22px]
                            border bg-surface
                            p-3.5
                            ${
                              isGratuita
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-surface-border"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted">
                                <Calendar size={14} />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-bold text-ink-primary">
                                  {formatDate(
                                    r.data ||
                                      r.created_at
                                  )}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {farmaciaNome && (
                                    <span className="max-w-[180px] truncate text-[10px] text-ink-muted">
                                      {farmaciaNome}
                                    </span>
                                  )}

                                  {isGratuita ? (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-400">
                                      <Gift size={9} />
                                      Gratuito
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-ice/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-ice">
                                      <DollarSign size={9} />
                                      Comprado
                                    </span>
                                  )}

                                  {isGratuita &&
                                    r.exige_nova_receita && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                        <AlertCircle size={9} />
                                        Nova Receita
                                      </span>
                                    )}

                                  {isGratuita &&
                                    r.data_proxima_retirada && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-ice/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-ice">
                                        <Calendar size={9} />
                                        Retirada:{" "}
                                        {formatDate(
                                          r.data_proxima_retirada
                                        )}
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>

                            <p className="shrink-0 rounded-lg bg-emerald-400/10 px-2 py-1 font-mono text-xs font-bold text-emerald-400">
                              {isGratuita
                                ? "R$ 0,00"
                                : `R$ ${Number(
                                    r.preco || 0
                                  ).toFixed(2)}`}
                            </p>
                          </div>
                        </motion.article>
                      );
                    }
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>

        {/* ====================================================
            QUICK DOSE
        ==================================================== */}

        <QuickDoseModal
          isOpen={isQuickDoseOpen}
          onClose={() =>
            setIsQuickDoseOpen(false)
          }
          preselectedMedicamentoId={
            id || undefined
          }
          onSuccess={() => {
            if (
              typeof window !== "undefined"
            ) {
              window.dispatchEvent(
                new Event("sync:process")
              );
            }
          }}
        />

        {/* ====================================================
            MODAL DE REGRAS DA RECEITA
        ==================================================== */}

        <BottomSheet
          isOpen={infoModalOpen}
          onClose={() =>
            setInfoModalOpen(false)
          }
          title="Regulamentação da Receita"
        >
          <div className="space-y-4 p-5 text-sm text-ink-muted">
            <div className="space-y-2 rounded-2xl border border-surface-border bg-surface p-4">
              <p className="text-base font-semibold text-ink-primary">
                Controle: {tipoReceitaLabel}
              </p>

              <p className="leading-relaxed">
                O prazo de validade legal para
                preenchimento e compra desta
                prescrição é de até{" "}
                <b className="text-ink-primary">
                  {
                    VALIDADE_RECEITA_DIAS[
                      (med.tipo_receita as keyof typeof VALIDADE_RECEITA_DIAS) ||
                        "comum"
                    ]
                  }{" "}
                  dias
                </b>{" "}
                contados a partir da data de
                emissão.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setInfoModalOpen(false);

                router.push(
                  `/saude/renovacao/nova?medicamento_id=${id}`
                );
              }}
              className="
                flex w-full items-center
                justify-center gap-2
                rounded-2xl
                bg-ice
                py-3.5
                font-bold text-void
                shadow-lg shadow-ice/20
                transition-transform
                active:scale-95
              "
            >
              <Calendar size={18} />
              Registrar Nova Renovação
            </button>
          </div>
        </BottomSheet>

        {/* ====================================================
            CONFIRMAÇÃO DE EXCLUSÃO
        ==================================================== */}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() =>
            setShowDeleteModal(false)
          }
          onConfirm={handleDelete}
          title="Excluir medicamento"
          message={`Tem certeza que deseja excluir "${med.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={isDeleting}
          type="danger"
        />

        {/* ====================================================
            BOTÃO FLUTUANTE DE EXCLUSÃO
        ==================================================== */}

        <button
          type="button"
          onClick={() => {
            trigger("vibrate");
            setShowDeleteModal(true);
          }}
          aria-label="Excluir medicamento"
          className="
            fixed bottom-5 right-5 z-20
            flex h-12 w-12
            items-center justify-center
            rounded-2xl
            border border-coral/20
            bg-coral/10
            text-coral
            shadow-lg
            backdrop-blur-xl
            transition-all
            active:scale-95
            sm:right-8
          "
        >
          <Trash2 size={18} />
        </button>
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function DetalhesPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MedicamentoDetalhesContent />
    </Suspense>
  );
}