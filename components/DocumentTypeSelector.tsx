"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterDocumentTypeOptions } from "@/lib/documents/document-type-search";
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
  Search,
  Check,
  Stethoscope,
  Activity,
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
  { id: "documento_sus", label: "Fornecimento SUS", icon: ClipboardList, description: "Formulários e comprovantes" },
  { id: "lme", label: "LME", icon: ClipboardList, description: "Solicitação de medicamentos SUS" },
  { id: "laudo", label: "Laudo", icon: ClipboardList, description: "Laudos e exames" },
  { id: "encaminhamento", label: "Encaminhamento", icon: Building2, description: "Encaminhamentos médicos" },
  { id: "consulta", label: "Consulta", icon: Stethoscope, description: "Consultas médicas" },
  { id: "cirurgia", label: "Cirurgia", icon: Activity, description: "Cirurgias e procedimentos" },
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
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const visibleTypes = useMemo(() => filterDocumentTypeOptions(DOCUMENT_TYPES, search), [search]);

  // A list of sensitive document types remains local; neither the query nor a document is persisted.
  useEffect(() => {
    if (!isOpen) { setSearch(""); return; }
    const prior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (prior?.isConnected) prior.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur-md sm:items-center sm:p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vault-document-type-title"
            aria-describedby="vault-document-type-desc"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="shadow-vault relative flex max-h-[min(92dvh,680px)] w-full max-w-md flex-col overflow-hidden rounded-t-[26px] border border-surface-border/60 bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-[28px] sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar seletor"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pr-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                Documento
              </p>
              <h2 id="vault-document-type-title" className="mt-1 font-display text-lg font-semibold text-ink-primary">
                Selecionar tipo
              </h2>
              <p id="vault-document-type-desc" className="mt-1 text-sm text-ink-muted">
                Escolha o tipo para carregar os campos corretos do formulário
              </p>
            </div>

            <div className="relative mb-3 shrink-0">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input ref={inputRef} type="search" autoComplete="off" autoCorrect="off" spellCheck={false}
                aria-label="Buscar tipo de documento" placeholder="Buscar RG, receita, laudo…"
                maxLength={80} value={search} onChange={event => setSearch(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-surface-border/70 bg-void/40 pl-10 pr-3 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-ice/50 focus:ring-2 focus:ring-ice/15" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {visibleTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selected === type.id;

                return (
                  <button
                    type="button"
                    key={type.id}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onChange(type.id);
                      onClose();
                    }}
                    className={`flex min-h-[100px] min-w-0 flex-col rounded-[18px] border p-3 text-left transition-all active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice motion-reduce:transform-none sm:rounded-[22px] sm:p-4 ${
                      isSelected
                        ? "glow-ice border-ice bg-ice/10 text-ice"
                        : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-surface-border hover:text-ink-primary"
                    }`}
                  >
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                        isSelected ? "ring-gradient text-void" : "bg-black/5 dark:bg-white/[0.03]"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="flex items-center gap-1.5 break-words text-sm font-semibold">{type.label}{isSelected ? <Check size={14} aria-hidden="true"/> : null}</span>
                    <span className="mt-1 block break-words text-xs leading-5 text-ink-muted">
                      {type.description}
                    </span>
                  </button>
                );
              })}
              </div>
              {!visibleTypes.length && <p role="status" className="px-2 py-8 text-center text-sm text-ink-muted">Nenhum tipo encontrado. Tente outro nome ou categoria.</p>}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-3 min-h-11 w-full shrink-0 rounded-full border border-surface-border/50 bg-surface-raised py-2.5 text-sm font-medium text-ink-muted transition-colors active:scale-[0.985] hover:bg-surface-border hover:text-ink-primary"
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
