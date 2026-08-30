// components/saude/SeletorTratamentoModal.tsx
"use client";

import {
  useState,
} from "react";

import {
  Activity,
  Brain,
  Flame,
  HeartPulse,
  Loader2,
  Plus,
  ShieldAlert,
} from "lucide-react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  Input,
} from "@/components/ui/Input";

import {
  useHapticFeedback,
} from "@/lib/haptics";

import {
  tratamentosRepository,
} from "@/lib/repositories/tratamentos";

import type {
  Tratamento,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  personId: string;
}

// ============================================================
// ÍCONE
// ============================================================

export function getTratamentoIcon(
  nome: string
) {
  const normalized =
    (
      nome ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "tdah"
    )
  ) {
    return Brain;
  }

  if (
    normalized.includes(
      "dor"
    ) ||
    normalized.includes(
      "neuropática"
    )
  ) {
    return Flame;
  }

  if (
    normalized.includes(
      "depress"
    )
  ) {
    return HeartPulse;
  }

  if (
    normalized.includes(
      "ansied"
    ) ||
    normalized.includes(
      "ansiolítico"
    )
  ) {
    return ShieldAlert;
  }

  return Activity;
}

// ============================================================
// COMPONENT
// ============================================================

export function SeletorTratamentoModal({
  isOpen,
  onClose,
  selectedIds,
  onChange,
  personId,
}: Props) {
  const {
    trigger,
  } =
    useHapticFeedback();

  const [
    isCreating,
    setIsCreating,
  ] =
    useState(
      false
    );

  const [
    newName,
    setNewName,
  ] =
    useState(
      ""
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false
    );

  // ==========================================================
  // LISTA — PERSON SCOPED
  // ==========================================================

  const tratamentos =
    useLiveQuery(
      async () => {
        const safePersonId =
          personId.trim();

        if (
          !safePersonId
        ) {
          return [];
        }

        return tratamentosRepository.getAll(
          safePersonId
        );
      },
      [
        personId,
      ],
      []
    );

  // ==========================================================
  // CRIAR
  // ==========================================================

  const handleCreate =
    async () => {
      const safePersonId =
        personId.trim();

      const safeName =
        newName.trim();

      if (
        !safePersonId ||
        !safeName ||
        isSaving
      ) {
        if (
          !safePersonId
        ) {
          trigger(
            "error"
          );
        }

        return;
      }

      setIsSaving(
        true
      );

      trigger(
        "vibrate"
      );

      try {
        const id =
          await tratamentosRepository.create({
            person_id:
              safePersonId,

            nome:
              safeName,

            status:
              "ativo",
          });

        onChange(
          Array.from(
            new Set([
              ...selectedIds,
              id,
            ])
          )
        );

        trigger(
          "success"
        );

        setIsCreating(
          false
        );

        setNewName(
          ""
        );
      } catch (
        error
      ) {
        console.error(
          "[SeletorTratamentoModal] Erro ao criar tratamento:",
          error
        );

        trigger(
          "error"
        );
      } finally {
        setIsSaving(
          false
        );
      }
    };

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  const toggleTratamento =
    (
      tratamento:
        Tratamento
    ) => {
      if (
        !tratamento.id
      ) {
        return;
      }

      trigger(
        "vibrate"
      );

      const selected =
        selectedIds.includes(
          tratamento.id
        );

      if (
        selected
      ) {
        onChange(
          selectedIds.filter(
            (
              currentId
            ) =>
              currentId !==
              tratamento.id
          )
        );

        return;
      }

      onChange(
        Array.from(
          new Set([
            ...selectedIds,
            tratamento.id,
          ])
        )
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <BottomSheet
      isOpen={
        isOpen
      }
      onClose={
        onClose
      }
      title="Tratamentos vinculados"
    >
      <div className="space-y-4 p-4">
        {!personId.trim() ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-center">
            <p className="text-sm font-medium text-amber-400">
              Selecione uma pessoa ativa para gerenciar tratamentos.
            </p>
          </div>
        ) : isCreating ? (
          <div className="space-y-3">
            <Input
              label="Nome do tratamento"
              placeholder="Ex: Controle de enxaqueca"
              value={
                newName
              }
              onChange={
                (
                  event
                ) =>
                  setNewName(
                    event.target.value
                  )
              }
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  isSaving
                }
                onClick={
                  () => {
                    trigger(
                      "vibrate"
                    );

                    setIsCreating(
                      false
                    );

                    setNewName(
                      ""
                    );
                  }
                }
                className="rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 text-sm font-semibold text-ink-muted disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  isSaving ||
                  !newName.trim()
                }
                onClick={
                  handleCreate
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2
                    size={
                      16
                    }
                    className="animate-spin"
                  />
                ) : (
                  <Plus
                    size={
                      16
                    }
                  />
                )}

                Criar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {tratamentos.length >
              0 ? (
                tratamentos.map(
                  (
                    tratamento
                  ) => {
                    if (
                      !tratamento.id
                    ) {
                      return null;
                    }

                    const selected =
                      selectedIds.includes(
                        tratamento.id
                      );

                    const IconComp =
                      getTratamentoIcon(
                        tratamento.nome
                      );

                    return (
                      <button
                        type="button"
                        key={
                          tratamento.id
                        }
                        onClick={
                          () =>
                            toggleTratamento(
                              tratamento
                            )
                        }
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-violet-400/30 bg-violet-400/10"
                            : "border-surface-border/40 bg-surface-raised"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-violet-400/15 text-violet-300"
                              : "bg-surface text-ink-muted"
                          }`}
                        >
                          <IconComp
                            size={
                              16
                            }
                          />
                        </div>

                        <span
                          className={`flex-1 text-sm font-medium ${
                            selected
                              ? "text-violet-200"
                              : "text-ink-primary"
                          }`}
                        >
                          {
                            tratamento.nome
                          }
                        </span>

                        {selected && (
                          <span className="text-xs font-semibold text-violet-300">
                            Selecionado
                          </span>
                        )}
                      </button>
                    );
                  }
                )
              ) : (
                <div className="rounded-2xl border border-surface-border/40 bg-surface-raised p-4 text-center">
                  <p className="text-sm text-ink-muted">
                    Nenhum tratamento cadastrado para esta pessoa.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  setIsCreating(
                    true
                  );
                }
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/5 px-4 py-3 text-sm font-semibold text-violet-300"
            >
              <Plus
                size={
                  16
                }
              />

              Criar novo tratamento
            </button>

            <button
              type="button"
              onClick={
                () => {
                  trigger(
                    "vibrate"
                  );

                  onClose();
                }
              }
              className="w-full rounded-2xl bg-ice px-4 py-3 text-sm font-semibold text-void"
            >
              Concluir
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}