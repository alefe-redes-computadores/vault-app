// app/saude/exames/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FlaskConical,
  Building2,
  Stethoscope,
  FileText,
  ExternalLink,
  Trash2,
  Edit3,
  User,
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Plus,
  Copy,
  ChevronRight,
  History,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { SelectionModal } from "@/components/SelectionModal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";

import { useExames } from "@/hooks/useExames";
import { useMedicos } from "@/hooks/useMedicos";
import { useLocais } from "@/hooks/useLocais";
import { useSubmitAction } from "@/hooks/useSubmitAction";
import { useMounted } from "@/hooks/useMounted";

import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil, getClinicalTheme } from "@/lib/health-utils";

import {
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

import type {
  Exame,
  Medico,
  Tratamento,
  Cid,
  LocalSaude,
} from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(isoStr?: string) {
  if (!isoStr) return "—";

  try {
    return new Date(isoStr).toLocaleDateString("pt-BR");
  } catch {
    return isoStr;
  }
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesExameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const mounted = useMounted();

  const {
    getExame,
    updateExame,
    deleteExame,
  } = useExames();

  const { addMedico } = useMedicos();
  const { addLocal } = useLocais();

  const deleteAction = useSubmitAction();

  const [exame, setExame] = useState<Exame | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] =
    useState(false);

  const [isMedicoModalOpen, setIsMedicoModalOpen] =
    useState(false);

  const [isLocalModalOpen, setIsLocalModalOpen] =
    useState(false);

  const [isCreatingMedico, setIsCreatingMedico] =
    useState(false);

  const [newMedicoNome, setNewMedicoNome] = useState("");
  const [newMedicoEspecialidade, setNewMedicoEspecialidade] =
    useState("");

  const [isCreatingLocal, setIsCreatingLocal] = useState(false);
  const [newLocalNome, setNewLocalNome] = useState("");

  /* ==========================================================
     DEXIE
     ========================================================== */

  const medicos =
    useLiveQuery(() => db.medicos.toArray(), []) || [];

  const locais =
    useLiveQuery(() => db.locais.toArray(), []) || [];

  const persons =
    useLiveQuery(() => db.persons.toArray(), []) || [];

  const tratamentos =
    useLiveQuery(() => {
      if (
        !exame?.tratamento_ids ||
        exame.tratamento_ids.length === 0
      ) {
        return [];
      }

      return db.tratamentos
        .where("id")
        .anyOf(exame.tratamento_ids)
        .toArray();
    }, [exame?.tratamento_ids]) || [];

  const cids =
    useLiveQuery(() => {
      if (!exame?.cid_ids || exame.cid_ids.length === 0) {
        return [];
      }

      return db.cids
        .where("id")
        .anyOf(exame.cid_ids)
        .toArray();
    }, [exame?.cid_ids]) || [];

  const person = useLiveQuery(
    () =>
      exame?.person_id
        ? db.persons.get(exame.person_id)
        : undefined,
    [exame?.person_id]
  );

  const medico = useLiveQuery(
    () =>
      exame?.medico_id
        ? db.medicos.get(exame.medico_id)
        : undefined,
    [exame?.medico_id]
  );

  const local = useLiveQuery(
    () =>
      exame?.local_id
        ? db.locais.get(exame.local_id)
        : undefined,
    [exame?.local_id]
  );

  const historicoExames =
    useLiveQuery(() => {
      if (!exame) return [];

      return db.exames
        .where("nome")
        .equals(exame.nome)
        .filter(
          (item) =>
            item.id !== exame.id &&
            item.person_id === exame.person_id
        )
        .toArray();
    }, [exame]) || [];

  /* ==========================================================
     CARREGAMENTO
     ========================================================== */

  useEffect(() => {
    let active = true;

    if (!id) {
      router.replace("/saude/exames");
      return;
    }

    const loadExame = async () => {
      try {
        const data = await getExame(id);

        if (!active) return;

        if (data) {
          setExame(data);
        } else {
          router.replace("/saude/exames");
        }
      } catch (error) {
        console.error("Erro ao carregar exame:", error);

        if (active) {
          router.replace("/saude/exames");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadExame();

    return () => {
      active = false;
    };
  }, [id, getExame, router]);

  /* ==========================================================
     DADOS DERIVADOS
     ========================================================== */

  const exameVencido = useMemo(() => {
    if (!exame?.data_retorno) return false;

    return isReceitaVencidaSegura(exame.data_retorno);
  }, [exame?.data_retorno]);

  const diasParaApresentacao = useMemo(() => {
    if (!exame?.data_retorno) return null;

    return getDaysUntil(exame.data_retorno);
  }, [exame?.data_retorno]);

  /* ==========================================================
     LOADING
     ========================================================== */

  if (!mounted || isLoading) {
    return <DetailSkeleton />;
  }

  if (!exame) {
    return null;
  }

  const exameId = exame.id;

  const medicoValido = Boolean(medico?.nome);
  const localValido = Boolean(local?.nome);

  const personName =
    person?.name ||
    persons.find((item) => item.id === exame.person_id)?.name ||
    "Pessoa não encontrada";

  const temHorario =
    typeof exame.horario === "string" &&
    exame.horario.trim().length > 0;

  const corBorda =
    exameVencido
      ? "#EF4444"
      : diasParaApresentacao !== null &&
          diasParaApresentacao <= 3
        ? "#F59E0B"
        : "#10B981";

  /* ==========================================================
     MENU
     ========================================================== */

  const menuOptions = [
    {
      id: "duplicar-exame",
      label: "Solicitar Novamente",
      icon: Copy,
      path: `/saude/exames/novo?duplicar=${exameId}`,
    },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  /* ==========================================================
     CRIAÇÃO RÁPIDA DE MÉDICO
     ========================================================== */

  const handleCreateMedico = async () => {
    if (!newMedicoNome.trim()) {
      showToast("Nome do médico é obrigatório", "error");
      return;
    }

    if (!exameId) {
      showToast("Erro: ID do exame não encontrado", "error");
      return;
    }

    trigger("vibrate");

    try {
      const newId = await addMedico({
        nome: newMedicoNome.trim(),
        especialidade:
          newMedicoEspecialidade.trim() || undefined,
      });

      await updateExame(exameId, {
        medico_id: newId,
      });

      showToast("Médico vinculado com sucesso!", "success");

      setIsCreatingMedico(false);
      setNewMedicoNome("");
      setNewMedicoEspecialidade("");

      const updated = await getExame(exameId);

      if (updated) {
        setExame(updated);
      }
    } catch (error) {
      console.error("Erro ao criar médico:", error);
      showToast("Erro ao criar médico", "error");
    }
  };

  /* ==========================================================
     CRIAÇÃO RÁPIDA DE LOCAL
     ========================================================== */

  const handleCreateLocal = async () => {
    if (!newLocalNome.trim()) {
      showToast("Nome do local é obrigatório", "error");
      return;
    }

    if (!exameId) {
      showToast("Erro: ID do exame não encontrado", "error");
      return;
    }

    trigger("vibrate");

    try {
      const newId = await addLocal({
        nome: newLocalNome.trim(),
        tipo: "laboratorio",
      });

      await updateExame(exameId, {
        local_id: newId,
      });

      showToast("Local vinculado com sucesso!", "success");

      setIsCreatingLocal(false);
      setNewLocalNome("");

      const updated = await getExame(exameId);

      if (updated) {
        setExame(updated);
      }
    } catch (error) {
      console.error("Erro ao criar local:", error);
      showToast("Erro ao criar local", "error");
    }
  };

  /* ==========================================================
     EXCLUSÃO
     ========================================================== */

  const handleDelete = () => {
    if (!exameId) return;

    trigger("vibrate");

    deleteAction.run(
      async () => {
        await deleteExame(exameId);
        router.replace("/saude/exames");
      },
      {
        successMessage: "Exame excluído com sucesso",
        errorMessage: "Erro ao excluir exame",
        goBackOnSuccess: false,
      }
    );
  };

  /* ==========================================================
     SELEÇÃO DE MÉDICO
     ========================================================== */

  const handleSelectMedico = async (item: Medico) => {
    if (!exameId) {
      showToast("Erro: ID do exame não encontrado", "error");
      return;
    }

    trigger("vibrate");

    try {
      await updateExame(exameId, {
        medico_id: item.id,
      });

      showToast("Médico atualizado com sucesso!", "success");

      const updated = await getExame(exameId);

      if (updated) {
        setExame(updated);
      }

      setIsMedicoModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar médico:", error);
      showToast("Erro ao atualizar médico", "error");
    }
  };

  /* ==========================================================
     SELEÇÃO DE LOCAL
     ========================================================== */

  const handleSelectLocal = async (item: LocalSaude) => {
    if (!exameId) {
      showToast("Erro: ID do exame não encontrado", "error");
      return;
    }

    trigger("vibrate");

    try {
      await updateExame(exameId, {
        local_id: item.id,
      });

      showToast("Local atualizado com sucesso!", "success");

      const updated = await getExame(exameId);

      if (updated) {
        setExame(updated);
      }

      setIsLocalModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar local:", error);
      showToast("Erro ao atualizar local", "error");
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
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
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">
                  Prontuário
                </p>

                <h1 className="truncate font-display text-lg font-semibold text-ink-primary">
                  {exame.nome}
                </h1>

                <p className="mt-0.5 text-xs text-ink-muted">
                  <User size={12} className="mr-1 inline" />
                  {personName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setIsMenuFlutuanteOpen((previous) => !previous);
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
                        transition={{ duration: 0.16 }}
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
                                  handleMenuOptionClick(option.path)
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
                    `/saude/exames/editar?id=${exame.id}`
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
                type="button"
                aria-label="Editar exame"
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
                aria-label="Excluir exame"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-5 px-5 pt-6">
          {exame.data_retorno && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-sm ${
                exameVencido
                  ? "border-coral/40 bg-coral/10 text-coral"
                  : diasParaApresentacao !== null &&
                      diasParaApresentacao <= 3
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-surface-border/50 bg-surface text-ink-primary"
              }`}
            >
              {exameVencido ? (
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  {exameVencido
                    ? "Prazo Vencido"
                    : "Prazo Válido"}

                  <span
                    className={
                      exameVencido
                        ? "rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold text-coral"
                        : "rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400"
                    }
                  >
                    {exameVencido ? "Vencido" : "Válido"}
                  </span>
                </p>

                <p className="mt-0.5 text-xs opacity-90">
                  {exameVencido
                    ? `A data limite era ${formatDate(
                        exame.data_retorno
                      )}. Verifique se precisa de uma nova solicitação.`
                    : `Data limite agendada para ${formatDate(
                        exame.data_retorno
                      )}.`}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{ borderLeft: `6px solid ${corBorda}` }}
          >
            <div className="flex items-center gap-3.5 border-b border-surface-border/40 pb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                <FlaskConical size={24} />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink-primary">
                  {exame.nome}
                </h2>

                <p className="flex items-center gap-2 text-xs text-ink-muted">
                  Registrado em {formatDate(exame.data)}

                  {temHorario && (
                    <span className="font-mono text-[10px]">
                      • {exame.horario}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <DetailInfoRow
              icon={<Stethoscope size={18} />}
              iconClassName="bg-ice/10 text-ice"
              label="Solicitante"
              action={
                !medicoValido && exame.medico ? (
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setIsMedicoModalOpen(true);
                    }}
                    className="rounded-full bg-ice/10 px-3 py-1.5 text-xs font-bold text-ice transition-colors hover:bg-ice/20"
                    type="button"
                  >
                    Corrigir
                  </button>
                ) : undefined
              }
            >
              {medicoValido ? (
                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push(
                      `/saude/medicos/detalhes?id=${medico!.id}`
                    );
                  }}
                  className="flex max-w-full items-center gap-1 truncate text-sm font-semibold text-ink-primary transition-colors hover:text-ice"
                  type="button"
                >
                  <span className="truncate">{medico!.nome}</span>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-ink-faint"
                  />
                </button>
              ) : exame.medico ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-muted line-through">
                    {exame.medico}
                  </p>

                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
                    <AlertOctagon size={12} />
                    Cadastro perdido
                  </span>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  Não informado
                </p>
              )}
            </DetailInfoRow>

            <DetailInfoRow
              icon={<Building2 size={18} />}
              iconClassName="bg-emerald-400/10 text-emerald-400"
              label="Local / Laboratório"
              action={
                !localValido && exame.laboratorio ? (
                  <button
                    onClick={() => {
                      trigger("vibrate");
                      setIsLocalModalOpen(true);
                    }}
                    className="rounded-full bg-ice/10 px-3 py-1.5 text-xs font-bold text-ice transition-colors hover:bg-ice/20"
                    type="button"
                  >
                    Corrigir
                  </button>
                ) : undefined
              }
            >
              {localValido ? (
                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push(
                      `/saude/locais/detalhes?id=${local!.id}`
                    );
                  }}
                  className="flex max-w-full items-center gap-1 truncate text-sm font-semibold text-ink-primary transition-colors hover:text-ice"
                  type="button"
                >
                  <span className="truncate">{local!.nome}</span>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-ink-faint"
                  />
                </button>
              ) : exame.laboratorio ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-muted line-through">
                    {exame.laboratorio}
                  </p>

                  <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
                    <AlertOctagon size={12} />
                    Cadastro perdido
                  </span>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  Não informado
                </p>
              )}
            </DetailInfoRow>

            {tratamentos.length > 0 && (
              <div className="pt-2">
                <SectionTitle
                  icon={<Activity size={15} />}
                  title="Tratamentos Relacionados"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {tratamentos.map((tratamento: Tratamento) => {
                    const theme = getClinicalTheme(
                      tratamento.nome
                    );
                    const Icon = theme.icon;

                    return (
                      <button
                        key={tratamento.id}
                        onClick={() => {
                          trigger("vibrate");
                          router.push(
                            `/saude/tratamentos/detalhes?id=${tratamento.id}`
                          );
                        }}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-opacity hover:opacity-80 ${theme.tagClass}`}
                        type="button"
                      >
                        <Icon size={14} />
                        <span className="text-xs font-medium">
                          {tratamento.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {cids.length > 0 && (
              <div className="pt-2">
                <SectionTitle
                  icon={<Activity size={15} />}
                  title="CIDs Relacionados"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  {cids.map((cid: Cid) => {
                    const theme = getClinicalTheme(
                      cid.descricao || cid.codigo
                    );
                    const Icon = theme.icon;

                    return (
                      <span
                        key={cid.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.tagClass}`}
                      >
                        <Icon size={14} />
                        <span className="text-xs font-medium">
                          {cid.codigo}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {exame.motivo && (
              <div className="pt-2">
                <SectionTitle
                  icon={<FileText size={15} />}
                  title="Motivo da Solicitação"
                />

                <p className="mt-1 rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3 text-xs text-ink-primary">
                  {exame.motivo}
                </p>
              </div>
            )}

            {exame.observacoes && (
              <div className="pt-2">
                <SectionTitle
                  icon={<FileText size={15} />}
                  title="Resultados / Notas"
                />

                <p className="mt-1 whitespace-pre-wrap rounded-xl border border-surface-border/40 bg-surface-raised/50 p-3 text-xs text-ink-primary">
                  {exame.observacoes}
                </p>
              </div>
            )}

            {exame.anexo_url && (
              <a
                href={exame.anexo_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice transition-colors hover:bg-ice/20"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} />
                  Ver Anexo / Documento do Exame
                </div>

                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>

          {historicoExames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="space-y-3 rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm"
            >
              <SectionTitle
                icon={<History size={15} />}
                title="Histórico do Exame"
              />

              <p className="text-xs text-ink-muted">
                Outras vezes que "{exame.nome}" foi realizado para{" "}
                {personName}:
              </p>

              <div className="space-y-2 pt-1">
                {[...historicoExames]
                  .sort(
                    (a, b) =>
                      new Date(b.data).getTime() -
                      new Date(a.data).getTime()
                  )
                  .map((item: Exame) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          `/saude/exames/detalhes?id=${item.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/40 bg-surface-raised/70 p-3 text-left transition-colors hover:bg-surface-raised active:scale-[0.99]"
                      type="button"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-primary">
                          Realizado em {formatDate(item.data)}
                        </p>

                        {item.laboratorio && (
                          <p className="truncate text-[10px] text-ink-muted">
                            {item.laboratorio}
                          </p>
                        )}

                        {item.medico && (
                          <p className="truncate text-[10px] text-ink-muted">
                            Solicitante: {item.medico}
                          </p>
                        )}
                      </div>

                      <span className="ml-3 shrink-0 text-xs font-medium text-ice">
                        Ver detalhes
                      </span>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Exame"
          message={`Tem certeza que deseja excluir o registro de "${exame.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleteAction.isSubmitting}
          type="danger"
        />

        <SelectionModal
          isOpen={isMedicoModalOpen}
          onClose={() => setIsMedicoModalOpen(false)}
          onSelect={handleSelectMedico}
          items={medicos}
          title="Selecionar Médico"
          placeholder="Buscar médico..."
          renderItem={(item: Medico) => (
            <div>
              <p className="font-medium text-ink-primary">
                {item.nome}
              </p>

              {item.especialidade && (
                <p className="text-xs text-ink-muted">
                  {item.especialidade}
                </p>
              )}
            </div>
          )}
          getItemId={(item: Medico) => item.id!}
          getItemLabel={(item: Medico) => item.nome}
          onCreateNew={() => {
            setIsMedicoModalOpen(false);
            setIsCreatingMedico(true);
          }}
          createNewLabel="Cadastrar Novo Médico"
        />

        <SelectionModal
          isOpen={isLocalModalOpen}
          onClose={() => setIsLocalModalOpen(false)}
          onSelect={handleSelectLocal}
          items={locais.filter(
            (item) => item.tipo === "laboratorio"
          )}
          title="Selecionar Local / Laboratório"
          placeholder="Buscar local..."
          renderItem={(item: LocalSaude) => (
            <div>
              <p className="font-medium text-ink-primary">
                {item.nome}
              </p>

              {item.endereco && (
                <p className="text-xs text-ink-muted">
                  {item.endereco}
                </p>
              )}
            </div>
          )}
          getItemId={(item: LocalSaude) => item.id!}
          getItemLabel={(item: LocalSaude) => item.nome}
          onCreateNew={() => {
            setIsLocalModalOpen(false);
            setIsCreatingLocal(true);
          }}
          createNewLabel="Cadastrar Novo Local"
        />

        <AnimatePresence>
          {isCreatingMedico && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                }}
                className="w-full max-w-md rounded-t-[32px] bg-surface p-6 shadow-vault sm:rounded-[32px]"
              >
                <h3 className="mb-4 font-display text-lg font-bold text-ink-primary">
                  Novo Médico
                </h3>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome do médico"
                    value={newMedicoNome}
                    onChange={(event) =>
                      setNewMedicoNome(event.target.value)
                    }
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                  />

                  <input
                    type="text"
                    placeholder="Especialidade (opcional)"
                    value={newMedicoEspecialidade}
                    onChange={(event) =>
                      setNewMedicoEspecialidade(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setIsCreatingMedico(false);
                        setNewMedicoNome("");
                        setNewMedicoEspecialidade("");
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleCreateMedico}
                    >
                      Salvar e Vincular
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreatingLocal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                }}
                className="w-full max-w-md rounded-t-[32px] bg-surface p-6 shadow-vault sm:rounded-[32px]"
              >
                <h3 className="mb-4 font-display text-lg font-bold text-ink-primary">
                  Novo Local / Laboratório
                </h3>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome do local"
                    value={newLocalNome}
                    onChange={(event) =>
                      setNewLocalNome(event.target.value)
                    }
                    className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-ink-primary outline-none focus:border-ice"
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setIsCreatingLocal(false);
                        setNewLocalNome("");
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleCreateLocal}
                    >
                      Salvar e Vincular
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function DetalhesExamePage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetalhesExameContent />
    </Suspense>
  );
}