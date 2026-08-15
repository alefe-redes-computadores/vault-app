"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Search, Check } from "lucide-react";
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
  
  // 🔥 NOVO: Suporte a Cadastro-Relâmpago Inline (Opcional)
  enableQuickCreate?: boolean;
  quickCreatePlaceholder?: string;
  onQuickCreate?: (name: string) => Promise<T | string | void>;
  
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
  enableQuickCreate = false,
  quickCreatePlaceholder = "Digite o nome completo...",
  onQuickCreate,
  onCreateNew,
  createNewLabel = "Criar novo",
  loading = false,
}: SelectionModalProps<T>) {
  const { trigger } = useHapticFeedback();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estados do Cadastro-Relâmpago Inline
  const [isCreatingMode, setIsCreatingMode] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setIsCreatingMode(false);
      setQuickName("");
      setIsSubmittingQuick(false);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      getItemLabel(item).toLowerCase().includes(query)
    );
  }, [items, getItemLabel, searchQuery]);

  const handleSelect = (item: T) => {
    trigger("vibrate");
    onSelect(item);
    onClose();
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !onQuickCreate) return;

    setIsSubmittingQuick(true);
    trigger("vibrate");

    try {
      const createdItem = await onQuickCreate(quickName.trim());
      if (createdItem && typeof createdItem !== "string") {
        onSelect(createdItem as T);
      }
      onClose();
    } catch (error) {
      console.error("Erro no cadastro-relâmpago:", error);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleCreateNew = () => {
    trigger("vibrate");
    if (enableQuickCreate && onQuickCreate) {
      setIsCreatingMode(true);
    } else {
      onCreateNew?.();
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
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
          onMouseDown={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-surface-border/60 bg-surface p-4 shadow-vault"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">
                  Seleção
                </p>

                <h3 className="mt-1 font-display text-lg font-semibold text-ink-primary">
                  {isCreatingMode ? `Cadastrar ${title}` : title}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar modal"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* FLUXO DINÂMICO: Se estiver no modo de criação rápida, vira input simples */}
            {isCreatingMode ? (
              <form onSubmit={handleQuickSubmit} className="space-y-4 py-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink-muted">
                    Nome / Descrição Principal
                  </label>
                  <Input
                    placeholder={quickCreatePlaceholder}
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    autoFocus
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setIsCreatingMode(false);
                      setQuickName("");
                    }}
                    disabled={isSubmittingQuick}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    fullWidth
                    disabled={!quickName.trim() || isSubmittingQuick}
                    className="flex items-center justify-center gap-2"
                  >
                    {isSubmittingQuick ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Salvar e Selecionar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="relative mb-4">
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

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader2 size={24} className="animate-spin text-ice" />

                      <p className="mt-3 text-sm text-ink-muted">
                        Carregando itens...
                      </p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="rounded-[24px] border border-surface-border/50 bg-surface-raised px-5 py-10 text-center">
                      <p className="font-display text-base font-semibold text-ink-primary">
                        Nenhum item encontrado
                      </p>

                      <p className="mt-1 text-sm text-ink-muted">
                        Tente outro termo de busca ou cadastre um novo agora.
                      </p>

                      {(onCreateNew || enableQuickCreate) && (
                        <button
                          type="button"
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
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="w-full rounded-[22px] border border-surface-border/50 bg-surface-raised p-3 text-left transition-all active:scale-[0.985] hover:border-ice/20 hover:bg-surface-border/50"
                      >
                        {renderItem(item)}
                      </button>
                    ))
                  )}
                </div>

                {(onCreateNew || enableQuickCreate) && filteredItems.length > 0 && (
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
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
