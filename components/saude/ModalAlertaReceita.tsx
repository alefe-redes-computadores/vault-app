"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ModalAlertaReceitaProps {
  isOpen: boolean;
  mensagem: string;
  onAjustar: () => void;
  onForcar: () => void;
}

export function ModalAlertaReceita({ isOpen, mensagem, onAjustar, onForcar }: ModalAlertaReceitaProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/85 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md rounded-[32px] border border-amber-400/30 bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink-primary">Atenção Regulatória</h3>
                <p className="text-xs text-ink-muted">Validação de Receita Controlada</p>
              </div>
            </div>
            
            <p className="text-sm text-ink-muted leading-relaxed">
              {mensagem}
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="primary" fullWidth onClick={onAjustar}>
                Ajustar para 30 dias (Padrão)
              </Button>
              <Button variant="secondary" fullWidth onClick={onForcar}>
                Forçar Registro com esta Quantidade
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
