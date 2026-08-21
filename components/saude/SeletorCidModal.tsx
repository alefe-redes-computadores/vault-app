// components/saude/SeletorCidModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check } from "lucide-react";
import { useState } from "react";

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
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-lg rounded-[28px] bg-surface p-6 shadow-2xl border border-surface-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink-primary">Selecione o CID</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-raised"><X size={20} /></button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-ink-muted" size={18} />
              <input 
                className="w-full bg-surface-raised rounded-xl py-2.5 pl-10 pr-4 outline-none border border-surface-border text-sm text-ink-primary"
                placeholder="Buscar código ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
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
