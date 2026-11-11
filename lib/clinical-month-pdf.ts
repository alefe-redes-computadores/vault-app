/** M95: downloadable, page-aware clinical diary. All content is assembled on-device. */
import jsPDF from "jspdf";
import { deliverPdf } from "@/lib/pdfExport";
import type { ClinicalMonthReport } from "@/lib/clinical-month-report";

const fmt = (text: unknown) => String(text ?? "").replace(/[\u0000-\u001f]+/g, " ").trim();
function dateLabel(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export async function exportClinicalMonthPdf(report: ClinicalMonthReport): Promise<void> {
  const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4", compress:true });
  const width = 210, left = 17, right = 193, maxY = 278;
  let y = 18;
  const pageHeader = () => {
    pdf.setFillColor(13, 24, 29);
    pdf.rect(0, 0, width, 11, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("VAULT  /  REGISTROS DE SAÚDE", left, 7.5);
    pdf.setTextColor(31, 48, 52);
    y = 20;
  };
  const nextPage = (height: number) => { if (y + height > maxY) { pdf.addPage(); pageHeader(); } };
  const paragraph = (value: string, indent = 0, size = 9, color: [number,number,number] = [47,63,67]) => {
    const safe = fmt(value) || "Não informado";
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(size); pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(safe, right - left - indent);
    for (const line of lines) {
      nextPage(size < 9 ? 4.1 : 5);
      pdf.text(line, left + indent, y); y += size < 9 ? 4.1 : 5;
    }
  };
  const heading = (value: string) => {
    nextPage(14); y += 4;
    pdf.setFillColor(232, 247, 242); pdf.roundedRect(left, y - 5, right - left, 9, 2, 2, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(13, 91, 73);
    pdf.text(fmt(value), left + 3, y + 1); y += 11;
  };
  const line = (value: string) => { paragraph(value, 0, 9); y += 1; };
  pageHeader();
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
  pdf.text("Relatório mensal de saúde", left, y); y += 8;
  paragraph(`Período: ${report.monthLabel}  |  Gerado em: ${new Date().toLocaleString("pt-BR")}`, 0, 9);
  paragraph("Síntese descritiva de registros informados. Não é diagnóstico, prescrição nem confirmação de dose segura.",0,8,[93,103,106]);
  heading("Resumo do período");
  line(`${report.summary.taken} tomadas registradas  |  ${report.summary.ignored} ignoradas explicitamente`);
  line(`${report.summary.sos} SOS  |  ${report.summary.extra} extras  |  ${report.summary.daysWithRecords} dias documentados`);
  line(`${report.alerts.length} episódio(s) com evidência original preservada no Brain`);
  paragraph("Ausência de registro não comprova que uma dose não foi tomada. Contagens não representam adesão clínica.",0,8,[93,103,106]);
  heading("Alertas com evidência preservada");
  if (!report.alerts.length) paragraph("Nenhum alerta de quantidade vinculado a uma dose neste mês foi encontrado na memória persistida. Isso não atesta segurança das doses.");
  for (const episode of report.alerts) {
    nextPage(26);
    paragraph(`${dateLabel(episode.date)} — ${episode.title}`, 0, 10, [148,62,34]);
    line(`Informado: ${episode.quantity} ${episode.unit}  |  Referência interna: ${episode.referenceQuantity === null ? "desconhecida" : `${episode.referenceQuantity} ${episode.unit}`}`);
    paragraph(`Detectado em: ${episode.detectedAt}  |  Gravidade registrada: ${episode.severity}`,0,8);
    if (episode.reviewedAt) paragraph(`Revisão registrada pela pessoa: ${episode.reviewedAt} (${episode.feedback || "sem avaliação"}). Não equivale a avaliação profissional.`,0,8);
    paragraph(episode.message,0,8);
    y += 3;
  }
  heading("Barreiras de fornecimento documentadas");
  if (!report.barriers.length) paragraph("Nenhuma interrupção por falta de estoque foi explicitamente registrada neste período.");
  for (const barrier of report.barriers) line(`${barrier.medication} · ${barrier.affectedDays} dia(s) afetado(s) · ${barrier.ignoredDoses} dose(s) ignorada(s) · ${barrier.detail}`);
  paragraph("Este bloco resume somente motivos registrados; não presume falha de fornecimento quando não há evidência.",0,8,[93,103,106]);
  heading("Diário de doses por dia");
  paragraph("Registro real: horários confirmados permanecem nos registros individuais; a visão abaixo é compacta.",0,8,[93,103,106]);
  if (!report.doseDays.length) paragraph("Nenhum registro de tomada ou de dose ignorada neste mês.");
  for (const day of report.doseDays) {
    nextPage(10);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(31,48,52);
    pdf.text(dateLabel(day.date), left, y); y += 5;
    for (const compactLine of day.lines) paragraph(compactLine, 2, 8);
    y += 1;
  }
  heading("Outros alertas e insights registrados pelo Brain");
  if (!report.brainInsights.length) paragraph("Nenhum outro insight persistido com detecção neste mês. Isso não indica ausência de sinais de saúde.");
  for (const insight of report.brainInsights) {
    nextPage(18);
    paragraph(`${insight.detectedAt.slice(0, 10)} · ${insight.title} · Gravidade registrada: ${insight.severity}`, 0, 9, [79,54,142]);
    paragraph(insight.message, 2, 8);
    if (insight.feedback) paragraph(`Feedback registrado: ${insight.feedback}. Não representa avaliação profissional.`,2,8);
    y += 2;
  }
  heading("Outros registros de saúde");
  if (report.biometricSourceNote) paragraph(report.biometricSourceNote, 0, 8, [93,103,106]);
  if (!report.records.length) paragraph("Nenhum outro registro de saúde disponível neste mês.");
  for (const row of report.records) line(`${dateLabel(row.date)} · ${row.title}${row.detail ? ` · ${row.detail}` : ""}`);
  heading("Origem e limitações");
  paragraph("Dados provenientes dos registros locais da pessoa selecionada e de snapshots previamente salvos pelo Brain V5. A exportação não consulta nem envia informações a servidores externos.",0,8);
  paragraph("Os avisos históricos só aparecem quando uma evidência original foi efetivamente guardada e vinculada à dose. O relatório não reconstitui falsamente alertas anteriores à memória disponível.",0,8);
  paragraph("Apresente o relatório voluntariamente ao profissional responsável. Não altere doses com base nas comparações internas do aplicativo.",0,8);
  const pages = pdf.getNumberOfPages();
  for(let i=1;i<=pages;i++) {
    pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(120,130,132);
    pdf.text(`VAULT · ${report.monthKey} · Página ${i}/${pages}`,left,291);
  }
  await deliverPdf(pdf, `VAULT-relatorio-mensal-${report.monthKey}.pdf`, `VAULT · relatório de ${report.monthLabel}`);
}
