// app/saude/hospitais/detalhes/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Building2, MapPin, Phone, Edit3, Trash2, 
  Activity, FlaskConical, ExternalLink, Stethoscope, Calendar,
  Clock, Plus,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHospitais } from "@/hooks/useHospitais";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import type { Hospital, Document, Exame, Consulta, Medico, Cirurgia } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function DetalhesHospitalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { getHospital, deleteHospital } = useHospitais();

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const documentos = useLiveQuery(() => db.documents.toArray(), []) || [];
  const exames = useLiveQuery(() => db.exames.toArray(), []) || [];
  const consultas = useLiveQuery(() => db.consultas.toArray(), []) || [];
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const cirurgias = useLiveQuery(() => (id ? db.cirurgias.where("hospital_id").equals(id).toArray() : Promise.resolve([] as Cirurgia[])), [id]) || [];

  useEffect(() => {
    if (!id) {
      router.push("/saude/hospitais");
      return;
    }
    getHospital(id).then((item) => {
      if (item) {
        setHospital(item);
      } else {
        router.push("/saude/hospitais");
      }
      setIsLoading(false);
    });
  }, [id, getHospital, router]);

  const analiseHospital = useMemo(() => {
    if (!id) {
      return { 
        cirurgias: [] as Cirurgia[], 
        exames: [] as Exame[], 
        consultas: [] as Consulta[], 
        medicos: [] as Medico[],
        ultimaConsulta: null as Consulta | null,
      };
    }

    const examesDoHospital = exames.filter((e) => 
      e.local_id === id
    );

    const consultasDoHospital = consultas.filter((c) => c.hospital_id === id);

    const medicoIds = new Set(consultasDoHospital.map((c) => c.medico_id).filter(Boolean));
    const medicosDoHospital = medicos.filter((m) => m.id && medicoIds.has(m.id));

    const ultimaConsulta = consultasDoHospital.length > 0
      ? [...consultasDoHospital].sort((a, b) => b.data.localeCompare(a.data))[0]
      : null;

    return { 
      cirurgias, 
      exames: examesDoHospital, 
      consultas: consultasDoHospital, 
      medicos: medicosDoHospital,
      ultimaConsulta,
    };
  }, [id, exames, consultas, medicos, cirurgias]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteHospital(id!);
      trigger("success");
      router.replace("/saude/hospitais");
    } catch (error) {
      console.error("Erro ao excluir hospital:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const menuOptions = [
    { id: "nova-cirurgia", label: "Nova Cirurgia", icon: Activity, path: `/saude/cirurgias/nova?hospital_id=${id}` },
    { id: "novo-exame", label: "Novo Exame", icon: FlaskConical, path: `/saude/exames/novo?hospital_id=${id}` },
    { id: "nova-consulta", label: "Nova Consulta", icon: Stethoscope, path: `/saude/consultas/nova?hospital_id=${id}` },
    { id: "editar-hospital", label: "Editar Hospital", icon: Edit3, path: `/saude/hospitais/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading) return <DetailSkeleton />;
  if (!hospital) return null;

  const cor = hospital.tipo === 'clinica' ? '#34D399' : '#38BDF8';

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: cor }}>Unidade Clínica</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Unidade</h1>
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
              onClick={() => { trigger("vibrate"); router.push(`/saude/hospitais/editar?id=${hospital.id}`); }}
              aria-label="Editar hospital"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95 hover:text-ice hover:border-ice/30"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              aria-label="Excluir hospital"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-5">
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{ borderLeft: `6px solid ${cor}` }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice border border-ice/20">
                <Building2 size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                  {hospital.nome}
                </h2>
                {hospital.tipo && (
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-1 ${
                    hospital.tipo === 'clinica' 
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                      : 'border-ice/30 bg-ice/10 text-ice'
                  }`}>
                    {hospital.tipo === 'clinica' ? 'Clínica' : 'Hospital'}
                  </span>
                )}
                {hospital.endereco && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="shrink-0 text-ink-faint" /> {hospital.endereco}
                  </p>
                )}
                {hospital.telefone && (
                  <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                    <Phone size={13} className="shrink-0 text-ink-faint" /> {hospital.telefone}
                  </p>
                )}
              </div>
            </div>

            {analiseHospital.ultimaConsulta && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Clock size={14} className={cor === '#38BDF8' ? 'text-ice' : 'text-emerald-400'} />
                  <span>Última consulta: <span className="font-medium text-ink-primary">{formatDateDisplay(analiseHospital.ultimaConsulta.data)}</span></span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Consultas</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{analiseHospital.consultas.length}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Cirurgias</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{analiseHospital.cirurgias.length}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3 text-center">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Exames</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary">{analiseHospital.exames.length}</p>
              </div>
            </div>
          </motion.div>

          {analiseHospital.medicos.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.03 }} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <Stethoscope size={16} className="text-ice" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Médicos que atendem aqui</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {analiseHospital.medicos.map((m) => (
                  <button 
                    key={m.id} 
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/detalhes?id=${m.id}`); }} 
                    className="rounded-full bg-surface border border-surface-border px-4 py-2 text-sm font-medium text-ink-primary shadow-sm hover:border-ice/30 transition-all active:scale-95"
                  >
                    Dr(a). {m.nome}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
              <Activity size={16} className="text-ice" /> Cirurgias ({analiseHospital.cirurgias.length})
            </h3>

            {analiseHospital.cirurgias.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum procedimento registrado nesta unidade.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analiseHospital.cirurgias.map((cir) => (
                  <div
                    key={cir.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/detalhes?id=${cir.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-ice/30 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                        <Activity size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary truncate">{cir.procedimento}</p>
                        <p className="text-[11px] text-ink-muted">{cir.data ? formatDateDisplay(cir.data) : "Data não informada"}</p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
            <h3 className="font-display text-base font-semibold text-ink-primary px-1 flex items-center gap-1.5">
              <FlaskConical size={16} className="text-violet-400" /> Exames Realizados ({analiseHospital.exames.length})
            </h3>

            {analiseHospital.exames.length === 0 ? (
              <div className="rounded-[22px] border border-surface-border/50 bg-surface-raised/50 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum exame vinculado a esta unidade.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analiseHospital.exames.map((exame) => (
                  <div
                    key={exame.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 transition-all active:scale-[0.98] hover:border-violet-400/30 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                        <FlaskConical size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-primary truncate">{exame.nome}</p>
                        <p className="text-[11px] text-ink-muted">{exame.data ? formatDateDisplay(exame.data) : "Data não informada"}</p>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-ink-faint shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir hospital"
          message={`Tem certeza que deseja excluir "${hospital.nome}"?`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={deleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesHospitalPage() {
  return <Suspense fallback={<DetailSkeleton />}><DetalhesHospitalContent /></Suspense>;
}