"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Search } from "lucide-react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { useHapticFeedback } from "@/lib/haptics";

interface SelectionModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  items: T[];
  title: string;
  placeholder?: string;
  renderItem: (item: T) => React.ReactNode;
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  onCreateNew?: () => void;
  createNewLabel?: string;
  loading?: boolean;
}

export function SelectionModal<T>({
  isOpen,
  onClose,
  onSelect,
  items,
  title,
  placeholder = "Buscar...",
  renderItem,
  getItemId,
  getItemLabel,
  onCreateNew,
  createNewLabel = "Criar novo",
  loading = false,
}: SelectionModalProps<T>) {
  const { trigger } = useHapticFeedback();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      getItemLabel(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, getItemLabel, searchQuery]);

  const handleSelect = (item: T) => {
    trigger("vibrate");
    onSelect(item);
    onClose();
  };

  const handleCreateNew = () => {
    trigger("vibrate");
    onCreateNew?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
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
            className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-surface-border/60 bg-surface p-4 shadow-vault"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                  Seleção
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {title}
                </h3>
              </div>

              <button
                onClick={onClose}
                aria-label="Fechar modal"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 size={24} className="animate-spin text-ice" />
                  <p className="mt-3 text-sm text-ink-muted">Carregando itens...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised px-5 py-10 text-center">
                  <p className="font-display text-base font-semibold text-ink-primary">
                    Nenhum item encontrado
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Tente outro termo de busca ou crie um novo item.
                  </p>

                  {onCreateNew && (
                    <button
                      onClick={handleCreateNew}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-ice/12 px-4 py-2 text-sm font-medium text-ice transition-all active:scale-95 hover:bg-ice/16"
                    >
                      <Plus size={16} />
                      {createNewLabel}
                    </button>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={getItemId(item)}
                    onClick={() => handleSelect(item)}
                    className="w-full rounded-[22px] border border-surface-border/50 bg-surface-raised p-3 text-left transition-all active:scale-[0.985] hover:border-ice/20 hover:bg-surface-border/50"
                  >
                    {renderItem(item)}
                  </button>
                ))
              )}
            </div>

            {onCreateNew && filteredItems.length > 0 && (
              <div className="mt-4 border-t border-surface-border/50 pt-4">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleCreateNew}
                  className="flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  {createNewLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}