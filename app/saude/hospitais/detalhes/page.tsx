// app/saude/hospitais/detalhes/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Edit3,
  ExternalLink,
  FileWarning,
  FolderHeart,
  Hospital as HospitalIcon,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Stethoscope,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import type {
  Cirurgia,
  Consulta,
  Hospital,
  Medico,
  Renovacao,
  Tratamento,
} from "@/lib/types";

import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { useMounted } from "@/hooks/useMounted";
import { useSubmitAction } from "@/hooks/useSubmitAction";

import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  SectionTitle,
  StatCard,
} from "@/components/detail/DetailComponents";

import { formatDateDisplay } from "@/lib/health-utils";
import { gerarAlertasVisaoGeral } from "@/lib/health-insights";

/* ============================================================
   CONSTANTES / TIPOS
   ============================================================ */

const HOSPITAL_COLOR = "#38BDF8";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface AnaliseHospital {
  cirurgias: Cirurgia[];
  consultas: Consulta[];
  medicos: Medico[];
  renovacoes: Renovacao[];
  ultimaConsulta: Consulta | null;
  totalGastoRenovacoes: number;
}

interface MenuOption {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesHospitalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { trigger } = useHapticFeedback();
  const { getHospital, deleteHospital } = useHospitais();
  const deleteAction = useSubmitAction();
  const mounted = useMounted();

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  /* ==========================================================
     DEXIE
     ========================================================== */

  const consultas = useLiveQuery(
    () => db.consultas.toArray(),
    []
  ) ?? [];

  const medicos = useLiveQuery(
    () => db.medicos.toArray(),
    []
  ) ?? [];

  const cirurgias = useLiveQuery(
    () =>
      id
        ? db.cirurgias.where("hospital_id").equals(id).toArray()
        : Promise.resolve([] as Cirurgia[]),
    [id]
  ) ?? [];

  const renovacoes = useLiveQuery(
    () =>
      id
        ? db.renovacoes.where("hospital_id").equals(id).toArray()
        : Promise.resolve([] as Renovacao[]),
    [id]
  ) ?? [];

  const tratamentoIds = useMemo(
    () => hospital?.tratamento_ids ?? [],
    [hospital?.tratamento_ids]
  );

  const tratamentos = useLiveQuery(
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
     CARREGAMENTO
     ========================================================== */

  useEffect(() => {
    if (!id) {
      router.replace("/saude/hospitais");
      return;
    }

    let active = true;

    setIsLoading(true);

    getHospital(id)
      .then((item) => {
        if (!active) return;

        if (item) {
          setHospital(item);
        } else {
          router.replace("/saude/hospitais");
        }
      })
      .catch(() => {
        if (active) {
          router.replace("/saude/hospitais");
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
  }, [getHospital, id, router]);

  /* ==========================================================
     ANÁLISE DO HOSPITAL
     ========================================================== */

  const analiseHospital = useMemo<AnaliseHospital>(() => {
    if (!id || !hospital) {
      return {
        cirurgias: [],
        consultas: [],
        medicos: [],
        renovacoes: [],
        ultimaConsulta: null,
        totalGastoRenovacoes: 0,
      };
    }

    const consultasDoHospital = consultas
      .filter((consulta) => consulta.hospital_id === id)
      .sort((a, b) =>
        (b.data || "").localeCompare(a.data || "")
      );

    const cirurgiasDoHospital = [...cirurgias].sort((a, b) =>
      (b.data || "").localeCompare(a.data || "")
    );

    const renovacoesDoHospital = [...renovacoes].sort((a, b) =>
      (b.data || "").localeCompare(a.data || "")
    );

    const medicoIdsDiretos = hospital.medico_ids ?? [];

    const medicosDiretos = medicos.filter(
      (medico) =>
        !!medico.id &&
        medicoIdsDiretos.includes(medico.id)
    );

    const medicoIdsInferidos = new Set(
      consultasDoHospital
        .map((consulta) => consulta.medico_id)
        .filter((medicoId): medicoId is string => Boolean(medicoId))
    );

    const medicosInferidos = medicos.filter(
      (medico) =>
        !!medico.id &&
        medicoIdsInferidos.has(medico.id)
    );

    const medicosUnicos = new Map<string, Medico>();

    [...medicosDiretos, ...medicosInferidos].forEach((medico) => {
      if (medico.id) {
        medicosUnicos.set(medico.id, medico);
      }
    });

    const totalGastoRenovacoes = renovacoesDoHospital.reduce(
      (total, renovacao) => {
        const preco =
          typeof renovacao.preco === "number"
            ? renovacao.preco
            : Number(renovacao.preco) || 0;

        return total + preco;
      },
      0
    );

    return {
      cirurgias: cirurgiasDoHospital,
      consultas: consultasDoHospital,
      medicos: Array.from(medicosUnicos.values()),
      renovacoes: renovacoesDoHospital,
      ultimaConsulta:
        consultasDoHospital.length > 0
          ? consultasDoHospital[0]
          : null,
      totalGastoRenovacoes,
    };
  }, [
    consultas,
    cirurgias,
    hospital,
    id,
    medicos,
    renovacoes,
  ]);

  /* ==========================================================
     ALERTAS
     ========================================================== */

  const alertasRelevantes = useMemo(() => {
    if (!id) return [];

    const contexto = {
      medicamentos: [],
      consultas: consultas.filter(
        (consulta) => consulta.hospital_id === id
      ),
      exames: [],
      cirurgias: cirurgias.filter(
        (cirurgia) => cirurgia.hospital_id === id
      ),
    };

    return gerarAlertasVisaoGeral(contexto).slice(0, 3);
  }, [consultas, cirurgias, id]);

  /* ==========================================================
     AÇÕES
     ========================================================== */

  const menuOptions = useMemo<MenuOption[]>(
    () => [
      {
        id: "nova-cirurgia",
        label: "Nova Cirurgia",
        icon: Activity,
        path: `/saude/cirurgias/nova?hospital_id=${id}`,
      },
      {
        id: "nova-consulta",
        label: "Nova Consulta",
        icon: Stethoscope,
        path: `/saude/consultas/nova?hospital_id=${id}`,
      },
    ],
    [id]
  );

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
        await deleteHospital(id);
        router.replace("/saude/hospitais");
      },
      {
        successMessage: "Hospital excluído com sucesso",
        errorMessage: "Erro ao excluir hospital",
        goBackOnSuccess: false,
      }
    );
  };

  /* ==========================================================
     ESTADOS DE RENDERIZAÇÃO
     ========================================================== */

  if (!mounted || isLoading) {
    return <DetailSkeleton />;
  }

  if (!hospital) {
    return null;
  }

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                Unidade Hospitalar
              </p>

              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Detalhes do Hospital
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* MENU DE AÇÕES */}

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
                          Adicionar
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
                  `/saude/hospitais/editar?id=${hospital.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:border-ice/30 hover:text-ice active:scale-95"
              aria-label="Editar hospital"
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
              aria-label="Excluir hospital"
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
              ALERTAS
          ================================================== */}

          {alertasRelevantes.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 shadow-sm"
            >
              <SectionTitle
                icon={<AlertTriangle size={15} />}
                title="Alertas"
              />

              <div className="mt-3 space-y-2">
                {alertasRelevantes.map((alerta, index) => (
                  <div
                    key={`${alerta.mensagem}-${index}`}
                    className="flex items-start gap-2 border-b border-amber-400/10 pb-2 text-xs last:border-0"
                  >
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />

                    <p className="font-medium text-ink-primary">
                      {alerta.mensagem}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              HERO
          ================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="space-y-4 rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm"
            style={{
              borderLeft: `6px solid ${HOSPITAL_COLOR}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor: `${HOSPITAL_COLOR}15`,
                    color: HOSPITAL_COLOR,
                    borderColor: `${HOSPITAL_COLOR}30`,
                  }}
                >
                  <HospitalIcon size={28} />
                </div>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-2xl font-bold uppercase text-ink-primary">
                      {hospital.nome}
                    </h2>

                    <span className="shrink-0 rounded-full border border-ice/30 bg-ice/10 px-2 py-0.5 text-[9px] font-bold uppercase text-ice">
                      Hospital
                    </span>
                  </div>

                  {hospital.endereco && (
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                      <MapPin
                        size={13}
                        className="shrink-0 text-ink-faint"
                      />
                      {hospital.endereco}
                    </p>
                  )}

                  {hospital.telefone && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Phone
                        size={13}
                        className="shrink-0 text-ink-faint"
                      />
                      {hospital.telefone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-1">
                {hospital.telefone && (
                  <a
                    href={`tel:${hospital.telefone}`}
                    onClick={() => trigger("vibrate")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 transition-all active:scale-95"
                    title="Ligar para hospital"
                    aria-label="Ligar para hospital"
                  >
                    <Phone size={16} />
                  </a>
                )}

                {hospital.endereco && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      hospital.endereco
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trigger("vibrate")}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/30 bg-ice/10 text-ice transition-all active:scale-95"
                    title="Abrir no mapa"
                    aria-label="Abrir no mapa"
                  >
                    <Navigation size={16} />
                  </a>
                )}
              </div>
            </div>

            {analiseHospital.ultimaConsulta && (
              <div className="border-t border-surface-border/40 pt-2">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock size={14} className="text-ice" />

                  <span>
                    Última consulta:{" "}
                    <span className="font-medium text-ink-primary">
                      {formatDateDisplay(
                        analiseHospital.ultimaConsulta.data
                      )}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* MÉTRICAS */}

            <div className="grid grid-cols-3 gap-3 border-t border-surface-border/40 pt-4">
              <StatCard
                icon={<Calendar size={14} />}
                label="Consultas"
                value={String(
                  analiseHospital.consultas.length
                )}
              />

              <StatCard
                icon={<Activity size={14} />}
                label="Cirurgias"
                value={String(
                  analiseHospital.cirurgias.length
                )}
              />

              <StatCard
                icon={<FileWarning size={14} />}
                label="Renovações"
                value={String(
                  analiseHospital.renovacoes.length
                )}
              />
            </div>
          </motion.div>

          {/* ==================================================
              MÉDICOS
          ================================================== */}

          {analiseHospital.medicos.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.03 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Stethoscope size={15} />}
                title="Médicos que atendem aqui"
              />

              <div className="flex flex-wrap gap-2">
                {analiseHospital.medicos.map((medico) => (
                  <button
                    key={medico.id}
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      router.push(
                        `/saude/medicos/detalhes?id=${medico.id}`
                      );
                    }}
                    className="rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-ink-primary shadow-sm transition-all hover:border-ice/30 active:scale-95"
                  >
                    Dr(a). {medico.nome}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              TRATAMENTOS
          ================================================== */}

          {tratamentos.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.04 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<FolderHeart size={15} />}
                title="Tratamentos Relacionados"
              />

              <div className="flex flex-wrap gap-2">
                {tratamentos.map((tratamento) => (
                  <span
                    key={tratamento.id}
                    className="rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-300"
                  >
                    {tratamento.nome}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              CONSULTAS
          ================================================== */}

          {analiseHospital.consultas.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<Calendar size={15} />}
                title={`Consultas Realizadas (${analiseHospital.consultas.length})`}
              />

              <div className="space-y-2">
                {analiseHospital.consultas
                  .slice(0, 3)
                  .map((consulta) => (
                    <button
                      key={consulta.id}
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(
                          `/saude/consultas/detalhes?id=${consulta.id}`
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                          <Calendar size={16} />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-primary">
                            {consulta.especialidade}
                          </span>

                          <span className="block text-[11px] text-ink-muted">
                            {formatDateDisplay(consulta.data)}
                          </span>
                        </span>
                      </span>

                      <ExternalLink
                        size={15}
                        className="shrink-0 text-ink-faint"
                      />
                    </button>
                  ))}

                {analiseHospital.consultas.length > 3 && (
                  <p className="pt-1 text-center text-[10px] text-ink-muted">
                    E mais{" "}
                    {analiseHospital.consultas.length - 3}{" "}
                    registro(s)...
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              RENOVAÇÕES
          ================================================== */}

          {analiseHospital.renovacoes.length > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.06 }}
              className="space-y-3"
            >
              <SectionTitle
                icon={<FileWarning size={15} />}
                title={`Retiradas / Renovações (${analiseHospital.renovacoes.length})`}
              />

              <div className="space-y-2">
                {analiseHospital.renovacoes
                  .slice(0, 3)
                  .map((renovacao) => {
                    const dataReferencia =
                      renovacao.data_proxima_retirada ||
                      renovacao.data;

                    return (
                      <div
                        key={renovacao.id}
                        className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                            <FileWarning size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {formatDateDisplay(
                                renovacao.data
                              )}
                            </p>

                            <p className="text-[11px] text-ink-muted">
                              {renovacao.observacoes ||
                                "Retirada de medicamento"}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {dataReferencia &&
                            new Date(dataReferencia) <
                              new Date() && (
                              <span className="rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                                Vencida
                              </span>
                            )}

                          <span className="text-xs font-semibold text-emerald-400">
                            {typeof renovacao.preco ===
                              "number" &&
                            renovacao.preco > 0
                              ? `R$ ${renovacao.preco
                                  .toFixed(2)
                                  .replace(".", ",")}`
                              : "Gratuito"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {analiseHospital.totalGastoRenovacoes > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t border-surface-border/40 pt-3">
                    <span className="text-xs text-ink-muted">
                      Total com retiradas
                    </span>

                    <span className="text-xs font-bold text-emerald-400">
                      R${" "}
                      {analiseHospital.totalGastoRenovacoes
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              CIRURGIAS
          ================================================== */}

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.07 }}
            className="space-y-3"
          >
            <SectionTitle
              icon={<Activity size={15} />}
              title={`Cirurgias (${analiseHospital.cirurgias.length})`}
            />

            {analiseHospital.cirurgias.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">
                  Nenhum procedimento registrado nesta unidade.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analiseHospital.cirurgias.map((cirurgia) => (
                  <button
                    key={cirurgia.id}
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      router.push(
                        `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                      );
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all hover:border-ice/30 active:scale-[0.98]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Activity size={16} />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-primary">
                          {cirurgia.procedimento}
                        </span>

                        <span className="block text-[11px] text-ink-muted">
                          {cirurgia.data
                            ? formatDateDisplay(
                                cirurgia.data
                              )
                            : "Data não informada"}
                        </span>
                      </span>
                    </span>

                    <ExternalLink
                      size={15}
                      className="shrink-0 text-ink-faint"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        {/* ====================================================
            CONFIRMAÇÃO DE EXCLUSÃO
        ==================================================== */}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir hospital"
          message={`Tem certeza que deseja excluir "${hospital.nome}"?`}
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

export default function DetalhesHospitalPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetalhesHospitalContent />
    </Suspense>
  );
}