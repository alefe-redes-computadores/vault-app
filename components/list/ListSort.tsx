// components/list/ListSort.tsx
"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

export interface SortOption {
  value: string;
  label: string;
}

interface ListSortProps {
  /** Opções de ordenação */
  options: SortOption[];
  /** Valor selecionado */
  value: string;
  /** Callback ao selecionar uma opção */
  onChange: (value: string) => void;
  /** Placeholder exibido no botão (padrão: mostra a label do valor atual) */
  placeholder?: string;
  /** Classes adicionais */
  className?: string;
  /** Largura máxima do botão (padrão: 60px) */
  maxWidth?: string;
  /** Desabilitar o componente */
  disabled?: boolean;
  /** Renderizar opção customizada (para ícones, etc.) */
  renderOption?: (option: SortOption, isSelected: boolean) => ReactNode;
}

export function ListSort({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  maxWidth = "104px",
  disabled = false,
  renderOption,
}: ListSortProps) {
  const { trigger } = useHapticFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); return; }
      if (event.key !== "Tab") return;
      const candidates = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
      if (!candidates.length) return;
      const first = candidates[0], last = candidates[candidates.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onEscape);
    const frame = window.requestAnimationFrame(() => { const chosen = dialogRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]') || dialogRef.current?.querySelector<HTMLButtonElement>("button"); chosen?.focus({ preventScroll: true }); });
    return () => {
      document.removeEventListener("keydown", onEscape);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const currentOption = options.find((opt) => opt.value === value);
  const displayLabel = placeholder || currentOption?.label || "Ordenar";

  const handleSelect = (selectedValue: string) => {
    trigger("vibrate");
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className={`shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          trigger("vibrate");
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-label="Ordenar lista"
        disabled={disabled}
        className={`
          flex min-h-11 items-center gap-2
          rounded-2xl
          border border-surface-border/60
          bg-surface-raised
          px-3
          text-xs font-semibold
          text-ink-secondary
          outline-none
          transition-all
          hover:border-ice/40 hover:text-ice
          active:scale-[0.98]
          disabled:opacity-50
          disabled:cursor-not-allowed
        `}
      >
        <span className="truncate" style={{ maxWidth }}>
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          className={`
            transition-transform
            ${isOpen ? "rotate-180" : ""}
          `}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar ordenação"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm"
            />

            {/* Menu */}
            <motion.div
              role="dialog" aria-modal="true" aria-label="Ordenar lista" ref={dialogRef}
              initial={{
                opacity: 0,
                y: 8,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 8,
                scale: 0.96,
              }}
              transition={{
                duration: 0.15,
              }}
              className="
                fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[101]
                mx-auto w-auto max-w-lg overflow-hidden
                rounded-[28px]
                border border-surface-border/60
                bg-surface
                p-2.5
                shadow-xl
              "
            >
              <div className="px-3 pb-2 pt-1"><p className="text-sm font-semibold text-ink-primary">Ordenar lista</p><p className="mt-0.5 text-xs text-ink-muted">Escolha como deseja visualizar os registros</p></div>
              <div role="radiogroup" aria-label="Opções de ordenação" className="max-h-[60dvh] overflow-y-auto overscroll-contain">
              {options.map((option) => {
                const isSelected = value === option.value;

                if (renderOption) {
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      role="radio" aria-checked={isSelected}
                      className={`
                        flex min-h-12 w-full
                        items-center
                        justify-between
                        rounded-2xl
                        px-3 py-3
                        text-left
                        text-sm
                        transition-colors
                        ${
                          isSelected
                            ? "bg-ice/10 font-semibold text-ice"
                            : "text-ink-primary hover:bg-surface-raised"
                        }
                      `}
                    >
                      {renderOption(option, isSelected)}
                    </button>
                  );
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      flex w-full
                      items-center
                      justify-between
                      rounded-2xl
                      px-3 py-3
                      text-left
                      text-sm
                      transition-colors
                      ${
                        isSelected
                          ? "bg-ice/10 font-semibold text-ice"
                          : "text-ink-primary hover:bg-surface-raised"
                      }
                    `}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <Check size={14} className="text-ice" />
                    )}
                  </button>
                );
              })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
