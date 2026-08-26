// app/saude/medicos/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Stethoscope,
  Phone,
  Mail,
  Edit3,
  Trash2,
  Calendar,
  Activity,
  Pill,
  ChevronRight,
  Building2,
  FileWarning,
  FolderHeart,
  AlertCircle,
  AlertTriangle,
  Plus,
  Syringe,
  FileText,
  FlaskConical,
  MapPin,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type {
  Medico,
  Consulta,
  Cirurgia,
  Medicamento,
  Renovacao,
  Tratamento,
  Hospital,
  DoseLog,
  Document,
  Exame,
  LocalSaude,
} from "@/lib/types";
import { useMedicos } from "@/hooks/useMedicos";
import {
  sugerirRenovacao,
  isReceitaVencidaSegura,
  analisarComportamentoUso,
} from "@/lib/health-insights";
import { useMounted } from "@/hooks/useMounted";
import {
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

/* ============================================================
   HELPERS
   ============================================================ */

function getTreatmentColor(nome: string): string {
  const colors: Record<string, string> = {
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

  const lower = nome.toLowerCase();

  for (const [key, color] of Object.entries(colors)) {
    if (lower.includes(key)) return color;
  }

  return "#38BDF8";
}

function formatDateDisplay(isoStr?: string): string {
  if (!isoStr) return "";

  const parts = isoStr.split("-");

  if (parts.length !== 3) return isoStr;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isDateInFuture(dateStr?: string): boolean {
  if (!dateStr) return false;

  return new Date(dateStr) > new Date();
}

/* ============================================================
   COMPONENTES LOCAIS
   ============================================================ */

function DetailCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function HistoryItem({
  title,
  subtitle,
  onClick,
  icon,
  iconClassName = "text-ice",
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  iconClassName?: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface ${iconClassName}`}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-primary">
            {title}
          </p>

          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onClick && (
        <ChevronRight size={14} className="shrink-0 text-ink-faint" />
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-all hover:border-ice/30 active:scale-[0.99]"
    >
      {content}
    </button>
  );
}

function EmptyHistory({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-1 text-xs text-ink-muted">
      {children}
    </p>
  );
}

/* ============================================================
   CONTEÚDO
   ============================================================ */

function DetalhesMedicoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id");
  const mounted = useMounted();

  const [medico, setMedico] = useState<Medico | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const { deleteMedico } = useMedicos();

  /* ==========================================================
     DEXIE
     ========================================================== */

  const consultas =
    useLiveQuery(
      () =>
        id
          ? db.consultas
              .where("medico_id")
              .equals(id)
              .toArray()
          : Promise.resolve([] as Consulta[]),
      [id]
    ) ?? [];

  const cirurgias =
    useLiveQuery(
      () =>
        id
          ? db.cirurgias
              .where("medico_id")
              .equals(id)
              .toArray()
          : Promise.resolve([] as Cirurgia[]),
      [id]
    ) ?? [];

  const medicamentos =
    useLiveQuery(
      () =>
        id
          ? db.medicamentos
              .where("medico_id")
              .equals(id)
              .toArray()
          : Promise.resolve([] as Medicamento[]),
      [id]
    ) ?? [];

  const renovacoes =
    useLiveQuery(
      () =>
        id
          ? db.renovacoes
              .where("medico_id")
              .equals(id)
              .reverse()
              .sortBy("data")
          : Promise.resolve([] as Renovacao[]),
      [id]
    ) ?? [];

  const exames =
    useLiveQuery(
      () =>
        id
          ? db.exames
              .where("medico_id")
              .equals(id)
              .toArray()
          : Promise.resolve([] as Exame[]),
      [id]
    ) ?? [];

  /* ==========================================================
     DOSES
     ========================================================== */

  const medIdsStr = useMemo(
    () =>
      medicamentos
        .map((med) => med.id)
        .filter(Boolean)
        .sort()
        .join(","),
    [medicamentos]
  );

  const doseLogs =
    useLiveQuery(() => {
      const validMedIds = medIdsStr
        ? medIdsStr.split(",")
        : [];

      if (validMedIds.length === 0) {
        return Promise.resolve([] as DoseLog[]);
      }

      return db.doseLogs
        .where("medicamento_id")
        .anyOf(validMedIds)
        .toArray();
    }, [medIdsStr]) ?? [];

  /* ==========================================================
     ESTABELECIMENTOS UTILIZADOS EM CONSULTAS/CIRURGIAS
     ========================================================== */

  const estabelecimentosIdsStr = useMemo(() => {
    const ids = new Set<string>();

    consultas.forEach((consulta) => {
      if (consulta.hospital_id) {
        ids.add(consulta.hospital_id);
      }
    });

    cirurgias.forEach((cirurgia) => {
      if (cirurgia.hospital_id) {
        ids.add(cirurgia.hospital_id);
      }
    });

    return Array.from(ids).sort().join(",");
  }, [consultas, cirurgias]);

  const estabelecimentos =
    useLiveQuery(() => {
      const ids = estabelecimentosIdsStr
        ? estabelecimentosIdsStr.split(",")
        : [];

      if (ids.length === 0) {
        return Promise.resolve([] as Hospital[]);
      }

      return db.hospitais
        .where("id")
        .anyOf(ids)
        .toArray();
    }, [estabelecimentosIdsStr]) ?? [];

  /* ==========================================================
     TRATAMENTOS
     ========================================================== */

  const tratamentosIdsStr = useMemo(() => {
    const ids = new Set<string>();

    medicamentos.forEach((medicamento) => {
      if (
        medicamento.tratamento_ids &&
        Array.isArray(medicamento.tratamento_ids)
      ) {
        medicamento.tratamento_ids.forEach((tratamentoId) => {
          ids.add(tratamentoId);
        });
      }
    });

    return Array.from(ids).sort().join(",");
  }, [medicamentos]);

  const tratamentos =
    useLiveQuery(() => {
      const ids = tratamentosIdsStr
        ? tratamentosIdsStr.split(",")
        : [];

      if (ids.length === 0) {
        return Promise.resolve([] as Tratamento[]);
      }

      return db.tratamentos
        .where("id")
        .anyOf(ids)
        .toArray();
    }, [tratamentosIdsStr]) ?? [];

  /* ==========================================================
     HOSPITAIS VINCULADOS AO MÉDICO
     ========================================================== */

  const medicoHospIdsStr = useMemo(
    () =>
      (medico?.hospital_ids || [])
        .slice()
        .sort()
        .join(","),
    [medico?.hospital_ids]
  );

  const hospitaisVinculados =
    useLiveQuery(() => {
      const ids = medicoHospIdsStr
        ? medicoHospIdsStr.split(",")
        : [];

      if (ids.length === 0) {
        return Promise.resolve([] as Hospital[]);
      }

      return db.hospitais
        .where("id")
        .anyOf(ids)
        .toArray();
    }, [medicoHospIdsStr]) ?? [];

  /* ==========================================================
     LOCAIS VINCULADOS AO MÉDICO
     ========================================================== */

  const medicoLocalIdsStr = useMemo(
    () =>
      (medico?.local_ids || [])
        .slice()
        .sort()
        .join(","),
    [medico?.local_ids]
  );

  const locaisVinculados =
    useLiveQuery(() => {
      const ids = medicoLocalIdsStr
        ? medicoLocalIdsStr.split(",")
        : [];

      if (ids.length === 0) {
        return Promise.resolve([] as LocalSaude[]);
      }

      return db.locais
        .where("id")
        .anyOf(ids)
        .toArray();
    }, [medicoLocalIdsStr]) ?? [];

  /* ==========================================================
     DOCUMENTOS
     ========================================================== */

  const documentosDoMedico =
    useLiveQuery(
      () =>
        id
          ? db.documents
              .where("medico_id")
              .equals(id)
              .reverse()
              .sortBy("created_at")
          : Promise.resolve([] as Document[]),
      [id]
    ) ?? [];

  /* ==========================================================
     DADOS DERIVADOS
     ========================================================== */

  const consultasOrdenadas = useMemo(
    () =>
      [...consultas].sort((a, b) =>
        (b.data || "").localeCompare(a.data || "")
      ),
    [consultas]
  );

  const cirurgiasOrdenadas = useMemo(
    () =>
      [...cirurgias].sort((a, b) =>
        (b.data || "").localeCompare(a.data || "")
      ),
    [cirurgias]
  );

  const proximaConsulta = useMemo(() => {
    const futuras = consultas.filter((consulta) =>
      isDateInFuture(consulta.data)
    );

    if (futuras.length === 0) {
      return null;
    }

    return [...futuras].sort((a, b) =>
      (a.data || "").localeCompare(b.data || "")
    )[0];
  }, [consultas]);

  const ultimaConsulta = useMemo(() => {
    return consultasOrdenadas[0] ?? null;
  }, [consultasOrdenadas]);

  const alertaSemRetorno = useMemo(() => {
    if (
      proximaConsulta ||
      !ultimaConsulta ||
      !ultimaConsulta.data
    ) {
      return null;
    }

    const dataUltima = new Date(
      ultimaConsulta.data
    ).getTime();

    const hoje = new Date().getTime();

    const diffDias = Math.floor(
      (hoje - dataUltima) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDias <= 180) {
      return null;
    }

    const meses = Math.floor(diffDias / 30);

    return `Faz ${meses} meses desde a sua última consulta. Avalie a necessidade de agendar um acompanhamento.`;
  }, [ultimaConsulta, proximaConsulta]);

  const alertasMedicamentos = useMemo(() => {
    return medicamentos.map((medicamento) => {
      const insight = sugerirRenovacao(medicamento);

      const receitaVencida =
        isReceitaVencidaSegura(
          medicamento.proxima_renovacao
        );

      const comportamento =
        analisarComportamentoUso(
          medicamento,
          doseLogs.filter(
            (dose) =>
              dose.medicamento_id === medicamento.id
          )
        );

      return {
        ...medicamento,
        insight,
        receitaVencida,
        comportamento,
      };
    });
  }, [medicamentos, doseLogs]);

  const alertasGerais = useMemo(() => {
    return {
      ativos: alertasMedicamentos.filter(
        (med) => med.insight?.deveRenovar
      ),
      vencidos: alertasMedicamentos.filter(
        (med) => med.receitaVencida
      ),
      comportamentos: alertasMedicamentos.filter(
        (med) => med.comportamento
      ),
    };
  }, [alertasMedicamentos]);

  const medicamentosAtivos = useMemo(
    () =>
      medicamentos.filter(
        (medicamento) =>
          medicamento.status === "ativo"
      ),
    [medicamentos]
  );

  const prescricoes = useMemo(
    () =>
      documentosDoMedico.filter(
        (documento) => documento.type === "receita"
      ),
    [documentosDoMedico]
  );

  const laudosRelatorios = useMemo(
    () =>
      documentosDoMedico.filter(
        (documento) =>
          documento.type === "laudo" ||
          documento.type === "encaminhamento" ||
          documento.type === "exame_imagem" ||
          documento.type === "exame_sangue"
      ),
    [documentosDoMedico]
  );

  const totalGastoRenovacoes = useMemo(() => {
    return renovacoes.reduce((total, renovacao) => {
      const preco =
        typeof renovacao.preco === "number"
          ? renovacao.preco
          : Number(renovacao.preco) || 0;

      return total + preco;
    }, 0);
  }, [renovacoes]);

  const possuiAlertas =
    alertasGerais.ativos.length > 0 ||
    alertasGerais.vencidos.length > 0 ||
    alertasGerais.comportamentos.length > 0 ||
    Boolean(alertaSemRetorno);

  /* ==========================================================
     CARREGAMENTO DO MÉDICO
     ========================================================== */

  useEffect(() => {
    if (!id) {
      router.replace("/saude/medicos");
      return;
    }

    db.medicos.get(id).then((medData) => {
      if (medData) {
        setMedico(medData);
      } else {
        router.replace("/saude/medicos");
      }

      setIsLoading(false);
    });
  }, [id, router]);

  /* ==========================================================
     ESTADOS INICIAIS
     ========================================================== */

  if (!mounted) {
    return <DetailSkeleton />;
  }

  /* ==========================================================
     AÇÕES
     ========================================================== */

  const handleDelete = async () => {
    trigger("vibrate");

    if (!id) return;

    try {
      await deleteMedico(id);

      trigger("success");

      router.replace("/saude/medicos");
    } catch (error) {
      console.error(
        "Erro ao excluir médico:",
        error
      );

      trigger("error");
    }
  };

  const menuOptions = [
    {
      id: "nova-consulta",
      label: "Nova Consulta",
      icon: Stethoscope,
      path: `/saude/consultas/nova?medico_id=${id}`,
    },
    {
      id: "nova-cirurgia",
      label: "Nova Cirurgia",
      icon: Syringe,
      path: `/saude/cirurgias/nova?medico_id=${id}`,
    },
    {
      id: "novo-medicamento",
      label: "Novo Medicamento",
      icon: Pill,
      path: `/saude/medicamentos/novo?medico_id=${id}`,
    },
  ];

  const handleMenuOptionClick = (
    path: string
  ) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!medico) {
    return null;
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-border/30 bg-void/82 px-5 pb-4 backdrop-blur-xl header-safe-top">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">
                Profissional
              </p>

              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">
                Perfil Médico
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* MENU ADICIONAR */}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setIsMenuFlutuanteOpen(
                    (open) => !open
                  );
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all hover:bg-ice/20 active:scale-95"
                aria-label="Adicionar registro"
                aria-expanded={
                  isMenuFlutuanteOpen
                }
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
                      className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                    >
                      <div className="px-3 pb-2 pt-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                          Adicionar
                        </p>
                      </div>

                      <div className="px-1.5 pb-2">
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
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ice/8 active:scale-[0.98]"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                                  <Icon size={15} />
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

            {/* EDITAR */}

            <button
              type="button"
              onClick={() => {
                trigger("vibrate");
                router.push(
                  `/saude/medicos/editar?id=${medico.id}`
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all hover:border-ice/30 hover:text-ice active:scale-95"
              aria-label="Editar médico"
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
              aria-label="Excluir médico"
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
            variants={{
              initial: {
                opacity: 0,
                y: 12,
              },
              animate: {
                opacity: 1,
                y: 0,
              },
            }}
            initial="initial"
            animate="animate"
            className="overflow-hidden rounded-[32px] border border-surface-border/50 bg-surface shadow-sm"
            style={{
              borderLeft:
                "6px solid #38BDF8",
            }}
          >
            <div className="space-y-5 p-6">

              <div className="flex items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    backgroundColor:
                      "#38BDF815",
                    color: "#38BDF8",
                    borderColor:
                      "#38BDF830",
                  }}
                >
                  <Stethoscope size={28} />
                </div>

                <div className="min-w-0 pt-1">
                  <h2 className="truncate font-display text-xl font-bold text-ink-primary">
                    Dr(a). {medico.nome}
                  </h2>

                  <p className="mt-0.5 text-sm font-medium text-ice">
                    {medico.especialidade ||
                      "Especialidade Geral"}
                  </p>

                  {medico.crm && (
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      CRM: {medico.crm}
                    </p>
                  )}
                </div>
              </div>

              {(medico.telefone ||
                medico.email) && (
                <div className="space-y-3 border-t border-surface-border/40 pt-4">
                  {medico.telefone && (
                    <DetailInfoRow
                      icon={
                        <Phone size={14} />
                      }
                      iconClassName="bg-surface-raised text-ink-muted"
                      label="Telefone"
                    >
                      <span className="text-sm font-medium text-ink-primary">
                        {medico.telefone}
                      </span>
                    </DetailInfoRow>
                  )}

                  {medico.email && (
                    <DetailInfoRow
                      icon={
                        <Mail size={14} />
                      }
                      iconClassName="bg-surface-raised text-ink-muted"
                      label="Email"
                    >
                      <span className="truncate text-sm font-medium text-ink-primary">
                        {medico.email}
                      </span>
                    </DetailInfoRow>
                  )}
                </div>
              )}

              {proximaConsulta && (
                <div className="border-t border-surface-border/40 pt-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Calendar size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-emerald-400">
                        Próxima consulta
                      </p>

                      <p className="text-sm font-semibold text-ink-primary">
                        {formatDateDisplay(
                          proximaConsulta.data
                        )}

                        {proximaConsulta.horario &&
                          ` às ${proximaConsulta.horario}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {medico.observacoes && (
                <div className="border-t border-surface-border/40 pt-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <AlertCircle
                      size={14}
                    />
                    Observações
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-ink-primary">
                    {medico.observacoes}
                  </p>
                </div>
              )}

              {hospitaisVinculados.length >
                0 && (
                <div className="border-t border-surface-border/40 pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <Building2
                      size={14}
                      className="text-ice"
                    />
                    Hospitais onde atende
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {hospitaisVinculados.map(
                      (hospital) => (
                        <span
                          key={hospital.id}
                          className="rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1.5 text-xs text-ink-primary"
                        >
                          {hospital.nome}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {locaisVinculados.length >
                0 && (
                <div className="border-t border-surface-border/40 pt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <MapPin
                      size={14}
                      className="text-emerald-400"
                    />
                    Locais de atendimento
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {locaisVinculados.map(
                      (local) => (
                        <span
                          key={local.id}
                          className="rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1.5 text-xs text-ink-primary"
                        >
                          {local.nome}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              ALERTAS
          ================================================== */}

          {possuiAlertas && (
            <motion.div
              variants={{
                initial: {
                  opacity: 0,
                  y: 12,
                },
                animate: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.02,
              }}
              className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-5 shadow-sm"
            >
              <SectionTitle
                icon={
                  <AlertTriangle
                    size={15}
                  />
                }
                title="Alertas Inteligentes"
              />

              <div className="mt-4 space-y-3">

                {alertaSemRetorno && (
                  <div className="flex items-start gap-2 border-b border-amber-400/10 pb-3">
                    <AlertCircle
                      size={14}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />

                    <div>
                      <p className="text-xs font-medium text-ink-primary">
                        Acompanhamento
                      </p>

                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        {alertaSemRetorno}
                      </p>
                    </div>
                  </div>
                )}

                {alertasGerais.ativos
                  .slice(0, 3)
                  .map((med) => (
                    <div
                      key={`ativo-${med.id}`}
                      className="flex items-start gap-2 border-b border-amber-400/10 pb-3"
                    >
                      <AlertCircle
                        size={14}
                        className="mt-0.5 shrink-0 text-amber-400"
                      />

                      <div>
                        <p className="text-xs font-medium text-ink-primary">
                          {med.nome}
                        </p>

                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                          {
                            med.insight
                              ?.mensagem
                          }
                        </p>
                      </div>
                    </div>
                  ))}

                {alertasGerais.vencidos
                  .slice(0, 3)
                  .map((med) => (
                    <div
                      key={`vencida-${med.id}`}
                      className="flex items-start gap-2 border-b border-coral/10 pb-3"
                    >
                      <AlertCircle
                        size={14}
                        className="mt-0.5 shrink-0 text-coral"
                      />

                      <div>
                        <p className="text-xs font-medium text-ink-primary">
                          {med.nome}
                        </p>

                        <p className="mt-0.5 text-xs text-ink-muted">
                          Receita vencida
                          desde{" "}
                          {formatDateDisplay(
                            med.proxima_renovacao
                          )}
                        </p>
                      </div>
                    </div>
                  ))}

                {alertasGerais.comportamentos
                  .slice(0, 3)
                  .map((med) => (
                    <div
                      key={`comportamento-${med.id}`}
                      className="flex items-start gap-2 border-b border-violet-400/10 pb-3 last:border-0 last:pb-0"
                    >
                      <Activity
                        size={14}
                        className="mt-0.5 shrink-0 text-violet-400"
                      />

                      <div>
                        <p className="text-xs font-medium text-ink-primary">
                          {
                            med.comportamento
                              ?.titulo
                          }
                        </p>

                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                          {
                            med.comportamento
                              ?.mensagem
                          }
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* ==================================================
              TRATAMENTOS
          ================================================== */}

          {tratamentos.length > 0 && (
            <motion.div
              variants={{
                initial: {
                  opacity: 0,
                  y: 12,
                },
                animate: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.03,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <FolderHeart
                      size={15}
                    />
                  }
                  title="Tratamentos Relacionados"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {tratamentos.map(
                    (tratamento) => {
                      const color =
                        getTreatmentColor(
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
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              DOCUMENTOS
          ================================================== */}

          {(prescricoes.length > 0 ||
            laudosRelatorios.length > 0) && (
            <motion.div
              variants={{
                initial: {
                  opacity: 0,
                  y: 12,
                },
                animate: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.04,
              }}
              className="space-y-3"
            >
              <SectionTitle
                icon={
                  <FileText size={15} />
                }
                title="Documentos e Prescrições"
              />

              {prescricoes.length > 0 && (
                <DetailCard>
                  <div className="mb-3 flex items-center gap-2">
                    <FileWarning
                      size={16}
                      className="text-amber-400"
                    />

                    <h5 className="text-sm font-medium text-ink-primary">
                      Prescrições
                    </h5>

                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      {prescricoes.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {prescricoes
                      .slice(0, 3)
                      .map((documento) => (
                        <HistoryItem
                          key={documento.id}
                          title={
                            documento.title
                          }
                          subtitle={formatDateDisplay(
                            documento.created_at
                          )}
                          icon={
                            <FileWarning
                              size={15}
                            />
                          }
                          iconClassName="text-amber-400"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );
                            router.push(
                              `/detalhes?id=${documento.id}`
                            );
                          }}
                        />
                      ))}

                    {prescricoes.length >
                      3 && (
                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );
                          router.push(
                            "/documentos?tipo=receita"
                          );
                        }}
                        className="mt-1 w-full rounded-xl bg-ice/10 py-2 text-center text-[10px] font-medium text-ice transition-all active:scale-95"
                      >
                        Ver todas (
                        {
                          prescricoes.length
                        }
                        )
                      </button>
                    )}
                  </div>
                </DetailCard>
              )}

              {laudosRelatorios.length >
                0 && (
                <DetailCard>
                  <div className="mb-3 flex items-center gap-2">
                    <FileText
                      size={16}
                      className="text-ice"
                    />

                    <h5 className="text-sm font-medium text-ink-primary">
                      Laudos e Relatórios
                    </h5>

                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      {
                        laudosRelatorios.length
                      }
                    </span>
                  </div>

                  <div className="space-y-2">
                    {laudosRelatorios
                      .slice(0, 3)
                      .map((documento) => (
                        <HistoryItem
                          key={documento.id}
                          title={
                            documento.title
                          }
                          subtitle={formatDateDisplay(
                            documento.created_at
                          )}
                          icon={
                            <FileText
                              size={15}
                            />
                          }
                          iconClassName="text-ice"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );
                            router.push(
                              `/detalhes?id=${documento.id}`
                            );
                          }}
                        />
                      ))}

                    {laudosRelatorios.length >
                      3 && (
                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );
                          router.push(
                            "/documentos?tipo=laudo"
                          );
                        }}
                        className="mt-1 w-full rounded-xl bg-ice/10 py-2 text-center text-[10px] font-medium text-ice transition-all active:scale-95"
                      >
                        Ver todos (
                        {
                          laudosRelatorios.length
                        }
                        )
                      </button>
                    )}
                  </div>
                </DetailCard>
              )}
            </motion.div>
          )}

          {/* ==================================================
              EXAMES
          ================================================== */}

          {exames.length > 0 && (
            <motion.div
              variants={{
                initial: {
                  opacity: 0,
                  y: 12,
                },
                animate: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.05,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <FlaskConical
                      size={15}
                    />
                  }
                  title="Exames Solicitados"
                />

                <div className="mt-4 space-y-2">
                  {exames
                    .slice(0, 3)
                    .map((exame) => (
                      <HistoryItem
                        key={exame.id}
                        title={exame.nome}
                        subtitle={formatDateDisplay(
                          exame.data
                        )}
                        icon={
                          <FlaskConical
                            size={15}
                          />
                        }
                        iconClassName="text-violet-400"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );
                          router.push(
                            `/saude/exames/detalhes?id=${exame.id}`
                          );
                        }}
                      />
                    ))}

                  {exames.length > 3 && (
                    <p className="pt-1 text-center text-[10px] text-ink-muted">
                      E mais{" "}
                      {exames.length - 3}{" "}
                      registro(s)...
                    </p>
                  )}
                </div>
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              RENOVAÇÕES
          ================================================== */}

          {renovacoes.length > 0 && (
            <motion.div
              variants={{
                initial: {
                  opacity: 0,
                  y: 12,
                },
                animate: {
                  opacity: 1,
                  y: 0,
                },
              }}
              initial="initial"
              animate="animate"
              transition={{
                delay: 0.06,
              }}
            >
              <DetailCard>
                <SectionTitle
                  icon={
                    <FileWarning
                      size={15}
                    />
                  }
                  title="Renovações Emitidas"
                />

                <div className="mt-4 space-y-2">
                  {renovacoes
                    .slice(0, 3)
                    .map((renovacao) => (
                      <div
                        key={renovacao.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-surface-border/40 bg-surface-raised p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-primary">
                            {formatDateDisplay(
                              renovacao.data
                            )}
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                            {renovacao.observacoes ||
                              "Renovação de receita"}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-semibold text-emerald-400">
                          {typeof renovacao.preco ===
                            "number" &&
                          renovacao.preco > 0
                            ? `R$ ${renovacao.preco
                                .toFixed(2)
                                .replace(
                                  ".",
                                  ","
                                )}`
                            : "Gratuito"}
                        </span>
                      </div>
                    ))}
                </div>

                {totalGastoRenovacoes >
                  0 && (
                  <div className="mt-4 flex items-center justify-between border-t border-surface-border/40 pt-3">
                    <span className="text-xs text-ink-muted">
                      Total com renovações
                    </span>

                    <span className="text-xs font-bold text-emerald-400">
                      R${" "}
                      {totalGastoRenovacoes
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                )}
              </DetailCard>
            </motion.div>
          )}

          {/* ==================================================
              HISTÓRICO CLÍNICO
          ================================================== */}

          <motion.div
            variants={{
              initial: {
                opacity: 0,
                y: 12,
              },
              animate: {
                opacity: 1,
                y: 0,
              },
            }}
            initial="initial"
            animate="animate"
            transition={{
              delay: 0.07,
            }}
            className="space-y-4 pt-2"
          >
            <SectionTitle
              icon={
                <Calendar size={15} />
              }
              title="Histórico Clínico"
            />

            <div className="space-y-3">

              {/* CONSULTAS */}

              <DetailCard className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar
                    size={16}
                    className="text-ice"
                  />

                  <h4 className="text-sm font-semibold text-ink-primary">
                    Consultas ({consultas.length})
                  </h4>

                  {ultimaConsulta && (
                    <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                      Última:{" "}
                      {formatDateDisplay(
                        ultimaConsulta.data
                      )}
                    </span>
                  )}
                </div>

                {consultas.length ===
                0 ? (
                  <EmptyHistory>
                    Nenhuma consulta registrada.
                  </EmptyHistory>
                ) : (
                  <div className="mt-3 space-y-2">
                    {consultasOrdenadas
                      .slice(0, 3)
                      .map((consulta) => (
                        <HistoryItem
                          key={consulta.id}
                          title={formatDateDisplay(
                            consulta.data
                          )}
                          subtitle={
                            consulta.status
                              ? consulta.status
                              : undefined
                          }
                          icon={
                            <Calendar
                              size={15}
                            />
                          }
                          iconClassName="text-ice"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );
                            router.push(
                              `/saude/consultas/detalhes?id=${consulta.id}`
                            );
                          }}
                        />
                      ))}

                    {consultas.length >
                      3 && (
                      <p className="pt-1 text-center text-[10px] text-ink-muted">
                        E mais{" "}
                        {consultas.length - 3}{" "}
                        registro(s)...
                      </p>
                    )}
                  </div>
                )}
              </DetailCard>

              {/* CIRURGIAS */}

              <DetailCard className="p-4">
                <div className="flex items-center gap-2">
                  <Activity
                    size={16}
                    className="text-coral"
                  />

                  <h4 className="text-sm font-semibold text-ink-primary">
                    Procedimentos (
                    {cirurgias.length})
                  </h4>
                </div>

                {cirurgias.length ===
                0 ? (
                  <EmptyHistory>
                    Nenhum procedimento registrado.
                  </EmptyHistory>
                ) : (
                  <div className="mt-3 space-y-2">
                    {cirurgiasOrdenadas
                      .slice(0, 3)
                      .map((cirurgia) => (
                        <HistoryItem
                          key={cirurgia.id}
                          title={
                            cirurgia.procedimento
                          }
                          subtitle={formatDateDisplay(
                            cirurgia.data
                          )}
                          icon={
                            <Activity
                              size={15}
                            />
                          }
                          iconClassName="text-coral"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );
                            router.push(
                              `/saude/cirurgias/detalhes?id=${cirurgia.id}`
                            );
                          }}
                        />
                      ))}

                    {cirurgias.length >
                      3 && (
                      <p className="pt-1 text-center text-[10px] text-ink-muted">
                        E mais{" "}
                        {cirurgias.length - 3}{" "}
                        registro(s)...
                      </p>
                    )}
                  </div>
                )}
              </DetailCard>

              {/* MEDICAMENTOS */}

              <DetailCard className="p-4">
                <div className="flex items-center gap-2">
                  <Pill
                    size={16}
                    className="text-emerald-400"
                  />

                  <h4 className="text-sm font-semibold text-ink-primary">
                    Prescrições (
                    {medicamentos.length})
                  </h4>

                  {medicamentosAtivos.length >
                    0 && (
                    <span className="ml-auto rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {
                        medicamentosAtivos.length
                      }{" "}
                      ativos
                    </span>
                  )}
                </div>

                {medicamentos.length ===
                0 ? (
                  <EmptyHistory>
                    Nenhum medicamento prescrito por este médico.
                  </EmptyHistory>
                ) : (
                  <div className="mt-3 space-y-2">
                    {alertasMedicamentos
                      .slice(0, 3)
                      .map((medicamento) => (
                        <button
                          key={medicamento.id}
                          type="button"
                          onClick={() => {
                            trigger(
                              "vibrate"
                            );
                            router.push(
                              `/saude/medicamentos/detalhes?id=${medicamento.id}`
                            );
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface-border/40 bg-surface-raised p-3 text-left transition-all hover:border-emerald-400/30 active:scale-[0.99]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-ink-primary">
                                {
                                  medicamento.nome
                                }
                              </p>

                              {medicamento.insight
                                ?.deveRenovar && (
                                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                  Renovar
                                </span>
                              )}

                              {medicamento.receitaVencida && (
                                <span className="rounded-full bg-coral/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-coral">
                                  Vencida
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-[11px] text-ink-muted">
                              {
                                medicamento.dosagem
                              }
                            </p>
                          </div>

                          <ChevronRight
                            size={14}
                            className="shrink-0 text-ink-faint"
                          />
                        </button>
                      ))}

                    {medicamentos.length >
                      3 && (
                      <p className="pt-1 text-center text-[10px] text-ink-muted">
                        E mais{" "}
                        {medicamentos.length - 3}{" "}
                        registro(s)...
                      </p>
                    )}
                  </div>
                )}
              </DetailCard>
            </div>
          </motion.div>
        </section>

        {/* ====================================================
            MODAL DE EXCLUSÃO
        ==================================================== */}

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() =>
            setShowDeleteModal(false)
          }
          onConfirm={handleDelete}
          title="Excluir Médico"
          message="Tem certeza que deseja excluir este profissional? As consultas e registros vinculados não serão apagados, mas perderão a associação com este nome."
        />
      </main>
    </PageTransition>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function DetalhesMedicoPage() {
  return (
    <Suspense
      fallback={<DetailSkeleton />}
    >
      <DetalhesMedicoContent />
    </Suspense>
  );
}