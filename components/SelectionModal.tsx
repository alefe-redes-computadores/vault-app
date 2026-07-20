"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, Loader2 } from "lucide-react";
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
  getItemId: (item: T) => number;
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

  const filteredItems = items.filter(item =>
    getItemLabel(item).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: T) => {
    trigger("vibrate");
    onSelect(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl bg-surface border border-surface-border shadow-vault p-4 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-ink-primary">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-surface-border transition-colors"
              >
                <X size={18} className="text-ink-muted" />
              </button>
            </div>

            {/* Busca */}
            <div className="mb-4">
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full"
              />
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-ice" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-ink-muted text-sm">Nenhum item encontrado</p>
                  {onCreateNew && (
                    <button
                      onClick={() => {
                        trigger("vibrate");
                        onCreateNew();
                      }}
                      className="mt-4 flex items-center gap-2 mx-auto text-ice hover:text-ice/80 transition-colors"
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
                    className="w-full text-left p-3 rounded-xl bg-surface-raised border border-surface-border/50 hover:border-ice/30 transition-all active:scale-95"
                  >
                    {renderItem(item)}
                  </button>
                ))
              )}
            </div>

            {/* Botão criar novo (fixo no rodapé) */}
            {onCreateNew && filteredItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-border/50">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    trigger("vibrate");
                    onCreateNew();
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  {createNewLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}