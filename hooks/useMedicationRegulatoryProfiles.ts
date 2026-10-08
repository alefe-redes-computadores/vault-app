"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  Medicamento,
} from "@/lib/types";

import type {
  MedicationReference,
} from "@/lib/medication-intelligence/types";

import {
  normalizeMedicationText,
} from "@/lib/medication-intelligence/normalize";

import {
  supabaseMedicationCatalogProvider,
} from "@/lib/medication-catalog";

import {
  getMedicationCatalogAuthority,
  type MedicationCatalogAuthorityState,
} from "@/lib/medication-catalog/authority";

import {
  isPharmaceuticallyEquivalentName,
} from "@/lib/medication-catalog/pharmaceutical-equivalence";

import {
  resolveMedicationRegulatoryVisual,
  type MedicationRegulatoryVisual,
} from "@/lib/medication-regulatory-visual";

const referenceCache =
  new Map<
    string,
    MedicationReference
  >();

const referenceInflight =
  new Map<
    string,
    Promise<MedicationReference | null>
  >();

const REGULATORY_SNAPSHOT_KEY =
  "@vault:medication_regulatory_profiles:v97_2";

type RegulatorySnapshot =
  Record<
    string,
    MedicationRegulatoryVisual
  >;

function readRegulatorySnapshot():
  RegulatorySnapshot {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const raw =
      window.localStorage.getItem(
        REGULATORY_SNAPSHOT_KEY
      );

    if (
      !raw
    ) {
      return {};
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as RegulatorySnapshot;
  } catch {
    return {};
  }
}

function writeRegulatorySnapshot(
  snapshot:
    RegulatorySnapshot
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      REGULATORY_SNAPSHOT_KEY,
      JSON.stringify(
        snapshot
      )
    );
  } catch {
    // Snapshot é aceleração de UX.
    // Falha de storage nunca bloqueia o catálogo.
  }
}

function snapshotKeyFor(
  medication:
    Medicamento
): string {
  return normalizeMedicationText(
    medication.nome
  );
}

async function resolveReference(
  medication:
    Medicamento
): Promise<
  MedicationReference | null
> {
  const key =
    normalizeMedicationText(
      medication.nome
    );

  if (
    !key
  ) {
    return null;
  }

  const cached =
    referenceCache.get(
      key
    );

  if (
    cached
  ) {
    return cached;
  }

  const running =
    referenceInflight.get(
      key
    );

  if (
    running
  ) {
    return running;
  }

  const request =
    (async () => {
      try {
        /*
         * VAULT_REGULATORY_STABILITY_V97_2_R1
         *
         * Busca mais ampla serve apenas para DESCOBERTA.
         * Autoridade continua exigindo:
         * - correspondência nominal exata; OU
         * - equivalência farmacêutica determinística.
         */
        const quick =
          await supabaseMedicationCatalogProvider.searchLight(
            medication.nome,
            {
              limit: 8,
              minimumScore: 0.5,
            }
          );

        const accepted =
          quick.find(
            (
              item
            ) =>
              normalizeMedicationText(
                item.matchedText
              ) === key ||
              normalizeMedicationText(
                item.canonicalName
              ) === key ||
              isPharmaceuticallyEquivalentName(
                item.matchedText,
                medication.nome
              ) ||
              isPharmaceuticallyEquivalentName(
                item.canonicalName,
                medication.nome
              )
          );

        if (
          !accepted
        ) {
          /*
           * Importante:
           * resultado negativo NÃO entra no cache.
           *
           * Uma consulta transitória ou catálogo ainda
           * carregando não pode condenar o medicamento
           * a "Informado" até recarregar o app.
           */
          return null;
        }

        const hydrated =
          await supabaseMedicationCatalogProvider.hydrateQuickResult(
            accepted
          );

        const reference =
          hydrated?.reference ||
          null;

        if (
          reference
        ) {
          referenceCache.set(
            key,
            reference
          );
        }

        return reference;
      } catch {
        return null;
      } finally {
        referenceInflight.delete(
          key
        );
      }
    })();

  referenceInflight.set(
    key,
    request
  );

  return request;
}

function initialProfilesFor(
  medications:
    Medicamento[]
): Record<
  string,
  MedicationRegulatoryVisual
> {
  const snapshot =
    readRegulatorySnapshot();

  return Object.fromEntries(
    medications
      .filter(
        (
          item
        ) =>
          Boolean(
            item.id
          )
      )
      .map(
        (
          item
        ) => {
          const snapshotProfile =
            snapshot[
              snapshotKeyFor(
                item
              )
            ];

          return [
            item.id!,
            snapshotProfile ||
              resolveMedicationRegulatoryVisual(
                item
              ),
          ];
        }
      )
  );
}

export function useMedicationRegulatoryProfiles(
  medications:
    Medicamento[]
): Record<
  string,
  MedicationRegulatoryVisual
> {
  const [
    profiles,
    setProfiles,
  ] =
    useState<
      Record<
        string,
        MedicationRegulatoryVisual
      >
    >(
      () =>
        initialProfilesFor(
          medications
        )
    );

  useEffect(
    () => {
      let cancelled =
        false;

      /*
       * Não zeramos a tela com fallback manual enquanto
       * o catálogo revalida.
       *
       * Apenas adicionamos fallback para medicamentos
       * ainda desconhecidos nesta montagem.
       */
      setProfiles(
        (
          previous
        ) => {
          const next = {
            ...previous,
          };

          for (
            const item of medications
          ) {
            if (
              !item.id ||
              next[item.id]
            ) {
              continue;
            }

            const snapshot =
              readRegulatorySnapshot();

            next[item.id] =
              snapshot[
                snapshotKeyFor(
                  item
                )
              ] ||
              resolveMedicationRegulatoryVisual(
                item
              );
          }

          return next;
        }
      );

      void (async () => {
        const resolved =
          await Promise.all(
            medications
              .filter(
                (
                  item
                ) =>
                  Boolean(
                    item.id
                  )
              )
              .map(
                async (
                  item
                ) => {
                  const reference =
                    await resolveReference(
                      item
                    );

                  if (
                    !reference
                  ) {
                    return null;
                  }

                  return [
                    item,
                    resolveMedicationRegulatoryVisual(
                      item,
                      reference
                    ),
                  ] as const;
                }
              )
          );

        if (
          cancelled
        ) {
          return;
        }

        const authoritative =
          resolved.filter(
            (
              entry
            ): entry is readonly [
              Medicamento,
              MedicationRegulatoryVisual
            ] =>
              Boolean(
                entry
              )
          );

        if (
          authoritative.length ===
          0
        ) {
          return;
        }

        setProfiles(
          (
            previous
          ) => {
            const next = {
              ...previous,
            };

            const snapshot =
              readRegulatorySnapshot();

            for (
              const [
                medication,
                profile,
              ] of authoritative
            ) {
              if (
                !medication.id
              ) {
                continue;
              }

              next[
                medication.id
              ] =
                profile;

              snapshot[
                snapshotKeyFor(
                  medication
                )
              ] =
                profile;
            }

            writeRegulatorySnapshot(
              snapshot
            );

            return next;
          }
        );
      })();

      return () => {
        cancelled =
          true;
      };
    },
    [
      medications,
    ]
  );

  return profiles;
}

export type MedicationCatalogIdentity = {
  activeIngredient:
    string | null;

  activeIngredients:
    string[];

  canonicalName:
    string | null;

  sourceLabel:
    string | null;

  authorityState:
    MedicationCatalogAuthorityState;

  authorityLabel:
    string;

  authorityDetail:
    string;

  referenceType:
    "product" |
    "substance" |
    null;

  registrationNumber:
    string | null;

  manufacturer:
    string | null;

  presentationCount:
    number;
};

// VAULT_MEDICATION_IDENTITY_V95_2
// A identidade usa o MESMO resolvedor/inflight do perfil.
// Isso elimina duas consultas concorrentes para o mesmo medicamento.
export function useMedicationCatalogIdentities(
  medications:
    Medicamento[]
): Record<
  string,
  MedicationCatalogIdentity
> {
  const [
    identities,
    setIdentities,
  ] =
    useState<
      Record<
        string,
        MedicationCatalogIdentity
      >
    >({});

  useEffect(
    () => {
      let cancelled =
        false;

      void (async () => {
        const resolved =
          await Promise.all(
            medications
              .filter(
                (
                  item
                ) =>
                  Boolean(
                    item.id
                  )
              )
              .map(
                async (
                  item
                ) => {
                  const reference =
                    await resolveReference(
                      item
                    );

                  const authority =
                    getMedicationCatalogAuthority(
                      item.nome,
                      reference
                    );

                  const activeIngredient =
                    authority
                      .activeIngredients[
                        0
                      ] ||
                    null;

                  return [
                    item.id!,
                    {
                      activeIngredient,
                      activeIngredients:
                        authority.activeIngredients,
                      canonicalName:
                        reference
                          ?.canonicalName ||
                        null,
                      sourceLabel:
                        authority.sourceLabel,
                      authorityState:
                        authority.state,
                      authorityLabel:
                        authority.label,
                      authorityDetail:
                        authority.detail,
                      referenceType:
                        authority.referenceType,
                      registrationNumber:
                        authority.registrationNumber,
                      manufacturer:
                        authority.manufacturer,
                      presentationCount:
                        authority.presentationCount,
                    },
                  ] as const;
                }
              )
          );

        if (
          !cancelled
        ) {
          setIdentities(
            Object.fromEntries(
              resolved
            )
          );
        }
      })();

      return () => {
        cancelled =
          true;
      };
    },
    [
      medications,
    ]
  );

  return identities;
}
