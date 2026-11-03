"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { MEDICATION_ADDITIONAL_FORMATS } from "@/lib/medications/form-presentation";

type Props = {
  open: boolean;
  selectedFormat: string;
  onSelect: (format: string) => void;
  onClose: () => void;
};

/** M8: catálogo visual compartilhado. O formulário retém a autoridade de
 * estoque, dose, formato, vibração e persistência; este modal não escreve nada.
 */
export function MedicationAdditionalFormatsSheet({ open, selectedFormat, onSelect, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Tab") return;
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="format-backdrop"
            type="button"
            aria-label="Fechar seleção de formato"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm motion-reduce:transition-none"
          />
          <motion.section
            ref={dialogRef}
            key="format-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vault-medication-formats-title"
            aria-describedby="vault-medication-formats-desc"
            initial={{ opacity: 0, y: 24, scale: .985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: .985 }}
            transition={{ duration: .16 }}
            className="fixed inset-x-2 bottom-[max(env(safe-area-inset-bottom),0.25rem)] z-[90] mx-auto max-h-[min(88dvh,700px)] sm:inset-x-3 sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] max-w-lg overflow-hidden rounded-[26px] border border-surface-border bg-surface shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-surface-border/50 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h3 id="vault-medication-formats-title" className="font-display text-base font-semibold text-ink-primary">Mais formatos</h3>
                <p id="vault-medication-formats-desc" className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Escolha a apresentação do medicamento. O catálogo oficial poderá ser conferido depois, sem bloquear o cadastro.
                </p>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar formatos"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 active:scale-95 motion-reduce:transform-none">
                <X size={18} aria-hidden="true"/>
              </button>
            </header>
            <div className="max-h-[58dvh] overflow-y-auto overscroll-contain p-3 sm:p-4" aria-label="Outros formatos disponíveis">
              <div className="grid grid-cols-2 gap-2">
                {MEDICATION_ADDITIONAL_FORMATS.map(item => {
                  const selected = item.id === selectedFormat;
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" aria-pressed={selected}
                      onClick={() => { onSelect(item.id); onClose(); }}
                      className={`flex min-h-[68px] min-w-0 items-center gap-2 rounded-2xl border px-2.5 py-2.5 text-left transition-[background-color,border-color,color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-[.98] motion-reduce:transition-none motion-reduce:transform-none ${selected ? "border-emerald-300/50 bg-emerald-300/[.10] text-emerald-100" : "border-surface-border/50 bg-surface-raised text-ink-secondary hover:border-emerald-300/30"}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-emerald-300/10" : "bg-void/40"}`}><Icon size={19} fill={selected ? "currentColor" : "none"} stroke={selected ? "none" : "currentColor"} aria-hidden="true"/></span>
                      <span className="min-w-0 flex-1"><span className="block break-words text-[11px] font-semibold leading-tight">{item.label}</span>{selected ? <span className="mt-1 block text-[9px] text-emerald-200">Selecionado</span> : null}</span>
                      {selected ? <Check size={16} className="shrink-0" aria-hidden="true"/> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}
