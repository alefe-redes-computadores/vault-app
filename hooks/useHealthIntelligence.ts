// hooks/useHealthIntelligence.ts
"use client";

import {
  useMemo,
} from "react";

import {
  useLiveQuery,
} from "dexie-react-hooks";

import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  gerarInsightsSaude,
  validarHealthInsightContext,
} from "@/lib/health-insights";

import {
  getLocalTodayISO,
} from "@/lib/health-utils";

import {
  loadHealthInsightContext,
} from "@/lib/health-intelligence/context";

import {
  selectHealthHighlights,
} from "@/lib/health-intelligence/select-highlights";

export type HealthIntelligenceMaturity = {
  score: number;
  label: string;
  sourcesWithData: number;
  totalSources: number;
  totalRecords: number;
};

export function useHealthIntelligence() {
  const {
    activePersonId,
  } =
    useActivePersonId();

  const hoje =
    getLocalTodayISO();

  /*
   * useLiveQuery observa todas as consultas Dexie executadas
   * pelo loader. Qualquer alteração relevante recalcula o
   * contexto e os padrões automaticamente.
   */
  const context =
    useLiveQuery(
      () => {
        if (
          !activePersonId
        ) {
          return null;
        }

        return loadHealthInsightContext(
          activePersonId,
          hoje
        );
      },
      [
        activePersonId,
        hoje,
      ]
    );

  const insights =
    useMemo(
      () =>
        context
          ? gerarInsightsSaude(
              context
            )
          : [],
      [
        context,
      ]
    );

  const highlights =
    useMemo(
      () =>
        selectHealthHighlights(
          insights,
          {
            limit: 3,
            minimumSample: 3,
          }
        ),
      [
        insights,
      ]
    );

  const validation =
    useMemo(
      () =>
        context
          ? validarHealthInsightContext(
              context
            )
          : null,
      [
        context,
      ]
    );

  const maturity =
    useMemo<
      HealthIntelligenceMaturity
    >(
      () => {
        if (
          !context
        ) {
          return {
            score: 0,
            label:
              "Aguardando histórico",
            sourcesWithData: 0,
            totalSources: 10,
            totalRecords: 0,
          };
        }

        const sources = [
          context.medicamentos,
          context.doseLogs,
          context.renovacoes,
          context.tratamentos,
          context.registrosSaude,
          context.consultas,
          context.exames,
          context.cirurgias,
          context.cids,
          context.documentos,
        ];

        const sourcesWithData =
          sources.filter(
            (source) =>
              source.length >
              0
          ).length;

        const totalRecords =
          sources.reduce(
            (
              total,
              source
            ) =>
              total +
              source.length,
            0
          );

        /*
         * Índice de maturidade do contexto, não da saúde.
         *
         * Mede apenas variedade, volume e capacidade atual de
         * produzir padrões. Nunca representa diagnóstico.
         */
        const coverage =
          sourcesWithData /
          sources.length;

        const volume =
          Math.min(
            totalRecords /
              100,
            1
          );

        const learned =
          Math.min(
            insights.length /
              10,
            1
          );

        const score =
          Math.min(
            100,
            Math.round(
              coverage *
                50 +
              volume *
                30 +
              learned *
                20
            )
          );

        const label =
          score <
          25
            ? "Começando a aprender"
            : score <
                55
              ? "Construindo padrões"
              : score <
                  80
                ? "Contexto consistente"
                : "Contexto maduro";

        return {
          score,
          label,
          sourcesWithData,
          totalSources:
            sources.length,
          totalRecords,
        };
      },
      [
        context,
        insights.length,
      ]
    );

  return {
    context:
      context ??
      null,

    insights,

    highlights,

    validation,

    maturity,

    isLoading:
      Boolean(
        activePersonId
      ) &&
      context ===
        undefined,

    hasPerson:
      Boolean(
        activePersonId
      ),
  };
}
