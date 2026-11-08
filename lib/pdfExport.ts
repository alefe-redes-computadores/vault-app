// lib/pdfExport.ts

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import type { RefObject } from "react";
import { Capacitor } from "@capacitor/core";

// ============================================================
// TIPOS
// ============================================================

interface ExportCardOptions {
  cardRef: RefObject<HTMLElement>;
  title?: string;
  filename?: string;
}

interface ExportCardsOptions {
  cards: RefObject<HTMLElement>[];
  title?: string;
  filename?: string;
  onProgress?: (
    current: number,
    total: number
  ) => void;
}

// ============================================================
// CONSTANTES
// ============================================================

const PDF_BACKGROUND =
  "#0A0C0F";

const PDF_SCALE =
  2;

const PDF_CONTENT_RATIO =
  0.95;

// ============================================================
// HELPERS
// ============================================================

function createPdf(
  title:
    string
): jsPDF {
  const pdf =
    new jsPDF({
      orientation:
        "portrait",

      unit:
        "px",

      format:
        "a4",

      hotfixes: [
        "px_scaling",
      ],
    });

  /*
   * O título já fazia parte da API pública do utilitário,
   * mas antes não era utilizado.
   */
  pdf.setProperties({
    title,
    creator:
      "Vault",
  });

  return pdf;
}

async function captureElement(
  element:
    HTMLElement
): Promise<HTMLCanvasElement> {
  return html2canvas(
    element,
    {
      scale:
        PDF_SCALE,

      useCORS:
        true,

      logging:
        false,

      backgroundColor:
        PDF_BACKGROUND,

      /*
       * Com useCORS habilitado, não queremos aceitar um canvas
       * contaminado por recursos cross-origin, porque isso pode
       * fazer canvas.toDataURL() falhar depois.
       */
      allowTaint:
        false,

      width:
        element.scrollWidth,

      height:
        element.scrollHeight,

      /*
       * Garante que a captura parte do início do elemento mesmo
       * quando a página atual está rolada.
       */
      scrollX:
        0,

      scrollY:
        -window.scrollY,
    }
  );
}

function addCanvasToCurrentPage(
  pdf:
    jsPDF,
  canvas:
    HTMLCanvasElement
): void {
  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const imgWidth =
    canvas.width;

  const imgHeight =
    canvas.height;

  if (
    imgWidth <=
      0 ||
    imgHeight <=
      0
  ) {
    throw new Error(
      "O card não possui dimensões válidas para exportação."
    );
  }

  const ratio =
    Math.min(
      pageWidth /
        imgWidth,
      pageHeight /
        imgHeight
    );

  const finalWidth =
    imgWidth *
    ratio *
    PDF_CONTENT_RATIO;

  const finalHeight =
    imgHeight *
    ratio *
    PDF_CONTENT_RATIO;

  const x =
    (
      pageWidth -
      finalWidth
    ) /
    2;

  const y =
    (
      pageHeight -
      finalHeight
    ) /
    2;

  const imgData =
    canvas.toDataURL(
      "image/png"
    );

  pdf.addImage(
    imgData,
    "PNG",
    x,
    y,
    finalWidth,
    finalHeight
  );
}

function getMountedElements(
  cards:
    RefObject<HTMLElement>[]
): HTMLElement[] {
  return cards
    .map(
      (
        ref
      ) =>
        ref.current
    )
    .filter(
      (
        element
      ): element is HTMLElement =>
        Boolean(
          element
        )
    );
}

/** Salvamento nativo via chooser do Android, sem solicitar acesso geral aos arquivos.
 * O APK usa Cache + FileProvider do Capacitor. No PWA mantém o download web.
 */
async function deliverPdf(pdf: jsPDF, filename: string, title: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    pdf.save(filename);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "vault.pdf";
  const encoded = pdf.output("datauristring").split(",")[1];
  if (!encoded) throw new Error("Falha ao preparar o arquivo PDF.");
  const path = `vault-export/${safeName}`;
  await Filesystem.writeFile({ path, data: encoded, directory: Directory.Cache, recursive: true });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  await Share.share({ title, url: uri, dialogTitle: "Salvar ou compartilhar PDF" });
}

/** O html2canvas pode falhar com certos estilos ou imagens do WebView.
 * Nestes casos a exportação ainda oferece um resumo TEXTUAL fiel aos dados
 * visíveis. Não afirma incorporar anexos nem substitui os originais.
 */
function addTextSummary(pdf: jsPDF, element: HTMLElement): void {
  pdf.setTextColor(35, 35, 35);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  let y = 30;
  const heading = "VAULT — Resumo textual do documento";
  pdf.text(heading, 22, y);
  y += 24;
  const sourceText = (element.innerText || element.textContent || "").trim();
  const text = sourceText || "Não foi possível extrair texto do cartão selecionado.";
  const lines: string[] = pdf.splitTextToSize(text.slice(0, 16000), Math.max(120, width - 44));
  for (const line of lines) {
    if (y > height - 46) { pdf.addPage(); y = 30; }
    pdf.text(String(line), 22, y);
    y += 15;
  }
  if (y > height - 40) { pdf.addPage(); y = 30; }
  pdf.setFontSize(9);
  pdf.text("Resumo de cartão. Anexos não incorporados; confira os arquivos originais.", 22, y + 12);
}

async function renderCardPage(pdf: jsPDF, element: HTMLElement): Promise<void> {
  try {
    const canvas = await captureElement(element);
    addCanvasToCurrentPage(pdf, canvas);
  } catch (error) {
    console.warn("[pdfExport] Captura visual indisponível; gerando resumo textual.", error);
    addTextSummary(pdf, element);
  }
}

// ============================================================
// EXPORTAR UM CARD
// ============================================================

/**
 * Exporta um elemento HTML para PDF como imagem.
 *
 * Preserva a aparência visual atual do card no DOM.
 */
export async function exportCardToPDF(
  options:
    ExportCardOptions
): Promise<void> {
  const {
    cardRef,
    title =
      "Documento Vault",

    filename =
      `documento_${format(
        new Date(),
        "dd-MM-yyyy_HH-mm"
      )}.pdf`,
  } =
    options;

  const element =
    cardRef.current;

  if (
    !element
  ) {
    throw new Error(
      "Elemento do card não encontrado."
    );
  }

  try {
    const pdf = createPdf(title);
    await renderCardPage(pdf, element);
    await deliverPdf(pdf, filename, title);
  } catch (
    error
  ) {
    console.error(
      "[pdfExport] Erro ao gerar PDF do card:",
      error
    );

    throw new Error(
      "Não foi possível gerar o PDF. Tente novamente."
    );
  }
}

// ============================================================
// EXPORTAR VÁRIOS CARDS
// ============================================================

/**
 * Exporta múltiplos elementos HTML para um único PDF.
 *
 * Cada card montado recebe uma página própria.
 *
 * Importante:
 * refs sem elemento montado não podem ser capturados por
 * html2canvas. O chamador deve garantir que todos os cards que
 * deseja exportar existam no DOM no momento da chamada.
 */
export async function exportCardsToPDF(
  options:
    ExportCardsOptions
): Promise<void> {
  const {
    cards,
    title =
      "Meus Documentos",

    filename =
      `documentos_${format(
        new Date(),
        "dd-MM-yyyy_HH-mm"
      )}.pdf`,

    onProgress,
  } =
    options;

  if (
    cards.length ===
    0
  ) {
    throw new Error(
      "Nenhum card para exportar."
    );
  }

  /*
   * Filtramos ANTES de criar/processar páginas.
   *
   * Isso corrige:
   * - páginas iniciais em branco;
   * - progresso contando refs inexistentes;
   * - PDF vazio sendo salvo silenciosamente.
   */
  const elements =
    getMountedElements(
      cards
    );

  if (
    elements.length ===
    0
  ) {
    throw new Error(
      "Nenhum dos cards solicitados está montado para exportação."
    );
  }

  try {
    const pdf =
      createPdf(
        title
      );

    const total =
      elements.length;

    for (
      let index =
        0;
      index <
      total;
      index++
    ) {
      const element =
        elements[
          index
        ];

      /* Cada card mantém sua página, com fallback textual quando necessário. */
      if (
        index >
        0
      ) {
        pdf.addPage();
      }

      await renderCardPage(pdf, element);

      onProgress?.(
        index +
          1,
        total
      );
    }

    await deliverPdf(pdf, filename, title);
  } catch (
    error
  ) {
    console.error(
      "[pdfExport] Erro ao exportar cards:",
      error
    );

    throw new Error(
      "Não foi possível gerar o PDF. Tente novamente."
    );
  }
}