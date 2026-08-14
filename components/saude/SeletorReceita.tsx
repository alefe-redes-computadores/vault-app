import { useState } from "react";
import { Info } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TIPO_RECEITA_LABELS, VALIDADE_RECEITA_DIAS } from "@/lib/health-utils";
import type { TipoReceita } from "@/lib/types";

interface Props {
  selected: TipoReceita;
  onChange: (tipo: TipoReceita) => void;
}

export function SeletorReceita({ selected, onChange }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const tipos: TipoReceita[] = ["comum", "amarela", "azul", "branca"];

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {tipos.map((tipo) => {
          const isActive = selected === tipo;
          // Lógica de cores baseada no tipo
          const borderColor = isActive 
            ? tipo === "amarela" ? "border-amber-400" : tipo === "azul" ? "border-blue-400" : "border-ice"
            : "border-surface-border";
          
          return (
            <div key={tipo} className={`relative rounded-2xl border-2 p-3 ${borderColor} bg-surface-raised`}>
              <button className="w-full text-left" onClick={() => onChange(tipo)}>
                <p className="text-xs font-bold uppercase">{TIPO_RECEITA_LABELS[tipo]}</p>
              </button>
              {/* Botão Info no canto */}
              <button onClick={() => setInfoOpen(true)} className="absolute top-2 right-2 text-ink-muted hover:text-ice">
                <Info size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <BottomSheet isOpen={infoOpen} onClose={() => setInfoOpen(false)} title="Sobre a Receita">
        <div className="p-4 space-y-4">
          <p className="text-sm text-ink-muted">
            A validade da receita <b>{TIPO_RECEITA_LABELS[selected]}</b> é de {VALIDADE_RECEITA_DIAS[selected]} dias.
          </p>
          <button className="w-full bg-coral/10 text-coral font-bold py-3 rounded-xl">
             Receita vencida? Registrar Renovação
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
