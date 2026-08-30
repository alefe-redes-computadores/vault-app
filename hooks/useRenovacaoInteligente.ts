// hooks/useRenovacaoInteligente.ts
"use client";

import {
  useCallback,
  useMemo,
} from "react";

import {
  useRenovacoes,
} from "@/hooks/useRenovacoes";

import {
  useFarmacias,
} from "@/hooks/useFarmacias";

import {
  VALIDADE_RECEITA_DIAS,
} from "@/lib/health-utils";

import type {
  TipoReceita,
} from "@/lib/types";

// ============================================================
// TIPOS
// ============================================================

type AnalisePreco = {
  /*
   * Positivo:
   * preço atual está mais barato que a referência anterior.
   *
   * Negativo:
   * preço atual está mais caro.
   */
  diff: number;

  farmaciaAnteriorName?: string;

  precoAnterior: number;
};

// ============================================================
// HELPERS
// ============================================================

function parseCurrencyValue(
  value: string
): number | null {
  const normalized =
    value
      .trim()
      .replace(
        /\./g,
        ""
      )
      .replace(
        ",",
        "."
      );

  if (
    !normalized
  ) {
    return null;
  }

  const parsed =
    Number(
      normalized
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function addDaysToCivilDate(
  isoDate: string,
  days: number
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      isoDate
    );

  if (
    !match ||
    !Number.isInteger(
      days
    ) ||
    days <=
      0
  ) {
    return "";
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return "";
  }

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return [
    String(
      date.getUTCFullYear()
    ).padStart(
      4,
      "0"
    ),

    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    ),
  ].join(
    "-"
  );
}

// ============================================================
// HOOK
// ============================================================

export function useRenovacaoInteligente(
  medicamentoId: string,
  farmaciaId: string,
  preco: string
) {
  /*
   * useRenovacoes já é person-scoped.
   *
   * Portanto este hook nunca precisa descobrir sozinho qual pessoa
   * é dona do histórico.
   */
  const {
    renovacoes,
  } =
    useRenovacoes(
      medicamentoId ||
        undefined
    );

  const {
    farmacias,
  } =
    useFarmacias();

  // ==========================================================
  // ANÁLISE DE PREÇO
  // ==========================================================

  const analisePreco =
    useMemo<
      AnalisePreco | null
    >(
      () => {
        if (
          !medicamentoId ||
          !farmaciaId ||
          !preco
        ) {
          return null;
        }

        const precoAtual =
          parseCurrencyValue(
            preco
          );

        if (
          precoAtual ===
          null
        ) {
          return null;
        }

        /*
         * useRenovacoes já entrega do mais recente para o mais antigo.
         *
         * Pegamos a compra anterior mais recente com preço válido.
         */
        const anteriorComPreco =
          renovacoes.find(
            (
              renovacao
            ) =>
              typeof renovacao.preco ===
                "number" &&
              Number.isFinite(
                renovacao.preco
              ) &&
              renovacao.preco >
                0
          );

        if (
          !anteriorComPreco ||
          typeof anteriorComPreco.preco !==
            "number"
        ) {
          return null;
        }

        const precoAnterior =
          anteriorComPreco.preco;

        /*
         * IMPORTANTE:
         *
         * positivo = economia.
         *
         * Exemplo:
         *
         * anterior: 50
         * atual:    40
         * diff:     +10
         */
        const diff =
          precoAnterior -
          precoAtual;

        const farmaciaAnterior =
          anteriorComPreco.farmacia_id
            ? farmacias.find(
                (
                  farmacia
                ) =>
                  farmacia.id ===
                  anteriorComPreco.farmacia_id
              )
            : undefined;

        return {
          diff,

          precoAnterior,

          farmaciaAnteriorName:
            farmaciaAnterior
              ?.nome ||
            undefined,
        };
      },
      [
        medicamentoId,
        farmaciaId,
        preco,
        renovacoes,
        farmacias,
      ]
    );

  // ==========================================================
  // REFERÊNCIA DE VALIDADE
  // ==========================================================

  const calcularValidadePadrao =
    useCallback(
      (
        tipoReceita:
          TipoReceita,
        dataPrescricaoISO:
          string
      ): string => {
        const dias =
          VALIDADE_RECEITA_DIAS[
            tipoReceita
          ];

        /*
         * Não inventamos 30 dias.
         *
         * Se o Vault não possui uma referência numérica para esse
         * tipo de receita, devolvemos vazio e deixamos o usuário
         * informar a próxima data manualmente.
         */
        if (
          typeof dias !==
            "number" ||
          !Number.isFinite(
            dias
          ) ||
          dias <=
            0
        ) {
          return "";
        }

        return addDaysToCivilDate(
          dataPrescricaoISO,
          dias
        );
      },
      []
    );

  return {
    analisePreco,

    calcularValidadePadrao,
  };
}