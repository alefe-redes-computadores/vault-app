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
  User,
  Building2,
  FileWarning,
  FolderHeart,
  AlertCircle,
  AlertTriangle,
  Plus,
  Syringe,
  FileText,
  ExternalLink,
  FlaskConical,
  DollarSign,
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
} from "@/lib/types";
import { useMedicos } from "@/hooks/useMedicos";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { sugerirRenovacao, isReceitaVencidaSegura, analisarComportamentoUso } from "@/lib/health-insights";

function getTreatmentColor(nome: string): string {
  const colors: Record<string, string> = {
    "tdah": "#8B5CF6",
    "ansiedade": "#F59E0B",
    "depressão": "#EF4444",
    "insônia": "#6366F1",
    "enxaqueca": "#8B5CF6",
    "neuropatia": "#EC4899",
    "hipertensão": "#EF4444",
    "colesterol": "#F59E0B",
    "diabetes": "#3B82F6",
    "tireoide": "#8B5CF6",
    "dor crônica": "#EC4899",
    "fibromialgia": "#F472B6",
    "asma": "#06B6D4",
    "dpoc": "#06B6D4",
    "refluxo": "#F59E0B",
    "gastrite": "#F59E0B",
    "transtorno bipolar": "#8B5CF6",
    "esquizofrenia": "#8B5CF6",
    "lúpus": "#EC4899",
    "esclerose múltipla": "#EC4899",
    "artrite reumatoide": "#EC4899",
    "câncer": "#EF4444",
    "obesidade": "#F59E0B",
    "alergia": "#06B6D4",
  };
  const lower = nome.toLowerCase();
  for (const [key, color] of Object.entries(colors)) {
    if (lower.includes(key)) return color;
  }
  return "#38BDF8";
}

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isDateInFuture(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) > new Date();
}

function DetalhesMedicoContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { activePersonId } = useActivePersonId();

  const [medico, setMedico] = useState<Medico | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const { deleteMedico } = useMedicos();

  const consultas = useLiveQuery(
    () => (id ? db.consultas.where("medico_id").equals(id).toArray() : Promise.resolve([] as Consulta[])),
    [id]
  ) || [];
  const cirurgias = useLiveQuery(
    () => (id ? db.cirurgias.where("medico_id").equals(id).toArray() : Promise.resolve([] as Cirurgia[])),
    [id]
  ) || [];
  const medicamentos = useLiveQuery(
    () => (id ? db.medicamentos.where("medico_id").equals(id).toArray() : Promise.resolve([] as Medicamento[])),
    [id]
  ) || [];
  const renovacoes = useLiveQuery(
    () => (id ? db.renovacoes.where("medico_id").equals(id).reverse().sortBy("data") : Promise.resolve([] as Renovacao[])),
    [id]
  ) || [];
  const exames = useLiveQuery(
    () => (id ? db.exames.where("medico_id").equals(id).toArray() : Promise.resolve([] as Exame[])),
    [id]
  ) || [];

  const doseLogs = useLiveQuery(() => {
    const validMedIds = medicamentos.map((m) => m.id).filter(Boolean) as string[];
    if (validMedIds.length === 0) return Promise.resolve([] as DoseLog[]);
    return db.doseLogs.where('medicamento_id').anyOf(validMedIds).toArray();
  }, [medicamentos]) || [];

  const estabelecimentosIds = useMemo(() => {
    const ids = new Set<string>();
    consultas.forEach((c) => c.hospital_id && ids.add(c.hospital_id));
    cirurgias.forEach((c) => c.hospital_id && ids.add(c.hospital_id));
    return Array.from(ids);
  }, [consultas, cirurgias]);

  const estabelecimentos = useLiveQuery(() => {
    if (estabelecimentosIds.length === 0) return Promise.resolve([] as Hospital[]);
    return db.hospitais.where('id').anyOf(estabelecimentosIds).toArray();
  }, [estabelecimentosIds]) || [];

  const tratamentosIds = useMemo(() => {
    const ids = new Set<string>();
    medicamentos.forEach((m) => {
      if (m.tratamento_ids && Array.isArray(m.tratamento_ids)) {
        m.tratamento_ids.forEach((tid) => ids.add(tid));
      }
    });
    return Array.from(ids);
  }, [medicamentos]);

  const tratamentos = useLiveQuery(() => {
    if (tratamentosIds.length === 0) return Promise.resolve([] as Tratamento[]);
    return db.tratamentos.where('id').anyOf(tratamentosIds).toArray();
  }, [tratamentosIds]) || [];

  const proximaConsulta = useMemo(() => {
    const futuras = consultas.filter((c) => isDateInFuture(c.data));
    if (futuras.length === 0) return null;
    return futuras.sort((a, b) => (a.data || "").localeCompare(b.data || ""))[0];
  }, [consultas]);

  const ultimaConsulta = useMemo(() => {
    if (consultas.length === 0) return null;
    return [...consultas].sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0];
  }, [consultas]);

  const alertaSemRetorno = useMemo(() => {
    if (proximaConsulta || !ultimaConsulta || !ultimaConsulta.data) return null;
    const dataUltima = new Date(ultimaConsulta.data).getTime();
    const hoje = new Date().getTime();
    const diffDias = Math.floor((hoje - dataUltima) / (1000 * 3600 * 24));
    if (diffDias > 180) {
      const meses = Math.floor(diffDias / 30);
      return `Faz ${meses} meses desde a sua última consulta. Avalie a necessidade de agendar um acompanhamento.`;
    }
    return null;
  }, [ultimaConsulta, proximaConsulta]);

  const alertasMedicamentos = useMemo(() => {
    return medicamentos.map((med) => {
      const insight = sugerirRenovacao(med);
      const receitaVencida = isReceitaVencidaSegura(med.proxima_renovacao);
      const comportamento = analisarComportamentoUso(med, doseLogs.filter((d) => d.medicamento_id === med.id));
      return { ...med, insight, receitaVencida, comportamento };
    });
  }, [medicamentos, doseLogs]);

  const alertasGerais = useMemo(() => {
    const ativos = alertasMedicamentos.filter((m) => m.insight?.deveRenovar);
    const vencidos = alertasMedicamentos.filter((m) => m.receitaVencida);
    const comportamentos = alertasMedicamentos.filter((m) => m.comportamento);
    return { ativos, vencidos, comportamentos };
  }, [alertasMedicamentos]);

  const totalGastoRenovacoes = useMemo(() => {
    return renovacoes.reduce((acc, r) => {
      const preco = typeof r.preco === "number" ? r.preco : Number(r.preco) || 0;
      return acc + preco;
    }, 0);
  }, [renovacoes]);

  const menuOptions = [
    { id: "nova-consulta", label: "Nova Consulta", icon: Stethoscope, path: `/saude/consultas/nova?medico_id=${id}` },
    { id: "nova-cirurgia", label: "Nova Cirurgia", icon: Syringe, path: `/saude/cirurgias/nova?medico_id=${id}` },
    { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: `/saude/medicamentos/novo?medico_id=${id}` },
    { id: "editar-medico", label: "Editar Médico", icon: Edit3, path: `/saude/medicos/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  useEffect(() => {
    if (!id) {
      router.push("/saude/medicos");
      return;
    }
    db.medicos.get(id).then((medData) => {
      if (medData) {
        setMedico(medData);
      } else {
        router.push("/saude/medicos");
      }
      setIsLoading(false);
    });
  }, [id, router]);

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await deleteMedico(id);
      trigger("success");
      router.replace("/saude/medicos");
    } catch (error) {
      console.error("Erro ao excluir médico:", error);
      trigger("error");
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!medico) return null;

  const medicamentosAtivos = medicamentos.filter((m) => m.status === "ativo");

  // Separando documentos de prescrições e laudos
  const documentosDoMedico = useLiveQuery(
    () => (id ? db.documents.where("medico_id").equals(id).reverse().sortBy("created_at") : Promise.resolve([] as Document[])),
    [id]
  ) || [];

  const prescricoes = documentosDoMedico.filter((doc) => doc.type === "receita");
  const laudosRelatorios = documentosDoMedico.filter((doc) => doc.type === "laudo" || doc.type === "encaminhamento" || doc.type === "exame_imagem" || doc.type === "exame_sangue");

  const hospitaisVinculados = useLiveQuery(() => {
    if (!medico?.hospital_ids || medico.hospital_ids.length === 0) return Promise.resolve([] as Hospital[]);
    return db.hospitais.where('id').anyOf(medico.hospital_ids).toArray();
  }, [medico?.hospital_ids]) || [];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Profissional</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Perfil Médico</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"
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
                      onClick={() => setIsMenuFlutuanteOpen(false)}
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl"
                    >
                      <div className="px-3 pb-2 pt-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">Adicionar</p>
                      </div>
                      <div className="px-1.5 pb-2">
                        {menuOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.id}
                              onClick={() => handleMenuOptionClick(option.path)}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8"
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
              onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/editar?id=${medico.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-ice hover:border-ice/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          <motion.div
            variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }}
            initial="initial"
            animate="animate"
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{
              borderLeft: `6px solid ${activePersonId ? 'var(--person-accent, #38BDF8)' : '#38BDF8'}`
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice border border-ice/20">
                <User size={28} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  Dr(a). {medico.nome}
                </h2>
                <p className="text-sm font-medium text-ice mt-0.5">
                  {medico.especialidade || "Especialidade Geral"}
                </p>
                {medico.crm && (
                  <p className="text-xs text-ink-muted font-mono mt-1">
                    CRM: {medico.crm}
                  </p>
                )}
              </div>
            </div>

            {(medico.telefone || medico.email) && (
              <div className="pt-4 border-t border-surface-border/40 space-y-3">
                {medico.telefone && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-ink-muted">
                      <Phone size={14} />
                    </div>
                    <span className="text-sm font-medium text-ink-primary">{medico.telefone}</span>
                  </div>
                )}
                {medico.email && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-ink-muted">
                      <Mail size={14} />
                    </div>
                    <span className="text-sm font-medium text-ink-primary truncate">{medico.email}</span>
                  </div>
                )}
              </div>
            )}

            {proximaConsulta && (
              <div className="pt-4 border-t border-surface-border/40">
                <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/20 p-3 flex items-center gap-3">
                  <Calendar size={16} className="text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-emerald-400">Próxima consulta</p>
                    <p className="text-sm font-semibold text-ink-primary">
                      {formatDateDisplay(proximaConsulta.data)}
                      {proximaConsulta.horario && ` às ${proximaConsulta.horario}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {medico.observacoes && (
              <div className="pt-4 border-t border-surface-border/40">
                <p className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                  <AlertCircle size={14} /> Observações
                </p>
                <p className="text-sm text-ink-primary mt-1">{medico.observacoes}</p>
              </div>
            )}

            {hospitaisVinculados.length > 0 && (
              <div className="pt-4 border-t border-surface-border/40">
                <p className="text-xs font-medium text-ink-muted mb-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-ice" /> Atende em:
                </p>
                <div className="flex flex-wrap gap-2">
                  {hospitaisVinculados.map((h) => (
                    <span key={h.id} className="text-xs bg-surface-raised border border-surface-border/40 px-3 py-1.5 rounded-full text-ink-primary">
                      {h.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {(alertasGerais.ativos.length > 0 || alertasGerais.vencidos.length > 0 || alertasGerais.comportamentos.length > 0 || alertaSemRetorno) && (
            <motion.div
              variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.02 }}
              className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Alertas Inteligentes</h4>
              </div>

              <div className="space-y-2">
                {alertaSemRetorno && (
                  <div className="flex items-start gap-2 text-xs border-b border-amber-400/10 pb-2 last:border-0">
                    <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-ink-primary">Acompanhamento</p>
                      <p className="text-ink-muted">{alertaSemRetorno}</p>
                    </div>
                  </div>
                )}

                {alertasGerais.ativos.slice(0, 3).map((med) => (
                  <div key={med.id} className="flex items-start gap-2 text-xs border-b border-amber-400/10 pb-2 last:border-0">
                    <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-ink-primary">{med.nome}</p>
                      <p className="text-ink-muted">{med.insight?.mensagem}</p>
                    </div>
                  </div>
                ))}

                {alertasGerais.vencidos.slice(0, 3).map((med) => (
                  <div key={med.id} className="flex items-start gap-2 text-xs border-b border-coral/10 pb-2 last:border-0">
                    <AlertCircle size={14} className="text-coral shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-ink-primary">{med.nome}</p>
                      <p className="text-ink-muted">Receita vencida desde {formatDateDisplay(med.proxima_renovacao)}</p>
                    </div>
                  </div>
                ))}

                {alertasGerais.comportamentos.slice(0, 3).map((med) => (
                  <div key={med.id} className="flex items-start gap-2 text-xs border-b border-violet-400/10 pb-2 last:border-0">
                    <Activity size={14} className="text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-ink-primary">{med.comportamento?.titulo}</p>
                      <p className="text-ink-muted">{med.comportamento?.mensagem}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tratamentos.length > 0 && (
            <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FolderHeart size={16} className="text-violet-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Tratamentos Relacionados</h4>
                <span className="ml-auto text-[10px] font-medium text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">{tratamentos.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tratamentos.map((t) => {
                  const color = getTreatmentColor(t.nome);
                  return (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border"
                      style={{
                        backgroundColor: `${color}20`,
                        borderColor: `${color}40`,
                        color: color,
                      }}
                    >
                      <Activity size={10} /> {t.nome}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          )}

          {(prescricoes.length > 0 || laudosRelatorios.length > 0) && (
            <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} initial="initial" animate="animate" transition={{ delay: 0.04 }} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <FileText size={16} className="text-ice" />
                <h4 className="text-sm font-semibold text-ink-primary">Documentos e Prescrições</h4>
              </div>

              {prescricoes.length > 0 && (
                <div className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileWarning size={16} className="text-amber-400" />
                    <h5 className="text-sm font-medium text-ink-primary">Prescrições</h5>
                    <span className="ml-auto text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">{prescricoes.length}</span>
                  </div>
                  <div className="space-y-2">
                    {prescricoes.slice(0, 3).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => { trigger("vibrate"); router.push(`/detalhes?id=${doc.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-amber-400/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-primary truncate">{doc.title}</p>
                          <p className="text-[11px] text-ink-muted">{formatDateDisplay(doc.created_at)}</p>
                        </div>
                        <ChevronRight size={14} className="text-ink-faint" />
                      </div>
                    ))}
                    {prescricoes.length > 3 && (
                      <button
                        onClick={() => { trigger("vibrate"); router.push("/documentos?tipo=receita"); }}
                        className="w-full text-center text-[10px] font-medium text-ice bg-ice/10 py-2 rounded-xl mt-1 active:scale-95 transition-all"
                      >
                        Ver todas ({prescricoes.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {laudosRelatorios.length > 0 && (
                <div className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-ice" />
                    <h5 className="text-sm font-medium text-ink-primary">Laudos e Relatórios</h5>
                    <span className="ml-auto text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">{laudosRelatorios.length}</span>
                  </div>
                  <div className="space-y-2">
                    {laudosRelatorios.slice(0, 3).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => { trigger("vibrate"); router.push(`/detalhes?id=${doc.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-ice/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-primary truncate">{doc.title}</p>
                          <p className="text-[11px] text-ink-muted">{formatDateDisplay(doc.created_at)}</p>
                        </div>
                        <ChevronRight size={14} className="text-ink-faint" />
                      </div>
                    ))}
                    {laudosRelatorios.length > 3 && (
                      <button
                        onClick={() => { trigger("vibrate"); router.push("/documentos?tipo=laudo"); }}
                        className="w-full text-center text-[10px] font-medium text-ice bg-ice/10 py-2 rounded-xl mt-1 active:scale-95 transition-all"
                      >
                        Ver todos ({laudosRelatorios.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* EXAMES SOLICITADOS */}
          {exames.length > 0 && (
            <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={16} className="text-violet-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Exames Solicitados</h4>
                <span className="ml-auto text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">{exames.length}</span>
              </div>
              <div className="space-y-2">
                {exames.slice(0, 3).map((exame) => (
                  <div
                    key={exame.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                    className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-violet-400/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">{exame.nome}</p>
                      <p className="text-[11px] text-ink-muted">{formatDateDisplay(exame.data)}</p>
                    </div>
                    <ChevronRight size={14} className="text-ink-faint" />
                  </div>
                ))}
                {exames.length > 3 && (
                  <p className="text-[10px] text-center text-ink-muted pt-1">E mais {exames.length - 3} registro(s)...</p>
                )}
              </div>
            </motion.div>
          )}

          {/* RENOVAÇÕES */}
          {renovacoes.length > 0 && (
            <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} initial="initial" animate="animate" transition={{ delay: 0.06 }} className="rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileWarning size={16} className="text-amber-400" />
                <h4 className="text-sm font-semibold text-ink-primary">Renovações Emitidas</h4>
                <span className="ml-auto text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">{renovacoes.length}</span>
              </div>
              <div className="space-y-2">
                {renovacoes.slice(0, 3).map((ren) => (
                  <div key={ren.id} className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary">{formatDateDisplay(ren.data)}</p>
                      <p className="text-[11px] text-ink-muted">{ren.observacoes || "Renovação de receita"}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">
                      {typeof ren.preco === "number" && ren.preco > 0 ? `R$ ${ren.preco.toFixed(2).replace(".", ",")}` : "Gratuito"}
                    </span>
                  </div>
                ))}
              </div>
              {totalGastoRenovacoes > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-border/40 flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Total com renovações</span>
                  <span className="text-xs font-bold text-emerald-400">R$ {totalGastoRenovacoes.toFixed(2).replace(".", ",")}</span>
                </div>
              )}
            </motion.div>
          )}

          <motion.div variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} initial="initial" animate="animate" transition={{ delay: 0.07 }} className="space-y-4 pt-2">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1">Histórico Clínico</h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-ice" />
                  <h4 className="text-sm font-semibold text-ink-primary">Consultas ({consultas.length})</h4>
                  {ultimaConsulta && (
                    <span className="ml-auto text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">
                      Última: {formatDateDisplay(ultimaConsulta.data)}
                    </span>
                  )}
                </div>
                {consultas.length === 0 ? (
                  <p className="text-xs text-ink-muted py-1">Nenhuma consulta registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {[...consultas].sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 3).map((con) => (
                      <div
                        key={con.id}
                        onClick={() => { trigger("vibrate"); router.push(`/saude/consultas/detalhes?id=${con.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-ice/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-primary font-mono">{formatDateDisplay(con.data)}</p>
                          <p className="text-[11px] text-ink-muted capitalize">{con.status}</p>
                        </div>
                        <ChevronRight size={14} className="text-ink-faint" />
                      </div>
                    ))}
                    {consultas.length > 3 && (
                      <p className="text-[10px] text-center text-ink-muted pt-1">E mais {consultas.length - 3} registro(s)...</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-coral" />
                  <h4 className="text-sm font-semibold text-ink-primary">Procedimentos ({cirurgias.length})</h4>
                </div>
                {cirurgias.length === 0 ? (
                  <p className="text-xs text-ink-muted py-1">Nenhum procedimento registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {[...cirurgias].sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 3).map((cir) => (
                      <div
                        key={cir.id}
                        onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/detalhes?id=${cir.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-coral/30 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{cir.procedimento}</p>
                          <p className="text-[11px] text-ink-muted">{formatDateDisplay(cir.data)}</p>
                        </div>
                        <ChevronRight size={14} className="text-ink-faint" />
                      </div>
                    ))}
                    {cirurgias.length > 3 && (
                      <p className="text-[10px] text-center text-ink-muted pt-1">E mais {cirurgias.length - 3} registro(s)...</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Pill size={16} className="text-emerald-400" />
                  <h4 className="text-sm font-semibold text-ink-primary">Prescrições ({medicamentos.length})</h4>
                  {medicamentosAtivos.length > 0 && (
                    <span className="ml-auto text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      {medicamentosAtivos.length} ativos
                    </span>
                  )}
                </div>
                {medicamentos.length === 0 ? (
                  <p className="text-xs text-ink-muted py-1">Nenhum medicamento prescrito por este médico.</p>
                ) : (
                  <div className="space-y-2">
                    {alertasMedicamentos.slice(0, 3).map((med) => (
                      <div
                        key={med.id}
                        onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${med.id}`); }}
                        className="flex items-center justify-between rounded-xl bg-surface-raised p-3 border border-surface-border/40 cursor-pointer hover:border-emerald-400/30 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-ink-primary">{med.nome}</p>
                            {med.insight?.deveRenovar && (
                              <span className="text-[8px] font-bold uppercase bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                                Renovar
                              </span>
                            )}
                            {med.receitaVencida && (
                              <span className="text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                                Vencida
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted">{med.dosagem}</p>
                        </div>
                        <ChevronRight size={14} className="text-ink-faint" />
                      </div>
                    ))}
                    {medicamentos.length > 3 && (
                      <p className="text-[10px] text-center text-ink-muted pt-1">E mais {medicamentos.length - 3} registro(s)...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Médico"
          message="Tem certeza que deseja excluir este profissional? As consultas e registros vinculados não serão apagados, mas perderão a associação com este nome."
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesMedicoPage() {
  return <Suspense fallback={<DetailSkeleton />}><DetalhesMedicoContent /></Suspense>;
}