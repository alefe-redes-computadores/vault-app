// app/saude/cids/page.tsx
"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  Calendar,
  FileText,
  Stethoscope,
} from "lucide-react";
import {
  useLiveQuery,
} from "dexie-react-hooks";

import { db } from "@/lib/db";
import {
  useHapticFeedback,
} from "@/lib/haptics";
import {
  getCidInsights,
} from "@/lib/health-insights";
import {
  getClinicalTheme,
} from "@/lib/health-utils";

import {
  useCids,
} from "@/hooks/useCids";
import {
  useActivePersonId,
} from "@/hooks/useActivePersonId";

import {
  PageTransition,
} from "@/components/PageTransition";
import {
  EmptyState,
} from "@/components/EmptyState";
import {
  ListCard,
  ListPageHeader,
  ListSearch,
} from "@/components/list";

// ============================================================
// PÁGINA
// ============================================================

export default function CidsPage() {
  const router =
    useRouter();

  const {
    trigger,
  } =
    useHapticFeedback();

  const {
    cids,
  } =
    useCids();

  const {
    activePersonId,
  } =
    useActivePersonId();

  const [
    search,
    setSearch,
  ] =
    useState("");

  // ==========================================================
  // MÉDICOS
  //
  // Médico é cadastro global por usuário.
  // Não filtramos por person_id.
  // ==========================================================

  const medicos =
    useLiveQuery(
      () =>
        db.medicos.toArray(),
      [],
      []
    ) || [];

  const medicosMap =
    useMemo(
      () =>
        new Map(
          medicos.map(
            (medico) => [
              medico.id,
              medico,
            ]
          )
        ),
      [
        medicos,
      ]
    );

  // ==========================================================
  // FILTRO
  //
  // useCids já retorna exclusivamente os registros da
  // activePersonId. Não repetimos filtro permissivo aqui.
  // ==========================================================

  const filteredCids =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      const result =
        normalizedSearch
          ? cids.filter(
              (cid) =>
                cid.codigo
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  ) ||
                cid.descricao
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
            )
          : [
              ...cids,
            ];

      return result.sort(
        (
          first,
          second
        ) =>
          first.codigo.localeCompare(
            second.codigo,
            "pt-BR",
            {
              numeric:
                true,
            }
          )
      );
    }, [
      cids,
      search,
    ]);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="CIDs e Diagnósticos"
          subtitle={
            activePersonId
              ? `${filteredCids.length} registros`
              : "Nenhuma pessoa ativa"
          }
          badgeLabel="REGISTROS CLÍNICOS"
          badgeColor="text-violet-400"
          icon={
            <FileText
              size={
                14
              }
            />
          }
          iconColor="text-violet-400"
        >
          <ListSearch
            value={
              search
            }
            onChange={
              setSearch
            }
            placeholder="Buscar por código ou descrição..."
          />
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {!activePersonId ? (
            <EmptyState
              icon={
                FileText
              }
              title="Nenhuma pessoa ativa"
              description="Selecione uma pessoa no Vault para visualizar os diagnósticos."
            />
          ) : filteredCids.length ===
            0 ? (
            <EmptyState
              icon={
                FileText
              }
              title={
                search
                  ? "Nenhum CID encontrado"
                  : "Nenhum CID cadastrado"
              }
              description={
                search
                  ? "Tente ajustar a busca."
                  : "Cadastre diagnósticos para acompanhar tratamentos e outros registros clínicos da pessoa ativa."
              }
            />
          ) : (
            filteredCids.map(
              (
                cid,
                index
              ) => {
                const insight =
                  getCidInsights(
                    cid.codigo
                  );

                const medico =
                  cid.medico_id
                    ? medicosMap.get(
                        cid.medico_id
                      )
                    : undefined;

                const theme =
                  getClinicalTheme(
                    cid.descricao ||
                      cid.codigo
                  );

                const IconComp =
                  theme.icon;

                return (
                  <ListCard
                    key={
                      cid.id
                    }
                    id={
                      cid.id!
                    }
                    color={
                      theme.hex
                    }
                    onClick={() => {
                      trigger(
                        "vibrate"
                      );

                      router.push(
                        `/saude/cids/detalhes?id=${cid.id}`
                      );
                    }}
                    delay={
                      index *
                      0.025
                    }
                    icon={
                      <IconComp
                        size={
                          22
                        }
                      />
                    }
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                        {
                          cid.codigo
                        }
                      </h3>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${theme.tagClass}`}
                      >
                        CID
                      </span>

                      {insight && (
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-raised px-2 py-0.5 text-[9px] text-ink-muted">
                          {
                            insight.categoria
                          }
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {
                        cid.descricao
                      }
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      {cid.data_diagnostico && (
                        <span className="flex items-center gap-1">
                          <Calendar
                            size={
                              12
                            }
                            className="text-ink-faint"
                          />

                          {new Date(
                            `${cid.data_diagnostico}T12:00:00`
                          ).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      )}

                      {medico && (
                        <span className="flex items-center gap-1">
                          <Stethoscope
                            size={
                              12
                            }
                            className="text-ice"
                          />

                          Dr(a).{" "}
                          {
                            medico.nome
                          }
                        </span>
                      )}
                    </div>
                  </ListCard>
                );
              }
            )
          )}
        </section>
      </main>
    </PageTransition>
  );
}