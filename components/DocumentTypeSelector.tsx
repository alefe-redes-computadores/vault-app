"use client";

import {
  Contact,
  FileText,
  Heart,
  Pill,
  ClipboardList,
  File,
  Building2,
  FolderOpen,
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
  { id: "rg", label: "RG", icon: Contact, description: "Registro Geral" },
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

export function DocumentTypeSelector({ selected, onChange, isOpen, onClose }: DocumentTypeSelectorProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-2xl bg-surface-raised border border-surface-border shadow-vault p-6 animate-in zoom-in duration-200 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-semibold text-ink-primary text-center mb-4">
          Selecionar tipo de documento
        </h2>

        <div className="grid grid-cols-2 gap-2">
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
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border transition-all active:scale-[0.98] ${
                  isSelected
                    ? "border-ice bg-ice/10 text-ice"
                    : "border-surface-border bg-surface hover:bg-surface-border text-ink-muted hover:text-ink-primary"
                }`}
              >
                <Icon size={24} />
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-xs text-ink-muted/70">{type.description}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-full bg-surface-border text-ink-muted hover:bg-surface-border/80 transition-colors active:scale-[0.98]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
