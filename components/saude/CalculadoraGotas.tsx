// components/saude/CalculadoraGotas.tsx
"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  Droplet,
  Info,
} from "lucide-react";

import {
  Input,
} from "@/components/ui/Input";

import {
  useHapticFeedback,
} from "@/lib/haptics";

// ============================================================
// TIPOS
// ============================================================

interface Props {
  isAtivo:
    boolean;

  onToggle:
    (
      ativo:
        boolean
    ) => void;

  mlTotal:
    string;

  setMlTotal:
    (
      val:
        string
    ) => void;

  frascos: string;
  setFrascos: (value: string) => void;

  gotasPorMl:
    string;

  setGotasPorMl:
    (
      val:
        string
    ) => void;

  /*
   * Nome legado preservado para compatibilidade.
   *
   * O valor enviado é TOTAL DE GOTAS, não número de doses.
   */
  onEstoqueCalculado?:
    (
      totalGotas:
        number
    ) => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function CalculadoraGotas({
  isAtivo,
  onToggle,
  mlTotal,
  setMlTotal,
  gotasPorMl,
  setGotasPorMl,
  frascos,
  setFrascos,
  onEstoqueCalculado,
}: Props) {
  const {
    trigger,
  } =
    useHapticFeedback();

  /*
   * Evita transformar a identidade da função recebida pelo pai
   * em gatilho do cálculo.
   */
  const callbackRef =
    useRef(
      onEstoqueCalculado
    );

  useEffect(
    () => {
      callbackRef.current =
        onEstoqueCalculado;
    },
    [
      onEstoqueCalculado,
    ]
  );

  const ml =
    Number(
      mlTotal
    );

  const gotasMl =
    Number(
      gotasPorMl
    );

  const possuiVolumeValido =
    Number.isFinite(
      ml
    ) &&
    ml >
      0;

  const possuiConversaoValida =
    Number.isFinite(
      gotasMl
    ) &&
    gotasMl >
      0;

  const recipientes = Number(frascos);
  const recipientesValidos = Number.isInteger(recipientes) && recipientes > 0 && recipientes <= 1000;
  const totalGotas = possuiVolumeValido && possuiConversaoValida && recipientesValidos
    ? recipientes * ml * gotasMl : 0;

  // ==========================================================
  // ATUALIZA ESTOQUE CALCULADO
  // ==========================================================

  useEffect(
    () => {
      if (
        !isAtivo ||
        !callbackRef.current
      ) {
        return;
      }

      /*
       * Só enviamos um cálculo quando há dados suficientes.
       *
       * Não transformamos campo vazio em estoque zero
       * automaticamente.
       */
      if (
        !possuiVolumeValido ||
        !possuiConversaoValida ||
        !recipientesValidos
      ) {
        return;
      }

      callbackRef.current(
        totalGotas
      );
    },
    [
      isAtivo,
      possuiVolumeValido,
      possuiConversaoValida,
      recipientesValidos,
      totalGotas,
    ]
  );

  return (
    <div className="space-y-3 rounded-[24px] border border-surface-border/60 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
            <Droplet
              size={
                16
              }
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-primary">
              Medição por Gotas / Frasco
            </p>

            <p className="text-[11px] text-ink-muted">
              Converte o volume informado em quantidade de gotas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            () => {
              trigger(
                "vibrate"
              );

              onToggle(
                !isAtivo
              );
            }
          }
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isAtivo
              ? "bg-ice"
              : "bg-surface-raised"
          }`}
          aria-pressed={
            isAtivo
          }
          aria-label="Alternar cálculo por gotas"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-void shadow-lg ring-0 transition duration-200 ease-in-out ${
              isAtivo
                ? "translate-x-5"
                : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {isAtivo && (
        <div className="animate-in space-y-3 border-t border-surface-border/40 pt-3 duration-200 fade-in">
          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <Input label="Frascos adquiridos" type="number" inputMode="numeric" min="1" placeholder="Ex.: 1" value={frascos}
              onChange={event => setFrascos(event.target.value)} />
            <Input
              label="Volume por frasco (ml)"
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Ex: 20"
              value={
                mlTotal
              }
              onChange={
                (
                  event
                ) =>
                  setMlTotal(
                    event.target.value
                  )
              }
            />

            <Input
              label="Gotas por ml (conversão informada)"
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="Informe"
              value={
                gotasPorMl
              }
              onChange={
                (
                  event
                ) =>
                  setGotasPorMl(
                    event.target.value
                  )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border/40 bg-surface-raised px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ink-muted">
              <Droplet
                size={
                  13
                }
                className="text-ice"
              />

              Saldo operacional calculado
            </span>

            <span className="text-right font-mono font-bold text-ice">
              {totalGotas >
              0
                ? `${totalGotas} gotas`
                : "Dados incompletos"}
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-ice/15 bg-ice/5 p-3">
            <Info
              size={
                13
              }
              className="mt-0.5 shrink-0 text-ice"
            />

            <p className="text-[10px] leading-relaxed text-ink-muted">
              O saldo é frascos × ml por frasco × gotas/ml, somente quando todos os valores forem informados. A aquisição é de frascos; o controle operacional fica em gotas. O Vault não presume uma conversão universal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}