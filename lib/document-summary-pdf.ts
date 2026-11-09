"use client";

import jsPDF from "jspdf";
import type { Document } from "@/lib/types";
import { deliverPdf } from "@/lib/pdfExport";

/** Exporta apenas registros fornecidos pela tela, sem requisitar dados de outra pessoa.
 * A exportacao nunca afirma incorporar anexos originais ou reproduzir o documento.
 */
export async function exportDocumentSummariesToPDF(documents: readonly Document[]): Promise<void> {
  if (!documents.length) throw new Error("Nenhum documento carregado para exportar.");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pdf.setProperties({ title: "VAULT - Resumo dos documentos", creator: "VAULT" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const left = 42;
  const maxWidth = width - left * 2;
  let y = 45;

  const nextPage = () => { pdf.addPage(); y = 45; };
  const line = (value: string, size = 10, bold = false) => {
    const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 1500);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const rows: string[] = pdf.splitTextToSize(clean, maxWidth);
    const leading = Math.max(14, Math.ceil(size * 1.35));
    for (const row of rows) {
      if (y + leading > height - 42) nextPage();
      pdf.text(String(row), left, y);
      y += leading;
    }
  };
  line("VAULT | RESUMO DOS DOCUMENTOS", 16, true);
  line("Listagem gerada a pedido do usuario. Conteudo confidencial.", 10);
  line("Nao substitui documento original e nao incorpora fotos nem anexos.", 10);
  line(`${documents.length} registro(s) carregado(s) nesta listagem`, 10, true);
  y += 12;
  documents.forEach((doc, index) => {
    if (y > height - 155) nextPage();
    line(`${index + 1}. ${doc.title || "Documento sem titulo"}`, 13, true);
    line(`Tipo: ${String(doc.type || "nao informado").replace(/_/g, " ")}`);
    line(`Area: ${String(doc.category_id || "nao informada")}`);
    if (doc.description?.trim()) line(`Observacoes: ${doc.description}`);
    const metadata = doc.metadata || {};
    for (const [key, label] of [
      ["cpf", "CPF"], ["rg_number", "RG"], ["number", "Numero"],
      ["issuer", "Emissor"], ["issue_date", "Emissao"],
      ["expiry_date", "Validade"],
    ] as const) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) line(`${label}: ${value}`);
    }
    line(`Anexos registrados: ${doc.attachments?.length ?? 0} (nao incorporados)`);
    y += 16;
  });
  const pages = pdf.getNumberOfPages();
  for (let index = 1; index <= pages; index++) {
    pdf.setPage(index);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`VAULT | Resumo privado | Pagina ${index} de ${pages}`, left, height - 25);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  await deliverPdf(pdf, `vault-resumo-documentos-${stamp}.pdf`, "Resumo de documentos do VAULT");
}
