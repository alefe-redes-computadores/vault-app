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

export function useGaleria() {
  const { activePersonId } = useActivePersonId();

  const documentosRaw = useLiveQuery(
    () => {
      if (!activePersonId) return [];
      return db.documents.where("person_id").equals(activePersonId).toArray();
    },
    [activePersonId],
    []
  ) || [];

  const anexosClinicosRaw = useLiveQuery(
    () => {
      if (!activePersonId) return [];
      return db.anexos_clinicos.where("person_id").equals(activePersonId).toArray();
    },
    [activePersonId],
    []
  ) || [];

  const renovacoesRaw = useLiveQuery(
    () => {
      if (!activePersonId) return [];
      return db.renovacoes.where("person_id").equals(activePersonId).toArray();
    },
    [activePersonId],
    []
  ) || [];

  const items = useMemo(() => {
    const combined: GalleryItem[] = [];

    documentosRaw.forEach((doc) => {
      if (!doc.attachments || doc.attachments.length === 0) return;

      doc.attachments.forEach((att, index) => {
        combined.push({
          id: `doc-${doc.id}-${index}`,
          source_id: doc.id!,
          source_table: "documents",
          url: att.url,
          file_type: att.type || (att.url.toLowerCase().includes(".pdf") ? "pdf" : "image"),
          category: doc.category_id === "pessoal" ? "pessoal" : "saude",
          person_id: doc.person_id,
          title: doc.title,
          subtitle: doc.type.toUpperCase().replace("_", " "),
          date: String(doc.metadata?.date || doc.metadata?.issue_date || doc.created_at || ""),
        });
      });
    });

    anexosClinicosRaw.forEach((anexo) => {
      if (!anexo.url) return;

      combined.push({
        id: `anx-${anexo.id}`,
        source_id: anexo.id!,
        source_table: "anexos_clinicos",
        url: anexo.url,
        thumbnail_url: anexo.thumbnail_url,
        file_type: anexo.url.toLowerCase().includes(".pdf") ? "pdf" : "image",
        category: "saude",
        person_id: anexo.person_id || "",
        title: anexo.tipo || "Anexo Clínico",
        subtitle: (anexo.tags as string[] || []).join(", ") || "Arquivo de saúde",
        date: String(anexo.created_at || ""),
      });
    });

    renovacoesRaw.forEach((ren) => {
      if (!ren.anexo_url) return;

      combined.push({
        id: `ren-${ren.id}`,
        source_id: ren.id!,
        source_table: "renovacoes",
        url: ren.anexo_url,
        file_type: ren.anexo_url.toLowerCase().includes(".pdf") ? "pdf" : "image",
        category: "saude",
        person_id: ren.person_id || "",
        title: "Comprovante / Receita",
        subtitle: "Renovação de Medicamento",
        date: String(ren.data || ren.created_at || new Date().toISOString()),
      });
    });

    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [documentosRaw, anexosClinicosRaw, renovacoesRaw]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, GalleryItem[]> = {};

    items.forEach((item) => {
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;

      const mesAno = d.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      const label = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  }, [items]);

  return {
    items,
    groupedItems,
    isLoading: documentosRaw === undefined || anexosClinicosRaw === undefined,
  };
}