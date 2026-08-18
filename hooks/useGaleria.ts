// hooks/useGaleria.ts
"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

// Tipagem unificada para a Galeria não importar de onde o arquivo veio
export interface GalleryItem {
  id: string; // ID único gerado para a renderização
  source_id: string; // ID original do documento ou anexo
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

export function useGaleria(personIdFilter?: string) {
  // 1. Busca todos os documentos que possuem anexos
  const documentosRaw = useLiveQuery(() => db.documents.toArray(), []) || [];

  // 2. Busca todos os anexos clínicos soltos
  const anexosClinicosRaw =
    useLiveQuery(() => db.anexos_clinicos.toArray(), []) || [];

  // 3. Busca renovações que possuem foto da receita/comprovante
  const renovacoesRaw =
    useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const items = useMemo(() => {
    const combined: GalleryItem[] = [];

    // --- Processa Documentos (RG, CNH, Laudos, Prontuários) ---
    documentosRaw.forEach((doc) => {
      // Se tiver filtro de pessoa e não bater, ignora
      if (personIdFilter && doc.person_id !== personIdFilter) return;
      if (!doc.attachments || doc.attachments.length === 0) return;

      doc.attachments.forEach((att, index) => {
        combined.push({
          id: `doc-${doc.id}-${index}`,
          source_id: doc.id!,
          source_table: "documents",
          url: att.url,
          file_type:
            att.type || (att.url.toLowerCase().includes(".pdf") ? "pdf" : "image"),
          category: doc.category_id === "pessoal" ? "pessoal" : "saude",
          person_id: doc.person_id,
          title: doc.title,
          subtitle: doc.type.toUpperCase().replace("_", " "),
          date: String(
            doc.metadata?.date ||
              doc.metadata?.issue_date ||
              doc.created_at ||
              ""
          ),
        });
      });
    });

    // --- Processa Anexos Clínicos (Links com tratamentos/medicamentos) ---
    anexosClinicosRaw.forEach((anexo) => {
      if (personIdFilter && anexo.person_id !== personIdFilter) return;
      if (!anexo.url) return;

      combined.push({
        id: `anx-${anexo.id}`,
        source_id: anexo.id!,
        source_table: "anexos_clinicos",
        url: anexo.url,
        thumbnail_url: anexo.thumbnail_url,
        file_type: anexo.url.toLowerCase().includes(".pdf") ? "pdf" : "image",
        category: "saude", // Anexos clínicos são sempre saúde
        person_id: anexo.person_id || "",
        title: anexo.tipo || "Anexo Clínico",
        subtitle: (anexo.tags as string[] || []).join(", ") || "Arquivo de saúde",
        date: String(anexo.created_at || ""),
      });
    });

    // --- Processa Renovações de Medicamentos ---
    renovacoesRaw.forEach((ren) => {
      if (personIdFilter && ren.person_id !== personIdFilter) return;
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

    // Ordena do mais recente para o mais antigo
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [documentosRaw, anexosClinicosRaw, renovacoesRaw, personIdFilter]);

  // Função utilitária que agrupa a lista final por Mês/Ano (ex: "Agosto 2026")
  const groupedItems = useMemo(() => {
    const groups: Record<string, GalleryItem[]> = {};

    items.forEach((item) => {
      const d = new Date(item.date);
      // Evita datas inválidas
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