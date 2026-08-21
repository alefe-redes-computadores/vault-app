"use client";

import { useState } from "react";
import { Info, FileText } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TIPO_RECEITA_LABELS, VALIDADE_RECEITA_DIAS } from "@/lib/health-utils";
import type { TipoReceita } from "@/lib/types";

interface Props {
  selected: TipoReceita;
  onChange: (tipo: TipoReceita) => void;
  onRenovarClick?: () => void;
}

export function SeletorReceita({ selected, onChange, onRenovarClick }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeInfoTipo, setActiveInfoTipo] = useState<TipoReceita>(selected);
  const tipos: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

  const getCardStyle = (tipo: TipoReceita, isActive: boolean) => {
    if (!isActive) {
      return "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border";
    }
    switch (tipo) {
      case "amarela":
        return "border-amber-400/80 bg-amber-400/10 text-amber-300 shadow-lg shadow-amber-400/5";
      case "azul":
        return "border-blue-400/80 bg-blue-400/10 text-blue-300 shadow-lg shadow-blue-400/5";
      case "branca":
        return "border-zinc-300/80 bg-zinc-300/10 text-zinc-200 shadow-lg shadow-zinc-300/5";
      default:
        return "border-ice bg-ice/15 text-ice shadow-lg shadow-ice/5";
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-ice" />
          {/* ALTERAÇÃO: De "Controle de Receita" para "Nível de Controle" */}
          <h3 className="text-sm font-semibold text-ink-primary">Nível de Controle</h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {tipos.map((tipo) => {
            const isActive = selected === tipo;
            return (
              <div 
                key={tipo} 
                className={`relative rounded-2xl border-2 p-3.5 transition-all duration-200 flex flex-col justify-between ${getCardStyle(tipo, isActive)}`}
              >
                <button 
                  type="button"
                  className="w-full text-left pr-6" 
                  onClick={() => onChange(tipo)}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">{TIPO_RECEITA_LABELS[tipo] || tipo}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">
                    {tipo === 'comum' ? 'Sem controle estrito' : tipo === 'amarela' ? 'Entorpecentes (A)' : tipo === 'azul' ? 'Psicotrópicos (B)' : 'Controlada (C1)'}
                  </p>
                </button>
                
                {/* Botão Info no canto */}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveInfoTipo(tipo);
                    setInfoOpen(true);
                  }} 
                  className="absolute top-3 right-3 text-ink-muted hover:text-ink-primary transition-colors p-1"
                  title="Ver regras de validade"
                >
                  <Info size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <BottomSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} title={`Regulamentação: ${TIPO_RECEITA_LABELS[activeInfoTipo]}`}>
        <div className="p-4 space-y-4 text-sm text-ink-muted">
          <div className="rounded-2xl bg-surface-raised p-4 border border-surface-border space-y-2">
            <p className="font-semibold text-ink-primary">Validade Legal</p>
            <p>
              O prazo de validade padrão para preenchimento e compra desta prescrição (Receita <b>{TIPO_RECEITA_LABELS[activeInfoTipo]}</b>) é de até <b>{VALIDADE_RECEITA_DIAS[activeInfoTipo]} dias</b> contados a partir da data de emissão.
            </p>
          </div>

          {onRenovarClick && (
            <button 
              type="button"
              onClick={() => {
                setInfoOpen(false);
                onRenovarClick();
              }}
              className="w-full bg-coral/10 text-coral font-bold py-3.5 rounded-2xl border border-coral/20 hover:bg-coral/20 transition-all active:scale-95"
            >
              Receita vencida? Registrar Renovação
            </button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
