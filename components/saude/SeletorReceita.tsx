// components/saude/SeletorReceita.tsx
"use client";

import {
  useState,
} from "react";

import {
  FileText,
  Info,
} from "lucide-react";

import {
  BottomSheet,
} from "@/components/ui/BottomSheet";

import {
  TIPO_RECEITA_LABELS,
  VALIDADE_RECEITA_DIAS,
} from "@/lib/health-utils";

import type {
  TipoReceita,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

interface Props {
  selected:
    TipoReceita;

  onChange:
    (
      tipo:
        TipoReceita
    ) => void;

  onRenovarClick?:
    () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function SeletorReceita({
  selected,
  onChange,
  onRenovarClick,
}: Props) {
  const [
    infoOpen,
    setInfoOpen,
  ] =
    useState(
      false
    );

  const [
    activeInfoTipo,
    setActiveInfoTipo,
  ] =
    useState<TipoReceita>(
      selected
    );

  const tipos:
    TipoReceita[] = [
    "comum",
    "amarela",
    "azul",
    "branca",
  ];

  const getCardStyle =
    (
      tipo:
        TipoReceita,
      isActive:
        boolean
    ) => {
      if (
        !isActive
      ) {
        return "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border";
      }

      switch (
        tipo
      ) {
        case "amarela":
          return "border-amber-400/80 bg-amber-400/10 text-amber-300 shadow-lg shadow-amber-400/5";

        case "azul":
          return "border-blue-400/80 bg-blue-400/10 text-blue-300 shadow-lg shadow-blue-400/5";

        case "branca":
          return "border-zinc-300/80 bg-zinc-300/10 text-zinc-200 shadow-lg shadow-zinc-300/5";

        default:
          return "border-ice bg-ice/15 text-ice shadow-lg shadow-ice/5";
      }
    };

  const getSubtitle =
    (
      tipo:
        TipoReceita
    ) => {
      switch (
        tipo
      ) {
        case "amarela":
          return "Receita amarela";

        case "azul":
          return "Receita azul";

        case "branca":
          return "Receita branca controlada";

        default:
          return "Receita comum";
      }
    };

  const validadeReferencia =
    VALIDADE_RECEITA_DIAS[
      activeInfoTipo
    ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText
            size={
              16
            }
            className="text-ice"
          />

          <h3 className="text-sm font-semibold text-ink-primary">
            Tipo de Receita
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {tipos.map(
            (
              tipo
            ) => {
              const isActive =
                selected ===
                tipo;

              return (
                <div
                  key={
                    tipo
                  }
                  className={`relative flex flex-col justify-between rounded-2xl border-2 p-3.5 transition-all duration-200 ${getCardStyle(
                    tipo,
                    isActive
                  )}`}
                >
                  <button
                    type="button"
                    className="w-full pr-6 text-left"
                    onClick={
                      () =>
                        onChange(
                          tipo
                        )
                    }
                  >
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {TIPO_RECEITA_LABELS[
                        tipo
                      ] ||
                        tipo}
                    </p>

                    <p className="mt-0.5 text-[10px] opacity-70">
                      {
                        getSubtitle(
                          tipo
                        )
                      }
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={
                      (
                        event
                      ) => {
                        event.stopPropagation();

                        setActiveInfoTipo(
                          tipo
                        );

                        setInfoOpen(
                          true
                        );
                      }
                    }
                    className="absolute right-3 top-3 p-1 text-ink-muted transition-colors hover:text-ink-primary"
                    title="Ver referência usada pelo Vault"
                    aria-label={`Informações sobre ${TIPO_RECEITA_LABELS[tipo]}`}
                  >
                    <Info
                      size={
                        16
                      }
                    />
                  </button>
                </div>
              );
            }
          )}
        </div>
      </div>

      <BottomSheet
        isOpen={
          infoOpen
        }
        onClose={
          () =>
            setInfoOpen(
              false
            )
        }
        title={`Receita: ${TIPO_RECEITA_LABELS[activeInfoTipo]}`}
      >
        <div className="space-y-4 p-4 text-sm text-ink-muted">
          <div className="space-y-2 rounded-2xl border border-surface-border bg-surface-raised p-4">
            <p className="font-semibold text-ink-primary">
              Referência usada pelo Vault
            </p>

            {typeof validadeReferencia ===
            "number" ? (
              <p className="leading-relaxed">
                Para organização de lembretes, o Vault usa atualmente uma referência de{" "}
                <b className="text-ink-primary">
                  {
                    validadeReferencia
                  }{" "}
                  dias
                </b>{" "}
                para este tipo de receita.
              </p>
            ) : (
              <p className="leading-relaxed">
                O Vault não aplica um prazo padrão automático para este tipo de receita.
              </p>
            )}

            <p className="text-xs leading-relaxed text-ink-faint">
              Essa referência serve para organização do aplicativo e não substitui as informações da própria prescrição, orientação profissional ou regras aplicáveis à dispensação do medicamento.
            </p>
          </div>

          {onRenovarClick && (
            <button
              type="button"
              onClick={
                () => {
                  setInfoOpen(
                    false
                  );

                  /*
                   * Navegação continua sendo decidida pela tela
                   * que forneceu onRenovarClick.
                   */
                  onRenovarClick();
                }
              }
              className="w-full rounded-2xl border border-coral/20 bg-coral/10 py-3.5 font-bold text-coral transition-all hover:bg-coral/20 active:scale-95"
            >
              Registrar Renovação
            </button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}