// app/saude/medicamentos/detalhes/page.tsx
"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Pill, Circle, Droplet, Syringe, StickyNote,
  Edit3, Package, Stethoscope, Store,
  FileText, Calendar, Activity, AlertTriangle, DollarSign,
  CheckCircle2, Building2, Info, MapPin, Zap, Clock, TrendingUp,
  LineChart, Check, ExternalLink, Share2, Copy, ChevronDown, ChevronUp,
  Plus, FileWarning, Gift, AlertCircle, Trash2, Phone,
  Award,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { DetailSkeleton } from "@/components/loading/DetailSkeleton";
import { useActivePersonId } from "@/hooks/useActivePersonId";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import type { Medicamento, Tratamento, Renovacao, Cid } from "@/lib/types";
import { useMounted } from "@/hooks/useMounted";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";


function formatDate(isoStr?: string) {
  if (!isoStr) return "—";
  try { return format(new Date(isoStr), "dd MMM yyyy", { locale: ptBR }); }
  catch { return isoStr; }
}

// 🔥 Ícone de comprimido partido alinhado com o cadastro
const SplitPillIcon = ({ size, fill = "currentColor", stroke = "currentColor", strokeWidth = 2 }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={fill} />
    <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
  </svg>
);

// 🔥 Formatos atualizados para evitar bugs de ID no banco
const FORMATOS = [
  { id: "comprimido", label: "Inteiro", icon: Circle },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "capsula", label: "Cápsula", icon: Pill },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

interface HistDosagem { dosagem_antiga: string; data_mudanca: string; medico_responsavel: string; }

function MedicamentoDetalhesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { trigger } = useHapticFeedback();
  const { updateMedicamento, deleteMedicamento } = useMedicamentos();
  const { activePersonId } = useActivePersonId();
  const mounted = useMounted();

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [showAllRenovacoes, setShowAllRenovacoes] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [isMenuFlutuanteOpen, setIsMenuFlutuanteOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const med = useLiveQuery(() => id ? db.medicamentos.get(id) : undefined, [id]);
  const medico = useLiveQuery(() => med?.medico_id ? db.medicos.get(med.medico_id) : undefined, [med?.medico_id]);
  const hospital = useLiveQuery(() => med?.hospital_id ? db.hospitais.get(med.hospital_id) : undefined, [med?.hospital_id]);
  const local = useLiveQuery(() => med?.local_id ? db.locais.get(med.local_id) : undefined, [med?.local_id]);
  const farmacia = useLiveQuery(() => med?.farmacia_id ? db.farmacias.get(med.farmacia_id) : undefined, [med?.farmacia_id]);
  const renovacoes = useLiveQuery(() => db.renovacoes.where("medicamento_id").equals(id || "").reverse().sortBy('data'), [id]) || [];
  const documento = useLiveQuery(() => med?.document_id ? db.documents.get(med.document_id) : undefined, [med?.document_id]);

  const ultimaDose = useLiveQuery(() => db.doseLogs.where('medicamento_id').equals(id || '').reverse().first(), [id]);
  const todosMedicamentosAtivos = useLiveQuery(() => db.medicamentos.where("status").notEqual("descontinuado").toArray(), []) || [];
  const doseLogs = useLiveQuery(() => db.doseLogs.where('medicamento_id').equals(id || '').toArray(), [id]) || [];

  const tratamentos = useLiveQuery(() => {
    if (!med?.tratamento_ids || med.tratamento_ids.length === 0) return [];
    return db.tratamentos.where('id').anyOf(med.tratamento_ids).toArray();
  }, [med?.tratamento_ids]) || [];

  const cids = useLiveQuery(() => {
    if (!med?.cid_ids || med.cid_ids.length === 0) return [];
    return db.cids.where('id').anyOf(med.cid_ids).toArray();
  }, [med?.cid_ids]) || [];

  const farmaciasMap = useLiveQuery(() =>
    db.farmacias.toArray().then(f => new Map(f.map(item => [item.id, item.nome]))),
    []
  ) || new Map<string, string>();

  const melhorFarmacia = useMemo(() => {
    const resultado = analisarMelhorFarmacia(renovacoes);
    return resultado.length > 0 ? resultado[0] : null;
  }, [renovacoes]);

  if (!mounted || med === undefined) return <DetailSkeleton />;
  if (isDeleting || !med) return <div className="min-h-screen bg-void" />;

  const isSOS = med.tipo_uso !== "continuo";
  const estoqueInfo = computeEstoqueInfo(med);
  const qtd = isSOS ? (med.estoque_quantidade ?? 0) : (estoqueInfo?.quantidadeRestante ?? med.estoque_quantidade ?? 0);

  const menuOptions = [
    { id: "nova-renovacao", label: "Nova Renovação", icon: FileWarning, path: `/saude/renovacao/nova?medicamento_id=${id}` },
    { id: "duplicar-medicamento", label: "Duplicar Medicamento", icon: Copy, path: `/saude/medicamentos/novo?duplicar=${id}` },
    { id: "editar-medicamento", label: "Editar Medicamento", icon: Edit3, path: `/saude/medicamentos/editar?id=${id}` },
  ];

  const handleMenuOptionClick = (path: string) => {
    trigger("vibrate");
    setIsMenuFlutuanteOpen(false);
    router.push(path);
  };

    const handleTomarAgora = async () => {
    if (!med || !med.id) return;
    trigger("success");

    const doseGasta = Number(med.estoque_unidade_por_dose) || 1;
    const atual = isSOS ? (med.estoque_quantidade ?? 0) : (estoqueInfo?.quantidadeRestante ?? med.estoque_quantidade ?? 0);

    if (atual <= 0) {
      trigger("error");
      setToastMessage({ text: "Estoque esgotado!", type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const novoEstoque = Math.max(0, atual - doseGasta);
    setToastMessage({ text: "Registrando dose...", type: 'loading' });

    try {
      const now = new Date();
      const hojeISO = now.toISOString().slice(0, 10);
      const horario = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      // 1. Atualiza o estoque do medicamento
      await updateMedicamento(med.id, {
        estoque_quantidade: novoEstoque,
        estoque_data_referencia: hojeISO,
      });

      // 2. Gera o ID único do log e monta o objeto
      const logId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

      const novoLog = {
        id: logId,
        user_id: med.user_id,
        person_id: med.person_id,
        medicamento_id: med.id,
        data: hojeISO,
        horario,
        quantidade: doseGasta,
        created_at: now.toISOString(),
        synced: false,
      };

      // 3. Salva localmente no Dexie e enfileira na syncQueue
      await db.doseLogs.add(novoLog);
      await enfileirarOperacao("doseLogs", "add", novoLog);


      // 4. Dispara o gatilho de sincronização
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sync:process"));
      }

      setToastMessage({ text: `1 dose registrada às ${horario}!`, type: 'success' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error('Erro ao registrar dose:', error);
      trigger("error");
      setToastMessage({ text: "Erro ao registrar dose.", type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDelete = async () => {
    if (!med?.id) return;
    setIsDeleting(true);
    setToastMessage({ text: "Excluindo medicamento...", type: 'loading' });
    try {
      await deleteMedicamento(med.id);
      trigger("success");
      setToastMessage({ text: "Excluído com sucesso!", type: 'success' });
      setTimeout(() => { router.replace("/saude/medicamentos"); }, 400);
    } catch (error) {
      console.error("Erro ao excluir medicamento:", error);
      trigger("error");
      setToastMessage({ text: "Erro ao excluir medicamento.", type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };


  const isVencida = isReceitaVencidaSegura(med.proxima_renovacao);
  const alertaInteligente = sugerirRenovacao(med);
  const diasRestantes = getDaysUntil(med.proxima_renovacao);
  const comportamento = analisarComportamentoUso(med, doseLogs);

  const getEstoqueStyle = () => {
    if (qtd <= 9) return { color: "text-coral animate-pulse font-bold", icon: AlertTriangle, label: "CRÍTICO", bg: "bg-coral/10", border: "border-coral/20" };
    if (qtd <= 14) return { color: "text-amber-400 font-semibold", icon: AlertTriangle, label: "BAIXO", bg: "bg-amber-400/10", border: "border-amber-400/20" };
    return { color: "text-emerald-400 font-bold", icon: CheckCircle2, label: "OK", bg: "bg-emerald-400/10", border: "border-emerald-400/20" };
  };
  const estoqueStatus = getEstoqueStyle();

  const getReceitaBadgeStyle = () => {
    const tipo = med.tipo_receita || 'comum';
    if (tipo === 'amarela') return 'border-amber-400/50 bg-amber-400/10 text-amber-300';
    if (tipo === 'azul') return 'border-blue-400/50 bg-blue-400/10 text-blue-300';
    if (tipo === 'branca') return 'border-zinc-300/50 bg-zinc-300/10 text-zinc-200';
    return 'border-ice/30 bg-ice/5 text-ice';
  };
  const tipoReceitaLabel = TIPO_RECEITA_LABELS[med.tipo_receita as keyof typeof TIPO_RECEITA_LABELS || 'comum'] || med.tipo_receita || 'comum';

  const abrirNoMapa = (enderecoStr?: string) => {
    if (!enderecoStr) return;
    trigger("vibrate");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoStr)}`, "_blank");
  };

  const abrirAnexo = () => {
    if (documento?.attachments?.[0]?.url) {
      trigger("vibrate");
      window.open(documento.attachments[0].url, "_blank");
    }
  };

  const compartilharWhatsApp = () => {
    trigger("vibrate");
    const texto = `*${med.nome}*\nDosagem: ${med.dosagem}\nPróxima renovação: ${formatDate(med.proxima_renovacao)}\nEstoque Atual: ${qtd} doses`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const copiarInfo = () => {
    trigger("vibrate");
    const texto = `${med.nome}\nDosagem: ${med.dosagem}\nPróxima renovação: ${formatDate(med.proxima_renovacao)}\nEstoque: ${qtd} doses`;
    navigator.clipboard.writeText(texto);
    setToastMessage({ text: "Informações copiadas!", type: 'success' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const ligarFarmacia = (telefone?: string) => {
    if (!telefone) return;
    trigger("vibrate");
    window.open(`tel:${telefone}`, "_blank");
  };

  const custoTotalRenovacoes = renovacoes.reduce((acc, r: Renovacao) => {
    const p = typeof r.preco === 'number' ? r.preco : Number(r.preco) || 0;
    return acc + p;
  }, 0);
  const custoTotalAcumulado = custoTotalRenovacoes + Number(med.preco || 0);
  const qtdeCompras = renovacoes.length + (med.preco ? 1 : 0);
  const precoMedio = qtdeCompras > 0 ? (custoTotalAcumulado / qtdeCompras) : 0;

  const ultimaRenovacao = renovacoes.length > 0 ? renovacoes[0] : null;
  const isUltimaRenovacaoGratuita = ultimaRenovacao?.tipo_aquisicao === 'gratuito';

  const outrosMedsDesteMedico = todosMedicamentosAtivos.filter((m: Medicamento) => m.medico_id === med.medico_id && m.id !== med.id);
  const displayedRenovacoes = showAllRenovacoes ? renovacoes : renovacoes.slice(0, 3);

  // 🔥 LÓGICA BLINDADA DO ÍCONE
  const formatoBanco = med.formato?.toLowerCase().trim() || "comprimido";
  const itemFormato = FORMATOS.find(f => f.id === formatoBanco) || FORMATOS[0];
  const SelectedFormatIcon = itemFormato.icon;
  
  const color1 = med.cores && med.cores.length > 0 ? med.cores[0] : "#60A5FA";
  const personAccent = activePersonId ? 'var(--person-accent, #38BDF8)' : '#38BDF8';

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28 relative">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-24 left-5 right-5 z-50 mx-auto max-w-md rounded-2xl bg-surface border border-ice/30 p-4 shadow-vault flex items-center gap-3 backdrop-blur-xl"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toastMessage.type === 'error' ? 'bg-coral/10 text-coral' : 'bg-ice/15 text-ice'}`}>
                {toastMessage.type === 'success' && <Check size={20} />}
                {toastMessage.type === 'loading' && <Activity size={20} className="animate-pulse" />}
                {toastMessage.type === 'error' && <AlertTriangle size={20} />}
              </div>
              <p className="text-sm font-semibold text-ink-primary">{toastMessage.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-4 pb-3 bg-void/90 backdrop-blur-md border-b border-surface-border/40">
          <div className="flex items-center gap-3">
            <button onClick={() => { trigger("vibrate"); router.back(); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border active:scale-95 transition-transform">
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <h2 className="font-semibold text-ink-primary">Prontuário</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copiarInfo} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border active:scale-95 transition-transform text-ink-muted hover:text-ice"><Copy size={18} /></button>
            <button onClick={compartilharWhatsApp} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border active:scale-95 transition-transform text-emerald-400"><Share2 size={18} /></button>

            <div className="relative">
              <button onClick={() => { trigger("vibrate"); setIsMenuFlutuanteOpen(!isMenuFlutuanteOpen); }} className="h-10 w-10 flex items-center justify-center rounded-full border border-ice/20 bg-ice/10 text-ice transition-all active:scale-95 hover:bg-ice/20"><Plus size={18} /></button>
              <AnimatePresence>
                {isMenuFlutuanteOpen && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuFlutuanteOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface shadow-2xl">
                      <div className="px-3 pb-2 pt-3.5"><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">Adicionar</p></div>
                      <div className="px-1.5 pb-2">
                        {menuOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button key={option.id} onClick={() => handleMenuOptionClick(option.path)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:scale-[0.98] hover:bg-ice/8">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice"><Icon size={15} /></div>
                              <span className="text-sm font-medium text-ink-primary">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => { trigger("vibrate"); router.push(`/saude/medicamentos/editar?id=${id}`); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border active:scale-95 transition-transform text-ice"><Edit3 size={18} /></button>
            <button onClick={() => { trigger("vibrate"); setShowDeleteModal(true); }} className="h-10 w-10 flex items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral active:scale-95 transition-transform"><Trash2 size={18} /></button>
          </div>
        </header>

        <div className="px-5 mt-6 space-y-6">

          <AnimatePresence>
            {alertaInteligente.deveRenovar && med.status !== 'descontinuado' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                <div className={`p-4 rounded-2xl border ${alertaInteligente.urgencia === 'alta' ? 'bg-coral/10 border-coral/30' : 'bg-amber-400/10 border-amber-400/30'} flex items-start gap-3`}>
                  <AlertTriangle size={20} className={`mt-0.5 shrink-0 ${alertaInteligente.urgencia === 'alta' ? 'text-coral' : 'text-amber-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${alertaInteligente.urgencia === 'alta' ? 'text-coral' : 'text-amber-400'}`}>Ação Necessária</p>
                      {diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 30 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-void/30 ${alertaInteligente.urgencia === 'alta' ? 'text-coral' : 'text-amber-400'}`}>Faltam {diasRestantes} dias</span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${alertaInteligente.urgencia === 'alta' ? 'text-coral/80' : 'text-amber-400/80'}`}>{alertaInteligente.mensagem}</p>
                  </div>
                  <button onClick={() => router.push(`/saude/renovacao/nova?medicamento_id=${id}`)} className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-transform ${alertaInteligente.urgencia === 'alta' ? 'bg-coral text-void' : 'bg-amber-400 text-void'}`}>
                    Resolver
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {comportamento && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <div className={`p-4 rounded-2xl border ${comportamento.tipo === 'alerta_adesao' ? 'bg-amber-400/10 border-amber-400/30' : 'bg-violet-400/10 border-violet-400/30'} flex items-start gap-3`}>
                <Activity size={20} className={`mt-0.5 shrink-0 ${comportamento.tipo === 'alerta_adesao' ? 'text-amber-400' : 'text-violet-400'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${comportamento.tipo === 'alerta_adesao' ? 'text-amber-400' : 'text-violet-400'}`}>{comportamento.titulo}</p>
                  <p className="text-xs text-ink-muted mt-1">{comportamento.mensagem}</p>
                  <p className="text-[10px] text-ink-faint mt-0.5">Sugestão: {comportamento.acaoSugerida}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="rounded-[32px] bg-surface p-6 border border-surface-border shadow-lg relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${med.status === 'descontinuado' ? 'bg-coral' : med.tipo_receita === 'amarela' ? 'bg-amber-400' : med.tipo_receita === 'azul' ? 'bg-blue-400' : personAccent}`} />

            <div className="flex items-center gap-4 ml-2">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center border border-surface-border shadow-inner" style={{ backgroundColor: color1 + '15' }}>
                 <SelectedFormatIcon size={32} stroke={color1} strokeWidth={2} fill={color1 + '44'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-ink-primary uppercase tracking-wide truncate">{med.nome}</h1>
                  {med.status === 'descontinuado' && <span className="bg-coral/10 text-coral text-[9px] px-2 py-0.5 rounded-full border border-coral/20 font-bold uppercase">Suspenso</span>}
                </div>
                <p className="text-sm font-medium text-ink-muted mt-0.5">{med.dosagem} {med.tipo_uso === 'esporadico' ? '• Uso SOS' : ''}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                   {tratamentos.map((t: Tratamento) => (
                     <span key={t.id} className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-surface-raised border border-surface-border px-2 py-0.5 text-ink-muted">
                       {t.nome}
                     </span>
                   ))}
                </div>
                {cids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cids.map((cid: Cid) => {
                      const theme = getClinicalTheme(cid.descricao || cid.codigo);
                      const Icon = theme.icon;
                      return (
                        <span
                          key={cid.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border ${theme.tagClass}`}
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

          {med.status !== 'descontinuado' && typeof med.estoque_quantidade === 'number' && (
            <div className={`rounded-[32px] border ${estoqueStatus.border} ${estoqueStatus.bg} p-1 shadow-sm`}>
               <div className="bg-surface rounded-[28px] p-5">
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[11px] uppercase tracking-wider text-ink-muted font-bold flex items-center gap-1.5"><Package size={14}/> Estoque Atual</p>
                     <p className={`text-3xl font-display font-bold mt-1 ${estoqueStatus.color}`}>
                       {qtd} <span className="text-base font-medium text-ink-muted uppercase">{med.estoque_unidade_medida || "doses"}</span>
                     </p>
                     {ultimaDose && (
                       <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-ink-muted bg-surface-raised px-2 py-1 rounded-lg border border-surface-border/50 inline-flex">
                         <Clock size={10} className="text-ice" /> Última dose: {formatDate(ultimaDose.data)} às {ultimaDose.horario}
                       </div>
                     )}
                   </div>
                   {qtd > 0 && (
                     <button onClick={handleTomarAgora} className="bg-emerald-500 hover:bg-emerald-600 text-void shadow-lg shadow-emerald-500/20 px-4 py-3 rounded-2xl flex items-center gap-2 font-bold active:scale-95 transition-all">
                       <Zap size={18} fill="currentColor" /> Tomar 1 Dose
                     </button>
                   )}
                 </div>

                 <div className="mt-4 pt-4 border-t border-surface-border/50 flex justify-between items-center text-xs text-ink-muted">
                   <span>Dosagem: <b>{med.estoque_unidade_por_dose || 1} {med.estoque_unidade_medida || "unidade(s)"}</b></span>
                   <span>Última contagem: <b>{formatDate(med.estoque_data_referencia)}</b></span>
                 </div>
               </div>
            </div>
          )}

          {melhorFarmacia && (
            <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/20 p-3 flex items-center gap-2 text-xs">
              <Award size={14} className="text-emerald-400" />
              <span className="text-ink-primary">
                Melhor preço médio: <span className="font-bold text-emerald-400">R$ {melhorFarmacia.media_preco.toFixed(2)}</span>
                {melhorFarmacia.total_compras > 0 && ` (${melhorFarmacia.total_compras} compra${melhorFarmacia.total_compras > 1 ? 's' : ''})`}
              </span>
            </div>
          )}

          {med.historico_dosagens && med.historico_dosagens.length > 0 && (
            <div className="rounded-[28px] border border-surface-border/50 bg-surface p-5 shadow-sm space-y-4">
               <div className="flex items-center gap-2"><TrendingUp size={16} className="text-ice" /><h3 className="text-sm font-semibold text-ink-primary">Evolução Clínica</h3></div>
               <div className="relative border-l-2 border-surface-border ml-3 space-y-5 pb-2">

                 <div className="relative pl-5">
                   <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-surface border-2 border-ice flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-ice" /></div>
                   <p className="text-sm font-bold text-ice">{med.dosagem} <span className="text-[10px] font-normal text-ink-muted ml-1 uppercase">(Atual)</span></p>
                   <p className="text-xs text-ink-muted mt-0.5">Desde a última alteração</p>
                 </div>

                 {[...med.historico_dosagens].reverse().map((hist: HistDosagem, index: number) => (
                   <div key={index} className="relative pl-5 opacity-70">
                     <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-surface border-2 border-surface-border flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-surface-border" /></div>
                     <p className="text-sm font-semibold text-ink-primary line-through decoration-ink-muted/50">{hist.dosagem_antiga}</p>
                     <p className="text-xs text-ink-muted mt-0.5">Alterado em {formatDate(hist.data_mudanca)} por {hist.medico_responsavel}</p>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {custoTotalAcumulado > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-3xl p-4 border border-surface-border shadow-sm">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-1"><LineChart size={14}/><span className="text-[10px] uppercase font-bold tracking-widest">Custo Acumulado</span></div>
                <p className="text-xl font-mono font-bold text-ink-primary mt-1">R$ {custoTotalAcumulado.toFixed(2)}</p>
                <p className="text-[10px] text-ink-muted mt-1">Total investido no histórico</p>
              </div>
              <div className="bg-surface rounded-3xl p-4 border border-surface-border shadow-sm">
                <div className="flex items-center gap-1.5 text-blue-400 mb-1"><DollarSign size={14}/><span className="text-[10px] uppercase font-bold tracking-widest">Preço Médio</span></div>
                <p className="text-xl font-mono font-bold text-ink-primary mt-1">R$ {precoMedio.toFixed(2)}</p>
                <p className="text-[10px] text-ink-muted mt-1">Por caixa/compra ({qtdeCompras})</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
             <h3 className="text-sm font-semibold text-ink-primary">Rede de Prescrição & Aquisição</h3>
             <div className="space-y-2">

               <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-start gap-4">
                 <div className="h-10 w-10 rounded-xl bg-ice/10 flex items-center justify-center text-ice shrink-0"><Stethoscope size={20} /></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-[10px] uppercase text-ink-muted font-bold tracking-wider mb-0.5">Médico Responsável</p>
                   <p className="text-sm font-bold text-ink-primary truncate">{medico?.nome || med.medico || "Não informado"}</p>
                   {outrosMedsDesteMedico.length > 0 && (
                     <p className="text-[10px] text-ice font-medium mt-1 bg-ice/10 inline-block px-2 py-0.5 rounded-md">Prescreve {outrosMedsDesteMedico.length} outros remédios seus.</p>
                   )}
                 </div>
               </div>

               {(hospital || local) && (
                 <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-center justify-between gap-4">
                   <div className="flex items-center gap-4 min-w-0">
                     <div className="h-10 w-10 rounded-xl bg-violet-400/10 flex items-center justify-center text-violet-400 shrink-0"><Building2 size={20} /></div>
                     <div className="min-w-0">
                       <p className="text-[10px] uppercase text-ink-muted font-bold tracking-wider mb-0.5">Unidade / Hospital Emissor</p>
                       <p className="text-sm font-bold text-ink-primary truncate">{hospital?.nome || local?.nome || "Não informado"}</p>
                       {(hospital?.endereco || local?.endereco) && <p className="text-[11px] text-ink-muted truncate mt-0.5">{hospital?.endereco || local?.endereco}</p>}
                     </div>
                   </div>
                   {(hospital?.endereco || local?.endereco) && (
                     <button onClick={() => abrirNoMapa(hospital?.endereco || local?.endereco)} className="p-2.5 rounded-xl bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 active:scale-95 transition-all shrink-0 flex items-center justify-center">
                       <MapPin size={18} />
                     </button>
                   )}
                 </div>
               )}

               {(farmacia || med.farmacia) && (
                 <div className="bg-surface p-4 rounded-2xl border border-surface-border flex items-center justify-between gap-4">
                   <div className="flex items-center gap-4 min-w-0">
                     <div className="h-10 w-10 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400 shrink-0"><Store size={20} /></div>
                     <div className="min-w-0">
                       <p className="text-[10px] uppercase text-ink-muted font-bold tracking-wider mb-0.5">Última Aquisição</p>
                       <p className="text-sm font-bold text-ink-primary truncate">{farmacia?.nome || med.farmacia}</p>
                       {farmacia?.endereco && <p className="text-[11px] text-ink-muted truncate mt-0.5">{farmacia.endereco}</p>}
                     </div>
                   </div>
                   <div className="flex items-center gap-1.5 shrink-0">
                     {farmacia?.telefone && (
                       <button onClick={() => ligarFarmacia(farmacia.telefone)} className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 active:scale-95 transition-all flex items-center justify-center">
                         <Phone size={18} />
                       </button>
                     )}
                     {farmacia?.endereco && (
                       <button onClick={() => abrirNoMapa(farmacia.endereco)} className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 active:scale-95 transition-all flex items-center justify-center">
                         <MapPin size={18} />
                       </button>
                     )}
                   </div>
                 </div>
               )}

               {ultimaRenovacao && isUltimaRenovacaoGratuita && (
                 <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl flex items-center gap-3">
                   <Gift size={16} className="text-emerald-400" />
                   <div className="flex-1 text-xs">
                     <span className="font-medium text-emerald-400">Última renovação gratuita</span>
                     {ultimaRenovacao.data_proxima_retirada && (
                       <p className="text-ink-muted mt-0.5">Próxima retirada: {formatDate(ultimaRenovacao.data_proxima_retirada)}</p>
                     )}
                     {ultimaRenovacao.exige_nova_receita && (
                       <p className="text-amber-400 flex items-center gap-1 mt-0.5">
                         <AlertCircle size={12} /> Levar nova receita na próxima retirada
                       </p>
                     )}
                   </div>
                 </div>
               )}
             </div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-end mb-2">
               <h3 className="text-sm font-semibold text-ink-primary">Status da Receita</h3>
               <button onClick={() => { trigger("vibrate"); setInfoModalOpen(true); }} className="text-[10px] font-bold uppercase text-ink-muted flex items-center gap-1 bg-surface-raised px-2 py-1 rounded-full"><Info size={12}/> Regras</button>
             </div>

             <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${getReceitaBadgeStyle()}`}>
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"><FileText size={14}/> {tipoReceitaLabel}</span>
                 {isVencida ? <span className="text-[10px] bg-coral text-void px-2 py-0.5 rounded-full font-bold uppercase">Vencida</span> : <span className="text-[10px] bg-emerald-500 text-void px-2 py-0.5 rounded-full font-bold uppercase">No Prazo</span>}
               </div>

               <div className="flex items-center justify-between border-t border-current/10 pt-3">
                 <div>
                   <p className="text-[10px] uppercase font-bold opacity-70">Válida até</p>
                   <p className="text-sm font-bold mt-0.5">{formatDate(med.proxima_renovacao)}</p>
                 </div>
                 {documento?.attachments && documento.attachments.length > 0 ? (
                   <button onClick={abrirAnexo} className="flex items-center gap-1.5 bg-current/10 hover:bg-current/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
                     <ExternalLink size={14} /> Ver Anexo
                   </button>
                 ) : (
                   <button onClick={() => router.push(`/saude/medicamentos/editar?id=${id}`)} className="flex items-center gap-1.5 bg-current/10 hover:bg-current/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
                     <Plus size={14} /> Vincular receita
                   </button>
                 )}
               </div>
             </div>

             {renovacoes.length > 0 && (
               <div className="space-y-2 mt-4">
                 <div className="flex items-center justify-between ml-1 mb-2">
                   <p className="text-[10px] uppercase font-bold text-ink-muted tracking-widest">Últimas Compras/Renovações</p>
                   {renovacoes.length > 3 && (
                     <button onClick={() => setShowAllRenovacoes(!showAllRenovacoes)} className="text-[10px] font-bold text-ice flex items-center gap-1 bg-ice/10 px-2 py-0.5 rounded-md">
                       {showAllRenovacoes ? <><ChevronUp size={12}/> Ver menos</> : <><ChevronDown size={12}/> Ver todas ({renovacoes.length})</>}
                     </button>
                   )}
                 </div>
                 <AnimatePresence>
                   {displayedRenovacoes.map((r: Renovacao, index: number) => {
                     const farmaciaNome = r.farmacia_id ? farmaciasMap.get(r.farmacia_id) : null;
                     const isGratuita = r.tipo_aquisicao === 'gratuito';

                     return (
                       <motion.div
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: "auto" }}
                         exit={{ opacity: 0, height: 0 }}
                         key={r.id || index}
                         className={`bg-surface p-3.5 rounded-2xl border shadow-sm ${
                           isGratuita ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-surface-border'
                         }`}
                       >
                         <div className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted">
                               <Calendar size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-ink-primary">{formatDate(r.data || r.created_at)}</p>
                               <div className="flex items-center gap-1.5 mt-0.5">
                                 {farmaciaNome && <p className="text-[10px] text-ink-muted">{farmaciaNome}</p>}
                                 {isGratuita ? (
                                   <span className="text-[8px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                     <Gift size={10} /> Gratuito
                                   </span>
                                 ) : (
                                   <span className="text-[8px] font-bold uppercase bg-ice/10 text-ice px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                     <DollarSign size={10} /> Comprado
                                   </span>
                                 )}
                                 {isGratuita && r.exige_nova_receita && (
                                   <span className="text-[8px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                     <AlertCircle size={10} /> Nova Receita
                                   </span>
                                 )}
                                 {isGratuita && r.data_proxima_retirada && (
                                   <span className="text-[8px] font-bold uppercase bg-ice/10 text-ice px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                     <Calendar size={10} /> Retirada: {formatDate(r.data_proxima_retirada)}
                                   </span>
                                 )}
                               </div>
                             </div>
                           </div>
                           <p className="text-xs text-emerald-400 font-mono font-bold bg-emerald-400/10 px-2 py-1 rounded-lg">
                             {isGratuita ? 'R$ 0,00' : `R$ ${Number(r.preco || 0).toFixed(2)}`}
                           </p>
                         </div>
                       </motion.div>
                     );
                   })}
                 </AnimatePresence>
               </div>
             )}
          </div>

        </div>

        <BottomSheet isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} title="Regulamentação da Receita">
          <div className="p-5 space-y-4 text-sm text-ink-muted">
             <div className="rounded-2xl bg-surface p-4 border border-surface-border space-y-2">
               <p className="font-semibold text-ink-primary text-base">Controle: {tipoReceitaLabel}</p>
               <p className="leading-relaxed">O prazo de validade legal para preenchimento e compra desta prescrição é de até <b>{VALIDADE_RECEITA_DIAS[(med.tipo_receita as keyof typeof VALIDADE_RECEITA_DIAS) || 'comum']} dias</b> contados a partir da data de emissão.</p>
             </div>
             <button onClick={() => { setInfoModalOpen(false); router.push(`/saude/renovacao/nova?medicamento_id=${id}`); }} className="w-full bg-ice text-void font-bold py-3.5 rounded-2xl shadow-lg shadow-ice/20 active:scale-95 transition-transform flex items-center justify-center gap-2">
               <Calendar size={18} /> Registrar Nova Renovação
             </button>
          </div>
        </BottomSheet>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir medicamento"
          message={`Tem certeza que deseja excluir "${med.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          isLoading={isDeleting}
          type="danger"
        />
      </main>
    </PageTransition>
  );
}

export default function DetalhesPage() {
  return <Suspense fallback={<DetailSkeleton />}><MedicamentoDetalhesContent /></Suspense>;
}