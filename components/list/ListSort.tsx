// components/list/ListSort.tsx
"use client";

import { useState, ReactNode } from "react";
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
  maxWidth = "60px",
  disabled = false,
  renderOption,
}: ListSortProps) {
  const { trigger } = useHapticFeedback();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = options.find((opt) => opt.value === value);
  const displayLabel = placeholder || currentOption?.label || "Ordenar";

  const handleSelect = (selectedValue: string) => {
    trigger("vibrate");
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
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
          flex h-11 items-center gap-1.5
          rounded-2xl
          border border-surface-border/60
          bg-surface-raised
          px-3
          text-xs font-semibold
          text-ink-muted
          outline-none
          transition-all
          hover:border-surface-border/80
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
            {/* Backdrop invisível */}
            <motion.button
              type="button"
              aria-label="Fechar ordenação"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-transparent"
            />

            {/* Menu */}
            <motion.div
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
                absolute right-0 top-12 z-50
                w-44 overflow-hidden
                rounded-[20px]
                border border-surface-border/60
                bg-surface
                p-1.5
                shadow-xl
              "
            >
              {options.map((option) => {
                const isSelected = value === option.value;

                if (renderOption) {
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
                        px-3 py-2.5
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
                      px-3 py-2.5
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}