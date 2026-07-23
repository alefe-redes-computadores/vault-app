"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  FileText,
  Heart,
  Pill,
  ClipboardList,
  File,
  Building2,
  FolderOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { type DocumentType } from "@/lib/types";

interface DocumentTypeOption {
  id: DocumentType;
  label: string;
  icon: LucideIcon;
  description: string;
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { id: "rg", label: "RG", icon: User, description: "Registro Geral" },
  { id: "cpf", label: "CPF", icon: FileText, description: "Cadastro de Pessoa Física" },
  { id: "cnh", label: "CNH", icon: FileText, description: "Carteira Nacional de Habilitação" },
  { id: "certificado", label: "Certificado", icon: File, description: "Certificados e diplomas" },
  { id: "receita", label: "Receita", icon: Pill, description: "Receitas médicas" },
  { id: "prontuario", label: "Prontuário", icon: Heart, description: "Prontuários médicos" },
  { id: "laudo", label: "Laudo", icon: ClipboardList, description: "Laudos e exames" },
  { id: "encaminhamento", label: "Encaminhamento", icon: Building2, description: "Encaminhamentos médicos" },
  { id: "outro", label: "Outro", icon: FolderOpen, description: "Outros documentos" },
];

interface DocumentTypeSelectorProps {
  selected: DocumentType;
  onChange: (type: DocumentType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentTypeSelector({
  selected,
  onChange,
  isOpen,
  onClose,
}: DocumentTypeSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[82vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-surface-border/60 bg-surface p-5 shadow-vault"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Fechar seletor"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pr-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Documento
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                Selecionar tipo
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Escolha o tipo para carregar os campos corretos do formulário
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {DOCUMENT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selected === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      onChange(type.id);
                      onClose();
                    }}
                    className={`rounded-[22px] border p-4 text-left transition-all active:scale-[0.985] ${
                      isSelected
                        ? "border-ice bg-ice/10 text-ice shadow-sm shadow-ice/10"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-surface-border hover:text-ink-primary"
                    }`}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/[0.03]">
                      <Icon size={20} />
                    </div>
                    <span className="block text-sm font-semibold">{type.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-ink-muted">
                      {type.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full border border-surface-border/50 bg-surface-raised py-2.5 text-sm font-medium text-ink-muted transition-colors active:scale-[0.985] hover:bg-surface-border hover:text-ink-primary"
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}