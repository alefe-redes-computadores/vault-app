"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Brain, 
  Flame, 
  HeartPulse, 
  ShieldAlert, 
  Activity, 
  Edit3, 
  FolderHeart, 
  Pill, 
  Stethoscope, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  MapPin
} from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { Cid, Tratamento, Medicamento, Medico, Hospital, Farmacia, Document } from "@/lib/types";
import { getCidInsights } from "@/lib/health-insights";

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

function getCidIcon(codigo: string, descricao: string) {
  const text = `${codigo} ${descricao}`.toLowerCase();
  if (text.includes("f9") || text.includes("f3") || text.includes("neuro") || text.includes("transtorno")) return Brain;
  if (text.includes("dor") || text.includes("inflama") || text.includes("m5")) return Flame;
  if (text.includes("cardio") || text.includes("corac") || text.includes("i10")) return HeartPulse;
  if (text.includes("ansied") || text.includes("f4")) return ShieldAlert;
  return Activity;
}

const CORES_CID = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"];
function getCorPorIndex(index: number): string {
  return CORES_CID[index % CORES_CID.length];
}

function CidDetalhesContent() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [cid, setCid] = useState<Cid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Estados de dados cruzados completos
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [documentos, setDocumentos] = useState<Document[]>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!id) {
      router.push("/saude/cids");
      return;
    }

    const fetchData = async () => {
      try {
        const cidData = await db.cids.get(id);
        if (!cidData) {
          router.push("/saude/cids");
          return;
        }
        setCid(cidData);

        // 1. Tratamentos
        const tratData = await db.tratamentos.where("cid_id").equals(id).toArray();
        setTratamentos(tratData);
        const tratIds = new Set(tratData.map(t => t.id).filter(Boolean));

        // 2. Medicamentos
        const medsData = await db.medicamentos.toArray();
        const medsVinculados = medsData.filter(m => {
          if (m.tratamento_ids && m.tratamento_ids.some(tid => tratIds.has(tid))) return true;
          return false;
        });
        setMedicamentos(medsVinculados);

        // 3. Médicos
        const medicoIds = new Set(medsVinculados.map(m => m.medico_id).filter(Boolean));
        const medsList = await db.medicos.toArray();
        setMedicos(medsList.filter(med => med.id && medicoIds.has(med.id)));

        // 4. Locais / Hospitais (Acompanhamento)
        const hospIds = new Set(medsVinculados.map(m => m.estabelecimento_id || m.farmacia_id).filter(Boolean));
        const hospList = await db.hospitais.toArray();
        setHospitais(hospList.filter(h => h.id && hospIds.has(h.id)));

        // 5. Farmácias (Onde compra)
        const farmaciaIds = new Set(medsVinculados.map(m => m.farmacia_id).filter(Boolean));
        const farmList = await db.farmacias.toArray();
        setFarmacias(farmList.filter(f => f.id && farmaciaIds.has(f.id)));

        // 6. Laudos / Anexos
        const docsList = await db.documents.toArray();
        setDocumentos(docsList.filter(d => d.metadata?.cid_id === id || (d.metadata?.tratamento_id && tratIds.has(d.metadata.tratamento_id))));

      } catch (err) {
        console.error("Erro ao carregar detalhes do CID:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await db.cids.delete(id);
      trigger("success");
      showToast("Diagnóstico removido com sucesso.");
      setTimeout(() => router.replace("/saude/cids"), 800);
    } catch {
      trigger("error");
      showToast("Erro ao excluir diagnóstico.", "error");
    }
  };

  const cidInsight = useMemo(() => {
    if (!cid) return null;
    return getCidInsights(cid.codigo);
  }, [cid]);

  if (isLoading) return <LoadingSkeleton />;
  if (!cid) return null;

  const IconComp = getCidIcon(cid.codigo, cid.descricao);
  const cidCor = getCorPorIndex(cid.id ? parseInt(cid.id, 36) : 0);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between pt-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: cidCor }}>Diagnóstico CID-10</p>
              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Condição</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/cids/editar?id=${cid.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
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

        <section className="px-5 pt-6 space-y-6">
          {/* Card Principal */}
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm"
            style={{ 
              borderColor: `${cidCor}40`,
              borderLeft: `6px solid ${cidCor}` 
            }}
          >
            <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
              <IconComp size={140} />
            </div>

            <div className="relative z-10 flex items-start gap-4">
              <div 
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm border"
                style={{ backgroundColor: `${cidCor}15`, borderColor: `${cidCor}30`, color: cidCor }}
              >
                <IconComp size={28} />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-surface-raised border border-surface-border" style={{ color: cidCor }}>
                    {cid.codigo}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-ink-primary leading-tight mt-1.5">{cid.descricao}</h2>
              </div>
            </div>

            {cidInsight && (
              <div className="relative z-10 mt-5 rounded-2xl bg-surface-raised/60 border border-surface-border/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: cidCor }}>
                  <Sparkles size={14} />
                  <span>Categoria: {cidInsight.categoria}</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  <strong>Alerta Clínico:</strong> {cidInsight.alertaClinico}
                </p>
                {cidInsight.tratamentosSugeridos?.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {cidInsight.tratamentosSugeridos.map((t, idx) => (
                      <span key={idx} className="text-[10px] bg-surface border border-surface-border px-2 py-0.5 rounded-full text-ink-muted">
                        • {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-surface-border/50 pt-5 text-center">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Tratamentos</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{tratamentos.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Medicamentos</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{medicamentos.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-muted">Laudos</span>
                <span className="font-mono text-xl font-semibold text-ink-primary mt-0.5">{documentos.length}</span>
              </div>
            </div>
          </motion.div>

          {/* Tratamentos Relacionados */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <FolderHeart size={16} className="text-violet-400" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Tratamentos Relacionados</h3>
            </div>
            {tratamentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum tratamento vinculado a este diagnóstico.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tratamentos.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/detalhes?id=${t.id}`); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-surface-border/50 bg-surface shadow-sm hover:border-ice/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 rounded-xl bg-violet-400/10 flex items-center justify-center text-violet-400">
                        <FolderHeart size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink-primary">{t.nome}</p>
                        <p className="text-xs text-ink-muted capitalize">{t.status}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-ink-faint" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Medicamentos em Uso */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Pill size={16} className="text-ice" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Medicamentos em Uso</h3>
            </div>
            {medicamentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum medicamento associado a este CID.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {medicamentos.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/detalhes?id=${m.id}`); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-surface-border/50 bg-surface shadow-sm hover:border-ice/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 rounded-xl bg-ice/10 flex items-center justify-center text-ice">
                        <Pill size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink-primary">{m.nome}</p>
                        <p className="text-xs text-ink-muted">{m.dosagem} • Dr(a). {m.medico}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-ink-faint" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Equipe Médica Associada */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Stethoscope size={16} className="text-ice" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Equipe Médica Associada</h3>
            </div>
            {medicos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum médico vinculado aos tratamentos desta condição.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {medicos.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/detalhes?id=${m.id}`); }}
                    className="rounded-full bg-surface border border-surface-border px-4 py-2 text-sm font-medium text-ink-primary shadow-sm hover:border-ice/30 transition-all active:scale-95"
                  >
                    Dr(a). {m.nome}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Locais de Acompanhamento / Hospitais / Farmácias Cruzadas */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <Building2 size={16} className="text-amber-400" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Locais de Atendimento e Farmácias</h3>
            </div>
            {hospitais.length === 0 && farmacias.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum local ou farmácia cruzada para este CID.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hospitais.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-surface-border/50 bg-surface text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink-primary">{h.nome}</p>
                        {h.endereco && <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5"><MapPin size={10} />{h.endereco}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {farmacias.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-surface-border/50 bg-surface text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                        <Pill size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-ink-primary">{f.nome} (Farmácia)</p>
                        {f.endereco && <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5"><MapPin size={10} />{f.endereco}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Laudos e Documentos Anexados */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.25 }} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <FileText size={16} className="text-emerald-400" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Laudos e Relatórios Vinculados</h3>
            </div>
            {documentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum laudo ou relatório anexado a este CID.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentos.map(doc => (
                  <div key={doc.id} className="p-4 rounded-2xl border border-surface-border/50 bg-surface flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-ink-primary">{doc.title}</p>
                      <p className="text-xs text-ink-muted capitalize">{doc.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>

        {/* MODAL DE EXCLUSÃO */}
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="w-full max-w-sm rounded-[28px] border border-surface-border bg-surface p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center gap-3 text-coral">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/10">
                    <Trash2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink-primary">Excluir CID</h3>
                    <p className="text-xs text-ink-muted">Ação permanente</p>
                  </div>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Tem certeza que deseja remover este diagnóstico da base? Os tratamentos associados não serão apagados, mas perderão a referência de CID.
                </p>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 rounded-2xl border border-surface-border/50 bg-surface-raised py-3 text-xs font-semibold text-ink-primary active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 rounded-2xl bg-coral py-3 text-xs font-semibold text-void active:scale-95 transition-all shadow-md shadow-coral/20"
                  >
                    Sim, excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* TOAST */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 inset-x-5 z-50 mx-auto max-w-sm flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-2xl"
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={20} className="text-coral shrink-0" />
              )}
              <p className="text-xs font-medium text-ink-primary flex-1">{toastMessage.text}</p>
              <button onClick={() => setToastMessage(null)} className="text-ink-muted hover:text-ink-primary">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}

export default function CidDetalhesPage() {
  return <Suspense fallback={<LoadingSkeleton />}><CidDetalhesContent /></Suspense>;
}
