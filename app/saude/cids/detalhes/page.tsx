// app/saude/cids/detalhes/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
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
  Document,
  Renovacao,
} from "@/lib/types";
import { getCidInsights } from "@/lib/health-insights";
import { getClinicalTheme, formatCurrency } from "@/lib/health-utils";
import { useMounted } from "@/hooks/useMounted";
import { cidsRepository } from "@/lib/repositories/cids";
import {
  SectionTitle,
  DetailInfoRow,
} from "@/components/detail/DetailComponents";

/* ============================================================
   HELPERS
   ============================================================ */

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

/* ============================================================
   CONTEÚDO
   ============================================================ */

function CidDetalhesContent() {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const mounted = useMounted();

  const [cid, setCid] = useState<Cid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);

  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [documentos, setDocumentos] = useState<Document[]>([]);
  const [custoTotal, setCustoTotal] = useState(0);

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

        const tratData = await db.tratamentos.toArray();
        const tratsVinculados = tratData.filter(t => t.cid_ids?.includes(id));
        setTratamentos(tratsVinculados);
        const tratIds = new Set(tratsVinculados.map(t => t.id).filter(Boolean));

        const medsData = await db.medicamentos.toArray();
        const medsVinculados = medsData.filter(m => m.tratamento_ids && m.tratamento_ids.some(tid => tratIds.has(tid)));
        setMedicamentos(medsVinculados);

        const medIdsVinculados = new Set(medsVinculados.map(m => m.id).filter(Boolean));
        if (medIdsVinculados.size > 0) {
          const renovacoesData = await db.renovacoes.toArray();
          const renovacoesDoCid = renovacoesData.filter((r: Renovacao) => medIdsVinculados.has(r.medicamento_id));

          let total = 0;
          renovacoesDoCid.forEach(r => {
            if (typeof r.preco === "number" && r.preco > 0) total += r.preco;
          });
          setCustoTotal(total);
        }

        const medicoIds = new Set(medsVinculados.map(m => m.medico_id).filter(Boolean));
        const medsList = await db.medicos.toArray();
        setMedicos(medsList.filter(med => med.id && medicoIds.has(med.id)));

        const hospIds = new Set(medsVinculados.map(m => m.hospital_id || m.local_id || m.farmacia_id).filter(Boolean));
        const hospList = await db.hospitais.toArray();
        setHospitais(hospList.filter(h => h.id && hospIds.has(h.id)));

        const farmaciaIds = new Set(medsVinculados.map(m => m.farmacia_id).filter(Boolean));
        const farmList = await db.farmacias.toArray();
        setFarmacias(farmList.filter(f => f.id && farmaciaIds.has(f.id)));

        const docsList = await db.documents.toArray();
        setDocumentos(docsList.filter(d => {
          const meta = d.metadata as { cid_id?: string; tratamento_id?: string };
          return meta?.cid_id === id || (meta?.tratamento_id && tratIds.has(meta.tratamento_id));
        }));

      } catch (err) {
        console.error("Erro ao carregar detalhes do CID:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  if (!mounted) return <DetailSkeleton />;

  const handleDelete = async () => {
    trigger("vibrate");
    if (!id) return;
    try {
      await cidsRepository.delete(id);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sync:process"));
      }

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

  const menuOptions = [
    { id: "novo-tratamento", label: "Novo Tratamento", icon: FolderHeart, path: `/saude/tratamentos/novo?cid_id=${id}` },
    { id: "novo-medicamento", label: "Novo Medicamento", icon: Pill, path: `/saude/medicamentos/novo?cid_id=${id}` },
    { id: "novo-laudo", label: "Anexar Laudo", icon: FileText, path: `/saude/documentos/novo?type=laudo&cid_id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

  if (isLoading) return <DetailSkeleton />;
  if (!cid) return null;

  const theme = getClinicalTheme(cid.descricao || cid.codigo);
  const IconComp = theme.icon;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* ====================================================
            HEADER
        ==================================================== */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl flex items-center justify-between pt-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              type="button"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0">
              <p className={`font-mono text-[11px] uppercase tracking-[0.28em] ${theme.textClass}`}>Diagnóstico CID-10</p>
              <h1 className="mt-1 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Condição</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }}
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
              onClick={() => { trigger("vibrate"); router.push(`/saude/cids/editar?id=${cid.id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-all active:scale-95"
              type="button"
              aria-label="Editar CID"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral transition-all active:scale-95"
              type="button"
              aria-label="Excluir CID"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* ====================================================
              HERO
          ==================================================== */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className={`relative overflow-hidden rounded-[32px] border bg-surface p-6 shadow-sm ${theme.borderClass}`}
            style={{ borderLeft: `6px solid ${theme.hex}` }}
          >
            <div className={`absolute -right-4 -top-4 opacity-5 pointer-events-none ${theme.textClass}`}>
              <IconComp size={140} />
            </div>

            <div className="relative z-10 flex items-start gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.borderClass} ${theme.textClass}`}>
                <IconComp size={28} />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${theme.tagClass}`}>
                    {cid.codigo}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-ink-primary leading-tight mt-1.5">{cid.descricao}</h2>
              </div>
            </div>

            {cidInsight && (
              <div className="relative z-10 mt-5 rounded-2xl bg-surface-raised/60 border border-surface-border/50 p-4 space-y-2">
                <div className={`flex items-center gap-2 text-xs font-semibold ${theme.textClass}`}>
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

          {/* ====================================================
              CUSTO
          ==================================================== */}
          {custoTotal > 0 && (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.03 }}
              className="rounded-2xl border border-surface-border/40 bg-surface-raised p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-primary">Custo Estimado do Diagnóstico</p>
                  <p className="text-[11px] text-ink-muted">Soma de compras de medicamentos vinculados</p>
                </div>
              </div>
              <p className="text-base font-bold text-emerald-400">{formatCurrency(custoTotal)}</p>
            </motion.div>
          )}

          {/* ====================================================
              TRATAMENTOS
          ==================================================== */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <SectionTitle icon={<FolderHeart size={15} />} title="Tratamentos Relacionados" />

            {tratamentos.length === 0 ? (
              <div className="rounded-[20px] border border-surface-border/50 bg-surface-raised/40 p-4 text-center">
                <p className="text-xs text-ink-muted">Nenhum tratamento vinculado a este diagnóstico.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tratamentos.map(t => {
                  const tTheme = getClinicalTheme(t.nome);
                  const TIcon = tTheme.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/detalhes?id=${t.id}`); }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-surface-border/50 bg-surface shadow-sm hover:border-ice/30 transition-all active:scale-[0.98]"
                      type="button"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${tTheme.bgClass} ${tTheme.textClass} ${tTheme.borderClass}`}>
                          <TIcon size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-ink-primary">{t.nome}</p>
                          <p className="text-xs text-ink-muted capitalize">{t.status}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-ink-faint" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              MEDICAMENTOS
          ==================================================== */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
            <SectionTitle icon={<Pill size={15} />} title="Medicamentos em Uso" />

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
                    type="button"
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

          {/* ====================================================
              EQUIPE MÉDICA
          ==================================================== */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.15 }} className="space-y-3">
            <SectionTitle icon={<Stethoscope size={15} />} title="Equipe Médica Associada" />

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
                    type="button"
                  >
                    Dr(a). {m.nome}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ====================================================
              LOCAIS E FARMÁCIAS
          ==================================================== */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.2 }} className="space-y-3">
            <SectionTitle icon={<Building2 size={15} />} title="Locais de Atendimento e Farmácias" />

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

          {/* ====================================================
              LAUDOS
          ==================================================== */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.25 }} className="space-y-3">
            <SectionTitle icon={<FileText size={15} />} title="Laudos e Relatórios Vinculados" />

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

export default function CidDetalhesPage() {
  return <Suspense fallback={<DetailSkeleton />}><CidDetalhesContent /></Suspense>;
}