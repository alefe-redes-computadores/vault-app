"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, FileWarning, Calendar, DollarSign, ExternalLink, 
  Trash2, Pill, FileText, Edit3, AlertCircle, CheckCircle2, Clock,
  History, ChevronRight
} from "lucide-react";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function DetalhesRenovacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();

  const [renovacao, setRenovacao] = useState<any>(null);
  const [medicamento, setMedicamento] = useState<any>(null);
  const [medico, setMedico] = useState<any>(null);
  const [farmacia, setFarmacia] = useState<any>(null);
  const [historicoRenovacoes, setHistoricoRenovacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push("/saude/renovacao");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await db.renovacoes.get(id);
        if (res) {
          setRenovacao(res);
          
          if (res.medicamento_id) {
            const med = await db.medicamentos.get(res.medicamento_id);
            setMedicamento(med);
            
            // 🔧 Buscar histórico de outras renovações do mesmo medicamento
            const outrasRenovacoes = await db.renovacoes
              .where('medicamento_id')
              .equals(res.medicamento_id)
              .toArray();
            
            // Filtrar a atual e ordenar por data
            const historico = outrasRenovacoes
              .filter(r => r.id !== res.id)
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .slice(0, 5);
            
            setHistoricoRenovacoes(historico);
            
            if (res.medico_id) {
              const doc = await db.medicos.get(res.medico_id);
              setMedico(doc);
            }
            
            if (res.farmacia_id) {
              const farm = await db.farmacias.get(res.farmacia_id);
              setFarmacia(farm);
            }
          }
        } else {
          router.push("/saude/renovacao");
        }
      } catch (error) {
        console.error("Erro ao buscar renovação:", error);
        router.push("/saude/renovacao");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    trigger("vibrate");
    try {
      await db.renovacoes.delete(id!);
      trigger("success");
      router.replace("/saude/renovacao");
    } catch (error) {
      console.error("Erro ao excluir renovação:", error);
      trigger("error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!renovacao) return null;

  const precoFormatado = renovacao.preco 
    ? formatCurrency(renovacao.preco)
    : "SUS / Gratuito";

  const vencida = isReceitaVencidaSegura(renovacao.data);
  const diasRestantes = getDaysUntil(renovacao.data);

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Vault</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold text-ink-primary">Detalhes da Renovação</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/editar?id=${id}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ice transition-all active:scale-95 hover:bg-ice/10"
              aria-label="Editar renovação"
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
          {/* Card Principal */}
          <motion.div 
            variants={fadeUp} 
            initial="initial" 
            animate="animate" 
            className="rounded-[32px] border border-surface-border/50 bg-surface p-6 shadow-sm space-y-4"
            style={{ borderLeft: `6px solid ${vencida ? '#EF4444' : '#38BDF8'}` }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice border border-ice/20">
                <FileWarning size={24} />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-ink-primary truncate">
                    {medicamento?.nome || "Medicamento"}
                  </h2>
                  {/* 🔧 Badge de status */}
                  {vencida ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-coral/20 text-coral px-2 py-0.5 rounded-full border border-coral/30">
                      <AlertCircle size={10} /> Vencida
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      <CheckCircle2 size={10} /> Válida
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-ice mt-0.5">
                  {medicamento?.dosagem || ""}
                </p>
                {medico && (
                  <p className="text-xs text-ink-muted mt-1">
                    <span className="font-medium">Prescrito por:</span> Dr(a). {medico.nome}
                  </p>
                )}
                {farmacia && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    <span className="font-medium">Farmácia:</span> {farmacia.nome}
                  </p>
                )}
              </div>
            </div>

            {/* 🔧 Dias restantes */}
            {diasRestantes !== null && !vencida && (
              <div className="pt-2 border-t border-surface-border/40">
                <div className={`flex items-center gap-2 text-xs ${
                  diasRestantes <= 7 ? 'text-amber-400' : 'text-ink-muted'
                }`}>
                  <Clock size={14} />
                  <span>
                    {diasRestantes <= 7 ? (
                      <span className="font-medium text-amber-400">Atenção!</span>
                    ) : (
                      <span>Faltam</span>
                    )}
                    {' '}{diasRestantes} dias para o vencimento
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-surface-border/40">
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Data da Receita</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-primary font-mono">{formatDateDisplay(renovacao.data)}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-3">
                <p className="text-[10px] uppercase font-mono text-ink-muted">Custo Registrado</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-400">{precoFormatado}</p>
              </div>
            </div>

            {renovacao.observacoes && (
              <div className="pt-2">
                <p className="text-xs font-medium text-ink-muted mb-1">Notas / Observações</p>
                <p className="text-xs text-ink-primary bg-surface-raised p-3 rounded-xl border border-surface-border/40">{renovacao.observacoes}</p>
              </div>
            )}

            {renovacao.anexo_url && (
              <a 
                href={renovacao.anexo_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-ice/20 bg-ice/10 p-3.5 text-ice hover:bg-ice/20 transition-colors mt-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileText size={16} /> Ver Comprovante / Receita Anexada
                </div>
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>

          {/* 🔧 Histórico de outras renovações do mesmo medicamento */}
          {historicoRenovacoes.length > 0 && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <History size={16} className="text-amber-400" />
                <h3 className="font-display text-base font-semibold text-ink-primary">Histórico de Renovações</h3>
                <span className="text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">
                  {historicoRenovacoes.length} anteriores
                </span>
              </div>
              <div className="space-y-2">
                {historicoRenovacoes.map((r: any) => (
                  <div
                    key={r.id}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${r.id}`); }}
                    className="flex items-center justify-between rounded-2xl border border-surface-border/50 bg-surface p-3.5 cursor-pointer hover:border-amber-400/30 transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">{formatDateDisplay(r.data)}</p>
                      {r.preco && (
                        <p className="text-xs text-emerald-400">{formatCurrency(r.preco)}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-ink-faint" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Rede de Apoio */}
          {(medico || farmacia) && (
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ delay: 0.1 }} className="rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Rede de Apoio</h3>
              {medico && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ice/10 text-ice">
                    <Pill size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Médico</p>
                    <p className="text-sm font-semibold text-ink-primary">Dr(a). {medico.nome}</p>
                  </div>
                </div>
              )}
              {farmacia && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                    <DollarSign size={14} />
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Farmácia</p>
                    <p className="text-sm font-semibold text-ink-primary">{farmacia.nome}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </section>

        <ConfirmationModal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)} 
          onConfirm={handleDelete} 
          title="Excluir Registro" 
          message="Tem certeza que deseja excluir este registro de renovação?" 
          isLoading={deleting}
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesRenovacaoPage() {
  return <Suspense fallback={<LoadingSkeleton />}><DetalhesRenovacaoContent /></Suspense>;
}