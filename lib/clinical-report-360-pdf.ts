/** M98 — paginated, auditable and local PDF; no clinical reassessment. */
import jsPDF from "jspdf";
import { deliverPdf } from "@/lib/pdfExport";
import type { Report360, Report360Row } from "./clinical-report-360";

const text = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f]+/g," ").trim();
const sectionTitle:Record<Report360Row["category"],string> = {
  medications:"Medicamentos — cadastro atual",doses:"Doses documentadas",symptoms:"Sintomas e humor relatados",
  measurements:"Medições e hábitos",consultations:"Consultas",documents:"Documentos de saúde (metadados)",brain:"Brain — snapshots preservados",
};
export async function exportClinicalReport360Pdf(report: Report360): Promise<void> {
  const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  const left=17,right=193,bottom=279,width=210;
  let y=19;
  function header(){
    pdf.setFillColor(13,24,29);pdf.rect(0,0,width,12,"F");
    pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.setTextColor(255,255,255);
    pdf.text("VAULT / RELATORIO DE SAUDE",left,8);pdf.setTextColor(35,50,55);y=20;
  }
  function room(height:number){if(y+height>bottom){pdf.addPage();header();}}
  function paragraph(input:unknown,size=9,indent=0){
    const value=text(input) || "Não informado";
    pdf.setFont("helvetica","normal");pdf.setFontSize(size);pdf.setTextColor(39,53,57);
    const lines:string[]=pdf.splitTextToSize(value,right-left-indent);
    for(const line of lines){room(size<9?4.3:5);pdf.text(line,left+indent,y);y+=size<9?4.3:5;}
    y+=1;
  }
  function title(value:string){room(19);y+=3;pdf.setFillColor(228,246,240);pdf.roundedRect(left,y-4,right-left,10,2,2,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(13,89,74);pdf.text(text(value).slice(0,94),left+3,y+2);y+=13;}
  function item(row:Report360Row){
    room(19);pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.setTextColor(34,54,59);
    const prefix=`${row.date}${row.time?` · ${row.time.slice(0,16)}`:""} · `;
    const lines:string[]=pdf.splitTextToSize(prefix+text(row.title),right-left);
    for(const ln of lines){room(5);pdf.text(ln,left,y);y+=5;}
    paragraph(row.detail,8,2);
    paragraph(`Origem: ${row.source}${row.severity?` · Gravidade registrada: ${row.severity}`:""}`,8,2);
    for(const e of row.evidence)paragraph(`Evidência original: ${e}`,8,3);
    y+=2;
  }
  header();
  pdf.setFont("helvetica","bold");pdf.setFontSize(17);pdf.text("Relatorio clinico 360",left,y);y+=9;
  paragraph(`Pessoa: ${report.personName} | Período: ${report.start} a ${report.end}`,9);
  paragraph(`Modo: ${report.mode==="factual"?"Somente registros factuais":report.mode==="brain"?"Factual com Brain persistido":"Resumo para consulta e anexos"} | Gerado no dispositivo em: ${new Date().toLocaleString("pt-BR")}`,8);
  paragraph("Documento preparado localmente a partir dos registros informados. Não equivale a diagnóstico, orientação de dosagem ou conferência de ingestão.",8);
  title("Resumo descritivo");
  paragraph(`${report.summary.confirmed} tomadas confirmadas · ${report.summary.explicitlyIgnored} ignoradas explícitas · ${report.summary.sos} SOS · ${report.summary.extra} extras`,9);
  paragraph(`${report.summary.healthRecords} registros de saúde · ${report.summary.brainSnapshots} snapshots anteriores do Brain · ${report.summary.daysWithRecords} dias com dados exportados`,9);
  if (report.mode === "consultation"){
    title("Para a consulta");
    paragraph("Reveja horários e quantidade reais, motivos relatados, sintomas, consultas e os avisos preservados. Divergências são pontos para discutir com o profissional — não conclusões clínicas.",9);
  }
  const order:Report360Row["category"][]=["medications","doses","symptoms","measurements","consultations","documents","brain"];
  for(const category of order){
    const rows=report.rows.filter(r=>r.category===category);
    if(!rows.length)continue;
    title(`${sectionTitle[category]} (${rows.length})`);
    for(const data of rows)item(data);
  }
  title("Origem, lacunas e limites");
  for(const limitation of report.limitations)paragraph(`• ${limitation}`,8);
  paragraph("Compartilhe somente após conferir pessoa, período, conteúdo e destinatário. O VAULT não envia nada automaticamente.",8);
  const count=pdf.getNumberOfPages();
  for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setFont("helvetica","normal");pdf.setTextColor(110,120,124);pdf.setFontSize(8);pdf.text(`VAULT · ${report.start} a ${report.end} · Página ${i}/${count}`,left,292);}
  await deliverPdf(pdf,`VAULT-relatorio-360-${report.start}-${report.end}.pdf`,`VAULT — relatório clínico 360`);
}
