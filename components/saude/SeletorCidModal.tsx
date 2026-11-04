// components/saude/SeletorCidModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check } from "lucide-react";
import { useRef, useState } from "react";
import { useModalGuard } from "@/hooks/useModalGuard";

interface SeletorCidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cid: { id: string; codigo: string; descricao: string }) => void;
}

// Exemplo de lista, você pode substituir por uma busca real depois
const MOCK_CIDS = [
  { id: "1", codigo: "F33.2", descricao: "Transtorno depressivo recorrente" },
  { id: "2", codigo: "F32.9", descricao: "Episódio depressivo não especificado" },
  { id: "3", codigo: "F41.2", descricao: "Transtorno ansioso e depressivo misto" },
];

export function SeletorCidModal({ isOpen, onClose, onSelect }: SeletorCidModalProps) {
  const [busca, setBusca] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalGuard({ open: isOpen, dialogRef, onClose });

  const cidsFiltrados = MOCK_CIDS.filter(c => 
    c.codigo.toLowerCase().includes(busca.toLowerCase()) || 
    c.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-label="Selecionar CID"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-[28px] border border-surface-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink-primary">Selecione o CID</h2>
              <button type="button" onClick={onClose} aria-label="Fechar seletor de CID" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-raised"><X size={20} /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-ink-muted" size={18} />
              <input 
                className="w-full bg-surface-raised rounded-xl py-2.5 pl-10 pr-4 outline-none border border-surface-border text-sm text-ink-primary"
                placeholder="Buscar código ou descrição..."
                aria-label="Buscar CID por código ou descrição"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
              {cidsFiltrados.map(cid => (
                <button
                  key={cid.id}
                  onClick={() => { onSelect(cid); onClose(); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-ice/10 border border-transparent hover:border-ice/20 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-ice">{cid.codigo}</p>
                    <p className="text-xs text-ink-muted">{cid.descricao}</p>
                  </div>
                  <Check size={16} className="text-ice opacity-0 hover:opacity-100" />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
