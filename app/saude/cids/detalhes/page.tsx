"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit3,
  FolderHeart,
  Pill,
  Stethoscope,
  FileText,
  Sparkles,
  ChevronRight,
  Trash2,
  Building2,
  MapPin,
  Plus,
  DollarSign,
} from "lucide-react";

import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/ToastProvider";

import type {
  Cid,
  Tratamento,
  Medicamento,
  Medico,
  Hospital,
  Farmacia,
  LocalSaude,
  Document,
  Renovacao,
} from "@/lib/types";

import { getCidInsights } from "@/lib/health-insights";
import {
  getClinicalTheme,
  formatCurrency,
} from "@/lib/health-utils";
import { useMounted } from "@/hooks/useMounted";
import { cidsRepository } from "@/lib/repositories/cids";

import {
  SectionTitle,
} from "@/components/detail/DetailComponents";

/* ============================================================
   TIPOS AUXILIARES
   ============================================================ */

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

/* ============================================================
   HELPERS
   ============================================================ */

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

function getDocumentMetadata(document: Document): DocumentMetadata {
  if (!document.metadata || typeof document.metadata !== "object") {
    return {};
  }

  return document.metadata as DocumentMetadata;
}

function hasId(value: string | undefined | null): value is string {
  return Boolean(value);
}

/* ============================================================
   CARREGAMENTO DOS DADOS
   ============================================================ */

async function loadCidDetails(
  id: string,
): Promise<CidDetailsData | null> {
  const [
    cidData,
    tratamentosData,
    medicamentosData,
    renovacoesData,
    medicosData,
    hospitaisData,
    locaisData,
    farmaciasData,
    documentosData,
  ] = await Promise.all([
    db.cids.get(id),
    db.tratamentos.toArray(),
    db.medicamentos.toArray(),
    db.renovacoes.toArray(),
    db.medicos.toArray(),
    db.hospitais.toArray(),
    db.locais.toArray(),
    db.farmacias.toArray(),
    db.documents.toArray(),
  ]);

  if (!cidData) {
    return null;
  }

  /* ----------------------------------------------------------
     TRATAMENTOS VINCULADOS AO CID
     ---------------------------------------------------------- */

  const tratamentos = tratamentosData.filter((tratamento) =>
    tratamento.cid_ids?.includes(id),
  );

  const tratamentoIds = new Set(
    tratamentos
      .map((tratamento) => tratamento.id)
      .filter(hasId),
  );

  /* ----------------------------------------------------------
     MEDICAMENTOS VINCULADOS AOS TRATAMENTOS
     ---------------------------------------------------------- */

  const medicamentos = medicamentosData.filter((medicamento) => {
    if (!medicamento.tratamento_ids?.length) {
      return false;
    }

    return medicamento.tratamento_ids.some((tratamentoId) =>
      tratamentoIds.has(tratamentoId),
    );
  });

  const medicamentoIds = new Set(
    medicamentos
      .map((medicamento) => medicamento.id)
      .filter(hasId),
  );

  /* ----------------------------------------------------------
     CUSTO DOS MEDICAMENTOS

     Soma todas as renovações dos medicamentos relacionados
     a este diagnóstico.
     ---------------------------------------------------------- */

  const renovacoesDoCid = renovacoesData.filter(
    (renovacao: Renovacao) =>
      hasId(renovacao.medicamento_id) &&
      medicamentoIds.has(renovacao.medicamento_id),
  );

  const custoTotal = renovacoesDoCid.reduce((total, renovacao) => {
    if (
      typeof renovacao.preco === "number" &&
      renovacao.preco > 0
    ) {
      return total + renovacao.preco;
    }

    return total;
  }, 0);

  /* ----------------------------------------------------------
     MÉDICOS ASSOCIADOS

     Os médicos são obtidos a partir dos medicamentos vinculados.
     ---------------------------------------------------------- */

  const medicoIds = new Set(
    medicamentos
      .map((medicamento) => medicamento.medico_id)
      .filter(hasId),
  );

  const medicos = medicosData.filter(
    (medico) =>
      hasId(medico.id) &&
      medicoIds.has(medico.id),
  );

  /* ----------------------------------------------------------
     HOSPITAIS ASSOCIADOS
     ---------------------------------------------------------- */

  const hospitalIds = new Set(
    medicamentos
      .map((medicamento) => medicamento.hospital_id)
      .filter(hasId),
  );

  const hospitais = hospitaisData.filter(
    (hospital) =>
      hasId(hospital.id) &&
      hospitalIds.has(hospital.id),
  );

  /* ----------------------------------------------------------
     LOCAIS DE SAÚDE ASSOCIADOS
     ---------------------------------------------------------- */

  const localIds = new Set(
    medicamentos
      .map((medicamento) => medicamento.local_id)
      .filter(hasId),
  );

  const locais = locaisData.filter(
    (local) =>
      hasId(local.id) &&
      localIds.has(local.id),
  );

  /* ----------------------------------------------------------
     FARMÁCIAS ASSOCIADAS
     ---------------------------------------------------------- */

  const farmaciaIds = new Set(
    medicamentos
      .map((medicamento) => medicamento.farmacia_id)
      .filter(hasId),
  );

  const farmacias = farmaciasData.filter(
    (farmacia) =>
      hasId(farmacia.id) &&
      farmaciaIds.has(farmacia.id),
  );

  /* ----------------------------------------------------------
     DOCUMENTOS / LAUDOS

     Um documento pode estar ligado diretamente ao CID ou
     indiretamente através de um tratamento.
     ---------------------------------------------------------- */

  const documentos = documentosData.filter((documento) => {
    const metadata = getDocumentMetadata(documento);

    if (metadata.cid_id === id) {
      return true;
    }

    if (
      metadata.tratamento_id &&
      tratamentoIds.has(metadata.tratamento_id)
    ) {
      return true;
    }

    return false;
  });

  return {
    cid: cidData,
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

/* ============================================================
   CONTEÚDO
   ============================================================ */

function CidDetalhesContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();

  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();

  const id = searchParams.get("id");

  const [cid, setCid] = useState<Cid | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [locais, setLocais] = useState<LocalSaude[]>([]);
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [documentos, setDocumentos] = useState<Document[]>([]);
  const [custoTotal, setCustoTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] =
    useState(false);

  /* ==========================================================
     CARREGAMENTO
     ========================================================== */

  useEffect(() => {
    if (!id) {
      router.replace("/saude/cids");
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        const data = await loadCidDetails(id);

        if (cancelled) {
          return;
        }

        if (!data) {
          router.replace("/saude/cids");
          return;
        }

        setCid(data.cid);
        setTratamentos(data.tratamentos);
        setMedicamentos(data.medicamentos);
        setMedicos(data.medicos);
        setHospitais(data.hospitais);
        setLocais(data.locais);
        setFarmacias(data.farmacias);
        setDocumentos(data.documentos);
        setCustoTotal(data.custoTotal);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Erro ao carregar detalhes do CID:",
            error,
          );

          showToast(
            "Não foi possível carregar os detalhes do diagnóstico.",
            "error",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [id, router, showToast]);

  /* ==========================================================
     DELETE
     ========================================================== */

  const handleDelete = async () => {
    trigger("vibrate");

    if (!id) {
      return;
    }

    try {
      await cidsRepository.delete(id);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sync:process"));
      }

      trigger("success");

      showToast("Diagnóstico removido com sucesso.");

      setTimeout(() => {
        router.replace("/saude/cids");
      }, 800);
    } catch (error) {
      console.error("Erro ao excluir CID:", error);

      trigger("error");

      showToast(
        "Erro ao excluir diagnóstico.",
        "error",
      );
    }
  };

  /* ==========================================================
     INSIGHT DO CID
     ========================================================== */

  const cidInsight = useMemo(() => {
    if (!cid?.codigo) {
      return null;
    }

    return getCidInsights(cid.codigo);
  }, [cid]);

  /* ==========================================================
     MENU DE ADIÇÃO
     ========================================================== */

  const menuOptions = useMemo(
    () => [
      {
        id: "novo-tratamento",
        label: "Novo Tratamento",
        icon: FolderHeart,
        path: `/saude/tratamentos/novo?cid_id=${id}`,
      },
      {
        id: "novo-medicamento",
        label: "Novo Medicamento",
        icon: Pill,
        path: `/saude/medicamentos/novo?cid_id=${id}`,
      },
      {
        id: "novo-laudo",
        label: "Anexar Laudo",
        icon: FileText,
        path: `/saude/documentos/novo?type=laudo&cid_id=${id}`,
      },
    ],
    [id],
  );

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");

    setIsMenuFlutuanteOpen(false);

    router.push(path);
  };

  /* ==========================================================
     MOUNT / LOADING
     ========================================================== */

  if (!mounted) {
    return <DetailSkeleton />;
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!cid) {
    return null;
  }

  /* ==========================================================
     TEMA CLÍNICO
     ========================================================== */

  const theme = getClinicalTheme(
    cid.descricao || cid.codigo,
  );

  const IconComp = theme.icon;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-6 backdrop-blur-xl header-safe-top">
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
              <p
                className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}
              >
                Diagnóstico CID-10
              </p>

              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes da Condição
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ==================================================
                MENU +
                ================================================== */}

            <div className="relative">
              <button
                onClick={() => {
                  trigger("vibrate");
                  setIsMenuFlutuanteOpen(
                    (current) => !current,
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                type="button"
                aria-label="Adicionar registro"
                aria-expanded={isMenuFlutuanteOpen}
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
                      transition={{ duration: 0.16 }}
                      onClick={() =>
                        setIsMenuFlutuanteOpen(false)
                      }
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      aria-hidden="true"
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
                                  option.path,
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

            {/* ==================================================
                EDITAR
                ================================================== */}

            <button
              onClick={() => {
                trigger("vibrate");
                router.push(
                  `/saude/cids/editar?id=${cid.id}`,
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              type="button"
              aria-label="Editar CID"
            >
              <Edit3 size={16} />
            </button>

            {/* ==================================================
                EXCLUIR
                ================================================== */}

            <button
              onClick={() => {
                trigger("vibrate");
                setShowDeleteModal(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              type="button"
              aria-label="Excluir CID"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          {/* ====================================================
              HERO
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className={`relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm ${theme.borderClass}`}
            style={{
              borderLeft: `6px solid ${theme.hex}`,
            }}
          >
            <div
              className={`pointer-events-none absolute -right-4 -top-4 opacity-5 ${theme.textClass}`}
            >
              <IconComp size={140} />
            </div>

            <div className="relative z-10 flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}
              >
                <IconComp size={28} />
              </div>

              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${theme.tagClass}`}
                  >
                    {cid.codigo}
                  </span>
                </div>

                <h2 className="mt-1.5 font-display text-xl font-bold leading-tight text-ink-primary">
                  {cid.descricao}
                </h2>
              </div>
            </div>

            {/* ==================================================
                INSIGHT
                ================================================== */}

            {cidInsight && (
              <div className="relative z-10 mt-5 space-y-2 rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-4">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold ${theme.textClass}`}
                >
                  <Sparkles size={14} />

                  <span>
                    Categoria: {cidInsight.categoria}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-ink-muted">
                  <strong>Alerta Clínico:</strong>{" "}
                  {cidInsight.alertaClinico}
                </p>

                {cidInsight.tratamentosSugeridos?.length >
                  0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cidInsight.tratamentosSugeridos.map(
                      (tratamento, index) => (
                        <span
                          key={`${tratamento}-${index}`}
                          className="rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] text-ink-muted"
                        >
                          • {tratamento}
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================
                RESUMO
                ================================================== */}

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-surface-border/50 pt-5 text-center">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">
                  Tratamentos
                </span>

                <span className="mt-0.5 font-mono text-xl font-semibold text-ink-primary">
                  {tratamentos.length}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">
                  Medicamentos
                </span>

                <span className="mt-0.5 font-mono text-xl font-semibold text-ink-primary">
                  {medicamentos.length}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">
                  Laudos
                </span>

                <span className="mt-0.5 font-mono text-xl font-semibold text-ink-primary">
                  {documentos.length}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ====================================================
              CUSTO
          ==================================================== */}

          {custoTotal > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.03 }}
              className="flex items-center justify-between rounded-2xl border border-surface-border/40 bg-surface-raised p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <DollarSign size={18} />
                </div>

                <div>
                  <p className="text-xs font-medium text-ink-primary">
                    Custo Estimado do Diagnóstico
                  </p>

                  <p className="text-[11px] text-ink-muted">
                    Soma de compras de medicamentos vinculados
                  </p>
                </div>
              </div>

              <p className="text-base font-bold text-emerald-400">
                {formatCurrency(custoTotal)}
              </p>
            </motion.div>
          )}

          {/* ====================================================
              TRATAMENTOS
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<FolderHeart size={15} />}
              title="Tratamentos Relacionados"
            />

            {tratamentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum tratamento vinculado a este
                  diagnóstico.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tratamentos.map((tratamento) => {
                  const tratamentoTheme =
                    getClinicalTheme(tratamento.nome);

                  const TratamentoIcon =
                    tratamentoTheme.icon;

                  return (
                    <button
                      key={tratamento.id}
                      onClick={() => {
                        trigger("vibrate");

                        router.push(
                          `/saude/tratamentos/detalhes?id=${tratamento.id}`,
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tratamentoTheme.bgClass} ${tratamentoTheme.textClass} ${tratamentoTheme.borderClass}`}
                        >
                          <TratamentoIcon size={18} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-ink-primary">
                            {tratamento.nome}
                          </p>

                          <p className="text-xs capitalize text-ink-muted">
                            {tratamento.status}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-ink-faint"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              MEDICAMENTOS
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Pill size={15} />}
              title="Medicamentos em Uso"
            />

            {medicamentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum medicamento associado a este CID.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentos.map((medicamento) => {
                  const medico = medicamento.medico_id
                    ? medicos.find(
                        (item) =>
                          item.id === medicamento.medico_id,
                      )
                    : undefined;

                  return (
                    <button
                      key={medicamento.id}
                      onClick={() => {
                        trigger("vibrate");

                        router.push(
                          `/saude/medicamentos/detalhes?id=${medicamento.id}`,
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Pill size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {medicamento.nome}
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
                        size={16}
                        className="ml-2 shrink-0 text-ink-faint"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              EQUIPE MÉDICA
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Stethoscope size={15} />}
              title="Equipe Médica Associada"
            />

            {medicos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum médico vinculado aos tratamentos
                  desta condição.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {medicos.map((medico) => (
                  <button
                    key={medico.id}
                    onClick={() => {
                      trigger("vibrate");

                      router.push(
                        `/saude/medicos/detalhes?id=${medico.id}`,
                      );
                    }}
                    className="rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-ink-primary shadow-sm transition-all hover:border-ice/30 active:scale-95"
                    type="button"
                  >
                    Dr(a). {medico.nome}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              LOCAIS E FARMÁCIAS
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Building2 size={15} />}
              title="Locais de Atendimento e Farmácias"
            />

            {hospitais.length === 0 &&
            locais.length === 0 &&
            farmacias.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum local ou farmácia associado a este
                  CID.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* ==================================================
                    HOSPITAIS
                    ================================================== */}

                {hospitais.map((hospital) => (
                  <div
                    key={`hospital-${hospital.id}`}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                        <Building2 size={16} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-ink-primary">
                          {hospital.nome}
                        </p>

                        {hospital.endereco && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                            <MapPin size={10} />
                            {hospital.endereco}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* ==================================================
                    LOCAIS DE SAÚDE
                    ================================================== */}

                {locais.map((local) => (
                  <div
                    key={`local-${local.id}`}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                        <Building2 size={16} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-ink-primary">
                          {local.nome}
                        </p>

                        {local.endereco && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                            <MapPin size={10} />
                            {local.endereco}
                          </p>
                        )}

                        {local.tipo && (
                          <p className="mt-0.5 text-[10px] capitalize text-ink-faint">
                            {local.tipo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* ==================================================
                    FARMÁCIAS
                    ================================================== */}

                {farmacias.map((farmacia) => (
                  <div
                    key={`farmacia-${farmacia.id}`}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                        <Pill size={16} />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-ink-primary">
                          {farmacia.nome}
                        </p>

                        <p className="text-[10px] font-medium text-emerald-400">
                          Farmácia
                        </p>

                        {farmacia.endereco && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                            <MapPin size={10} />
                            {farmacia.endereco}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              LAUDOS
          ==================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<FileText size={15} />}
              title="Laudos e Relatórios Vinculados"
            />

            {documentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum laudo ou relatório anexado a este
                  CID.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map((documento) => (
                  <div
                    key={documento.id}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-primary">
                        {documento.title}
                      </p>

                      <p className="text-xs capitalize text-ink-muted">
                        {documento.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        {/* ======================================================
            MODAL DE EXCLUSÃO
            ====================================================== */}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir CID"
          message="Tem certeza que deseja remover este diagnóstico da base? Os tratamentos associados não serão apagados, mas perderão a referência de CID."
        />
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function CidDetalhesPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CidDetalhesContent />
    </Suspense>
  );
}