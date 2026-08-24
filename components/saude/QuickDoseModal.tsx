// components/saude/QuickDoseModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Zap, Search, Pill, Circle, Droplet, Syringe, StickyNote, AlertTriangle } from "lucide-react";
import { db, safeUpdateMedicamento } from "@/lib/db";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { getLocalTodayISO } from "@/lib/health-utils";
import { analisarComportamentoUso } from "@/lib/health-insights";
import type { Medicamento } from "@/lib/types";

interface QuickDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMedicamentoId?: string; // Se passado, trava no remédio específico (vindo de listagem/detalhes)
  onSuccess?: () => void;
}

const MOTIVOS_SUGERIDOS = [
  { label: "😰 Ansiedade", value: "Ansiedade" },
  { label: "😴 Insônia", value: "Insônia" },
  { label: "😣 Dor", value: "Dor" },
  { label: "🤒 Febre", value: "Febre" },
  { label: "🤢 Enjoo", value: "Enjoo" },
  { label: "🛡️ Prevenção", value: "Prevenção" },
  { label: "🚨 S.O.S", value: "S.O.S" },
];

function handleTimeMask(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (clean.length > 2) return `${clean.slice(0, 2)}:${clean.slice(2)}`;
  return clean;
}

const SplitPillIcon = ({ size, fill = "currentColor" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={fill} />
    <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
  </svg>
);

function getMedicineIcon(formato?: string) {
  const f = formato?.toLowerCase().trim();
  if (f === 'partido') return SplitPillIcon;
  if (f === 'gota') return Droplet;
  if (f === 'injecao') return Syringe;
  if (f === 'adesivo') return StickyNote;
  if (f === 'comprimido') return Circle;
  return Pill;
}

export function QuickDoseModal({ isOpen, onClose, preselectedMedicamentoId, onSuccess }: QuickDoseModalProps) {
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const { medicamentos: rawMedicamentos } = useMedicamentos();
  const { activePersonId } = useActivePersonId();

  const medicamentosAtivos = useMemo(() => {
    if (!rawMedicamentos) return [];
    return rawMedicamentos.filter((m: Medicamento) => m.status !== "descontinuado" && (!activePersonId || !m.person_id || m.person_id === activePersonId));
  }, [rawMedicamentos, activePersonId]);

  const [doseMedId, setDoseMedId] = useState("");
  const [doseQtd, setDoseQtd] = useState(1);
  const [doseHora, setDoseHora] = useState("");
  const [doseMotivo, setDoseMotivo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedMed = medicamentosAtivos.find(m => m.id === (preselectedMedicamentoId || doseMedId));

  useEffect(() => {
    if (isOpen) {
      setDoseHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setDoseMotivo("");
      setSearchQuery("");
      if (preselectedMedicamentoId) {
        setDoseMedId(preselectedMedicamentoId);
        const m = medicamentosAtivos.find(med => med.id === preselectedMedicamentoId);
        if (m) setDoseQtd(m.estoque_unidade_por_dose || 1);
      } else {
        setDoseMedId("");
        setDoseQtd(1);
      }
    }
  }, [isOpen, preselectedMedicamentoId, medicamentosAtivos]);

  const filteredMedicamentos = useMemo(() => {
    if (!searchQuery.trim()) return medicamentosAtivos;
    const q = searchQuery.toLowerCase().trim();
    return medicamentosAtivos.filter(m => m.nome.toLowerCase().includes(q));
  }, [medicamentosAtivos, searchQuery]);

  const handleSalvar = async () => {
    const targetId = preselectedMedicamentoId || doseMedId;
    if (!targetId) { trigger("error"); showToast("Selecione um medicamento", "error"); return; }
    if (!doseHora) { trigger("error"); showToast("Horário é obrigatório", "error"); return; }

    setIsSaving(true);
    trigger("success");

    try {
      const med = medicamentosAtivos.find(m => m.id === targetId);
      if (!med) throw new Error("Medicamento não encontrado");

      const hoje = getLocalTodayISO();
      const atual = med.estoque_quantidade ?? 0;
      const novoEstoque = Math.max(0, atual - doseQtd);

      // Atualiza estoque
      await safeUpdateMedicamento(med.id!, {
        estoque_quantidade: novoEstoque,
        estoque_data_referencia: hoje,
      });

      // Salva log de dose avulsa / SOS
      const logId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const novoLog = {
        id: logId,
        user_id: med.user_id,
        person_id: med.person_id,
        medicamento_id: med.id,
        data: hoje,
        horario: doseHora,
        quantidade: doseQtd,
        tomado_em: new Date().toISOString(),
        created_at: new Date().toISOString(),
        synced: false,
        observacoes: doseMotivo || "Dose avulsa / SOS",
      };

      await db.doseLogs.add(novoLog as any);
      await enfileirarOperacao("doseLogs", "add", novoLog);

      if (typeof window !== "undefined") window.dispatchEvent(new Event("sync:process"));

      // Análise de IA Inteligente de Segurança
      const historicoDoses = await db.doseLogs.where('medicamento_id').equals(med.id!).toArray();
      const insightUso = analisarComportamentoUso(med, historicoDoses);
      if (insightUso?.requerAtencaoUrgente) {
        showToast(insightUso.mensagem, "error");
      } else {
        showToast(`Dose de ${med.nome} registrada com sucesso!`, "success");
      }

      onClose();
      if (onSuccess) onSuccess();

    } catch (e) {
      console.error(e);
      trigger("error");
      showToast("Erro ao registrar dose", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const IconComp = getMedicineIcon(selectedMed?.formato);
  const color = selectedMed?.cores?.[0] || "#8B5CF6";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-void/80 backdrop-blur-md" onClick={() => { trigger("vibrate"); onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] border border-surface-border bg-surface p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-surface-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink-primary">Registrar Dose Rápida</h3>
              <p className="text-xs text-ink-muted">Abatimento imediato de estoque e linha do tempo</p>
            </div>
          </div>
          <button onClick={() => { trigger("vibrate"); onClose(); }} className="h-9 w-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted hover:text-ink-primary">
            <X size={18} />
          </button>
        </div>

        {/* Se não veio pré-selecionado, mostra o seletor inteligente */}
        {!preselectedMedicamentoId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase text-ink-muted tracking-wider">Selecione o Medicamento</label>
              <span className="text-[10px] text-ink-faint">{filteredMedicamentos.length} disponíveis</span>
            </div>
            
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar medicamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-2.5 text-sm text-ink-primary outline-none focus:border-emerald-400/50"
              />
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
              {filteredMedicamentos.map(med => {
                const isSelected = doseMedId === med.id;
                const MedIcon = getMedicineIcon(med.formato);
                const c = med.cores?.[0] || "#8B5CF6";
                return (
                  <button
                    key={med.id}
                    onClick={() => {
                      trigger("vibrate");
                      setDoseMedId(med.id!);
                      setDoseQtd(med.estoque_unidade_por_dose || 1);
                    }}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-[20px] border transition-all active:scale-95 ${isSelected ? 'border-emerald-400 bg-emerald-400/10 shadow-md' : 'border-surface-border/50 bg-surface-raised'}`}
                    style={{ width: '84px' }}
                  >
                     <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ backgroundColor: `${c}15`, borderColor: `${c}40`, color: c }}>
                       <MedIcon size={20} />
                     </div>
                     <span className="text-[10px] font-semibold text-center truncate w-full text-ink-primary">
                       {med.nome}
                     </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Se já estiver selecionado (veio de listagem/detalhes), exibe o card compacto do remédio */}
        {selectedMed && preselectedMedicamentoId && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-raised border border-surface-border/50">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0" style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}>
              <IconComp size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-primary truncate">{selectedMed.nome}</p>
              <p className="text-xs text-ink-muted">{selectedMed.dosagem} • Estoque: {selectedMed.estoque_quantidade ?? 0} {selectedMed.estoque_unidade_medida || 'unidades'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-ink-muted tracking-wider block">Quantidade</label>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-raised border border-surface-border/50">
              <button onClick={() => { trigger("vibrate"); setDoseQtd(Math.max(0.5, doseQtd - 0.5)); }} className="w-8 h-8 rounded-full bg-surface border flex items-center justify-center text-ink-primary active:scale-95">-</button>
              <span className="text-sm font-bold w-10 text-center">{doseQtd}</span>
              <button onClick={() => { trigger("vibrate"); setDoseQtd(doseQtd + 0.5); }} className="w-8 h-8 rounded-full bg-surface border flex items-center justify-center text-ink-primary active:scale-95">+</button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-ink-muted tracking-wider block">Horário</label>
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                maxLength={5}
                value={doseHora}
                onChange={(e) => setDoseHora(handleTimeMask(e.target.value))}
                className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised pl-9 pr-4 py-3.5 text-ink-primary font-mono text-sm outline-none focus:border-emerald-400/50"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase text-ink-muted tracking-wider block">Motivo / Sintoma (Opcional)</label>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_SUGERIDOS.map(m => (
              <button
                key={m.value}
                onClick={() => { trigger("vibrate"); setDoseMotivo(m.value); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${doseMotivo === m.value ? 'border-amber-400 bg-amber-400/10 text-amber-400 shadow-sm' : 'border-surface-border/60 bg-surface-raised text-ink-muted hover:border-surface-border'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Ou digite outra observação..."
            value={doseMotivo}
            onChange={(e) => setDoseMotivo(e.target.value)}
            className="w-full rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-amber-400/50"
          />
        </div>

        <button
          onClick={handleSalvar}
          disabled={isSaving || (!preselectedMedicamentoId && !doseMedId)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-void shadow-lg shadow-emerald-500/20 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <span className="animate-pulse">Registrando...</span> : <><Zap size={18} fill="currentColor" /> Confirmar Tomada</>}
        </button>
      </motion.div>
    </div>
  );
}
