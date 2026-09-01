// hooks/useGaleria.ts
"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useActivePersonId } from "./useActivePersonId";

export interface GalleryItem {
  id: string;
  source_id: string;
  source_table: "documents" | "anexos_clinicos" | "renovacoes";
  url: string;
  thumbnail_url?: string;
  file_type: "image" | "pdf";
  category: "saude" | "pessoal" | "outros";
  person_id: string;
  title: string;
  subtitle?: string;
  date: string;
}

function inferFileType(
  url: string,
  explicitType?: string
): "image" | "pdf" {
  if (explicitType === "pdf") return "pdf";
  if (explicitType === "image") return "image";

  const cleanUrl = url
    .toLowerCase()
    .split("?")[0]
    .split("#")[0];

  return cleanUrl.endsWith(".pdf")
    ? "pdf"
    : "image";
}

function normalizeDate(
  value: unknown,
  fallback = ""
): string {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value.toISOString();
  }

  return fallback;
}

export function useGaleria() {
  const { activePersonId } =
    useActivePersonId();

  const documentosQuery =
    useLiveQuery(
      () => {
        if (!activePersonId) {
          return [];
        }

        return db.documents
          .where("person_id")
          .equals(activePersonId)
          .toArray();
      },
      [activePersonId]
    );

  const anexosClinicosQuery =
    useLiveQuery(
      () => {
        if (!activePersonId) {
          return [];
        }

        return db.anexos_clinicos
          .where("person_id")
          .equals(activePersonId)
          .toArray();
      },
      [activePersonId]
    );

  const renovacoesQuery =
    useLiveQuery(
      () => {
        if (!activePersonId) {
          return [];
        }

        return db.renovacoes
          .where("person_id")
          .equals(activePersonId)
          .toArray();
      },
      [activePersonId]
    );

  const isLoading =
    Boolean(activePersonId) &&
    (
      documentosQuery === undefined ||
      anexosClinicosQuery === undefined ||
      renovacoesQuery === undefined
    );

  const documentosRaw =
    documentosQuery ?? [];

  const anexosClinicosRaw =
    anexosClinicosQuery ?? [];

  const renovacoesRaw =
    renovacoesQuery ?? [];

  const items = useMemo(() => {
    if (!activePersonId) {
      return [];
    }

    const combined: GalleryItem[] =
      [];

    documentosRaw.forEach(
      (doc) => {
        if (
          doc.person_id !==
          activePersonId
        ) {
          return;
        }

        if (
          !doc.attachments?.length
        ) {
          return;
        }

        doc.attachments.forEach(
          (att, index) => {
            if (!att?.url) {
              return;
            }

            combined.push({
              id: `doc-${doc.id}-${index}`,
              source_id: doc.id!,
              source_table:
                "documents",
              url: att.url,
              file_type:
                inferFileType(
                  att.url,
                  att.type
                ),
              category:
                doc.category_id ===
                "pessoal"
                  ? "pessoal"
                  : "saude",
              person_id:
                doc.person_id,
              title:
                doc.title,
              subtitle:
                doc.type
                  ?.toUpperCase()
                  .replaceAll(
                    "_",
                    " "
                  ) ||
                "Documento",
              date:
                normalizeDate(
                  doc.metadata
                    ?.date ??
                    doc.metadata
                      ?.issue_date ??
                    doc.created_at
                ),
            });
          }
        );
      }
    );

    anexosClinicosRaw.forEach(
      (anexo) => {
        if (
          anexo.person_id !==
          activePersonId
        ) {
          return;
        }

        if (!anexo.url) {
          return;
        }

        combined.push({
          id: `anx-${anexo.id}`,
          source_id:
            anexo.id!,
          source_table:
            "anexos_clinicos",
          url: anexo.url,
          thumbnail_url:
            anexo.thumbnail_url,
          file_type:
            inferFileType(
              anexo.url
            ),
          category: "saude",
          person_id:
            anexo.person_id,
          title:
            anexo.tipo ||
            "Anexo Clínico",
          subtitle:
            (
              (anexo.tags as string[]) ||
              []
            ).join(", ") ||
            "Arquivo de saúde",
          date:
            normalizeDate(
              anexo.created_at
            ),
        });
      }
    );

    renovacoesRaw.forEach(
      (ren) => {
        if (
          ren.person_id !==
          activePersonId
        ) {
          return;
        }

        if (!ren.anexo_url) {
          return;
        }

        combined.push({
          id: `ren-${ren.id}`,
          source_id:
            ren.id!,
          source_table:
            "renovacoes",
          url:
            ren.anexo_url,
          file_type:
            inferFileType(
              ren.anexo_url
            ),
          category: "saude",
          person_id:
            ren.person_id,
          title:
            "Comprovante / Receita",
          subtitle:
            ren.medicamento_nome
              ?.trim()
              ? `Renovação · ${ren.medicamento_nome.trim()}`
              : "Renovação de medicamento",
          date:
            normalizeDate(
              ren.data,
              normalizeDate(
                ren.created_at
              )
            ),
        });
      }
    );

    return combined.sort(
      (a, b) => {
        const aTime =
          new Date(
            a.date
          ).getTime();

        const bTime =
          new Date(
            b.date
          ).getTime();

        const safeA =
          Number.isNaN(aTime)
            ? 0
            : aTime;

        const safeB =
          Number.isNaN(bTime)
            ? 0
            : bTime;

        return safeB - safeA;
      }
    );
  }, [
    activePersonId,
    documentosRaw,
    anexosClinicosRaw,
    renovacoesRaw,
  ]);

  const groupedItems =
    useMemo(() => {
      const groups: Record<
        string,
        GalleryItem[]
      > = {};

      items.forEach(
        (item) => {
          const d =
            new Date(
              item.date
            );

          if (
            Number.isNaN(
              d.getTime()
            )
          ) {
            return;
          }

          const mesAno =
            d.toLocaleDateString(
              "pt-BR",
              {
                month: "long",
                year: "numeric",
              }
            );

          const label =
            mesAno
              .charAt(0)
              .toUpperCase() +
            mesAno.slice(1);

          if (
            !groups[label]
          ) {
            groups[label] =
              [];
          }

          groups[label].push(
            item
          );
        }
      );

      return groups;
    }, [items]);

  return {
    items,
    groupedItems,
    isLoading,
  };
}