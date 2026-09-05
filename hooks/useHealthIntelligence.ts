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

export type HealthIntelligenceSource = {
  key: string;
  label: string;
  count: number;
  hasData: boolean;
};

export type HealthIntelligenceMaturity = {
  score: number;
  label: string;
  sourcesWithData: number;
  totalSources: number;
  totalRecords: number;
  sources: HealthIntelligenceSource[];
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
        const sources: HealthIntelligenceSource[] = [
          {
            key:
              "medicamentos",
            label:
              "Medicamentos",
            count:
              context?.medicamentos.length ??
              0,
            hasData:
              (context?.medicamentos.length ??
                0) >
              0,
          },
          {
            key:
              "doseLogs",
            label:
              "Registros de doses",
            count:
              context?.doseLogs.length ??
              0,
            hasData:
              (context?.doseLogs.length ??
                0) >
              0,
          },
          {
            key:
              "renovacoes",
            label:
              "Renovações e aquisições",
            count:
              context?.renovacoes.length ??
              0,
            hasData:
              (context?.renovacoes.length ??
                0) >
              0,
          },
          {
            key:
              "tratamentos",
            label:
              "Tratamentos",
            count:
              context?.tratamentos.length ??
              0,
            hasData:
              (context?.tratamentos.length ??
                0) >
              0,
          },
          {
            key:
              "registrosSaude",
            label:
              "Registros de saúde",
            count:
              context?.registrosSaude.length ??
              0,
            hasData:
              (context?.registrosSaude.length ??
                0) >
              0,
          },
          {
            key:
              "consultas",
            label:
              "Consultas",
            count:
              context?.consultas.length ??
              0,
            hasData:
              (context?.consultas.length ??
                0) >
              0,
          },
          {
            key:
              "exames",
            label:
              "Exames",
            count:
              context?.exames.length ??
              0,
            hasData:
              (context?.exames.length ??
                0) >
              0,
          },
          {
            key:
              "cirurgias",
            label:
              "Cirurgias",
            count:
              context?.cirurgias.length ??
              0,
            hasData:
              (context?.cirurgias.length ??
                0) >
              0,
          },
          {
            key:
              "cids",
            label:
              "CIDs",
            count:
              context?.cids.length ??
              0,
            hasData:
              (context?.cids.length ??
                0) >
              0,
          },
          {
            key:
              "documentos",
            label:
              "Documentos de saúde",
            count:
              context?.documentos.length ??
              0,
            hasData:
              (context?.documentos.length ??
                0) >
              0,
          },
        ];

        const sourcesWithData =
          sources.filter(
            (source) =>
              source.hasData
          ).length;

        const totalRecords =
          sources.reduce(
            (
              total,
              source
            ) =>
              total +
              source.count,
            0
          );

        if (
          !context
        ) {
          return {
            score: 0,
            label:
              "Aguardando histórico",
            sourcesWithData,
            totalSources:
              sources.length,
            totalRecords,
            sources,
          };
        }

        /*
         * Índice de maturidade do contexto, não da saúde.
         *
         * Mede apenas variedade, volume e capacidade atual de
         * produzir padrões. Nunca representa diagnóstico.
         */
        const coverage =
          sources.length >
          0
            ? sourcesWithData /
              sources.length
            : 0;

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
          sources,
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
