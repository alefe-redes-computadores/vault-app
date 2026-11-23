/** Documento A4 offline. Exportar/arquivar pertence exclusivamente ao gesto da UI. */
import type { MedicalDossierP3, MedicalRowP3 } from './medical-dossier-p3';

const clean=(input:unknown,max=6000):string=>String(input??'').replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,max);
const shortDay=(iso:string)=>/^\d{4}-\d{2}-\d{2}$/.test(iso)?`${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}`:'Data não informada';
const humanRowTextV34X=(value:string)=>value.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$3/$2/$1').replace(/\bhealth_record\b/gi,'Registro de saúde');
/** Time values with Z retain their UTC meaning; never shift a civil day to another timezone. */
const recordedAtBR=(value:string):string=>{
  const v=clean(value,50);
  const m=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(v);
  if(!m)return humanRowTextV34X(v);
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}${/[zZ]$/.test(v)?' UTC':''}`;
};
const sectionLabels:Record<string,string>={
  consultations:'Consultas',careflow:'CareFlow e pedidos',medications:'Medicamentos',doses:'Doses registradas',
  symptoms:'Sintomas e humor',measurements:'Medições',exams:'Exames avulsos',surgeries:'Cirurgias',
  withdrawals:'Retiradas',prescriptions:'Receitas e aquisições',treatments:'Tratamentos',rehabilitation:'Reabilitação',vaccinations:'Vacinação',procedures_a9:'Procedimentos não cirúrgicos',sensitivities_a9:'Alergias, intolerâncias e reações declaradas',documents:'Documentos',brain:'Brain (interpretação registrada)'
};
export function medicalP3FileName(input:MedicalDossierP3):string{
  return `VAULT-Modo-Medico-${input.mode==='summary'?'Resumo':'Detalhado'}-${input.start}-${input.end}.pdf`;
}
export async function makeMedicalPdfP3(report:MedicalDossierP3):Promise<Blob>{
  if(report.version!==3||!report.sections.length||!report.personName||!report.start||!report.end||
     !Array.isArray(report.rows)||report.rows.length>6000)throw Error('Documento médico incompleto ou grande demais.');
  const {default:jsPDF}=await import('jspdf');
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const left=18,right=192,top=23,bottom=276,width=210;
  let y=top;
  const footer=()=>{
    const count=pdf.getNumberOfPages();
    for(let i=1;i<=count;i++){
      pdf.setPage(i);pdf.setDrawColor(214,226,231);pdf.line(left,282,right,282);
      pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(102,121,133);
      pdf.text(`VAULT · Dossiê privado · ${shortDay(report.start)}–${shortDay(report.end)}`,left,288);
      pdf.text(`${i}/${count}`,right,288,{align:'right'});
    }
  };
  function page(){
    pdf.setFillColor(12,25,34);pdf.rect(0,0,width,15,'F');
    pdf.setFillColor(52,211,153);pdf.rect(0,0,3,15,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.setTextColor(247,254,251);
    pdf.text('VAULT  /  CAREFLOW 360',left,10);
    pdf.setTextColor(29,48,57);y=top;
  }
  function room(h:number){if(y+h>bottom){pdf.addPage();page();}}
  function line(value:unknown,size=9,tone:[number,number,number]=[44,65,74],indent=0){
    const text=clean(value);if(!text)return;
    pdf.setFont('helvetica','normal');pdf.setFontSize(size);pdf.setTextColor(...tone);
    const lines=pdf.splitTextToSize(text,right-left-indent) as string[];
    const lineHeight=size>=10?5.1:4.4;
    for(const chunk of lines){room(lineHeight+1);pdf.text(chunk,left+indent,y);y+=lineHeight;}
    y+=1.5;
  }
  function heading(value:string){
    room(17);y+=4;pdf.setFillColor(229,244,239);pdf.roundedRect(left,y-4,right-left,10,2,2,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.setTextColor(25,105,82);
    pdf.text(clean(value,110),left+3,y+2.2);y+=12;
  }
  function row(value:MedicalRowP3){
    room(18);
    pdf.setDrawColor(218,231,237);pdf.line(left,y-2,right,y-2);
    pdf.setFont('helvetica','bold');pdf.setTextColor(25,46,56);pdf.setFontSize(10);
    const title=`${shortDay(value.date)}  ·  ${clean(humanRowTextV34X(value.title),160)}`;
    const titleLines=pdf.splitTextToSize(title,right-left) as string[];
    for(const piece of titleLines){room(6);pdf.text(piece,left,y);y+=5.2;}
    line(humanRowTextV34X(value.detail),9);
    line(`Origem: ${clean(humanRowTextV34X(value.source),90)} · Evidência: ${value.provenance}${value.registeredAt?` · Registrado em: ${recordedAtBR(value.registeredAt)}`:''}`,8,[81,106,117]);
    for(const link of value.relations)line(`Vínculo documentado: ${humanRowTextV34X(link)}`,8,[69,106,105]);
    y+=3;
  }
  page();
  pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.setTextColor(19,47,58);
  pdf.text(report.mode==='summary'?'Resumo para consulta':'Dossiê clínico detalhado',left,y);y+=11;
  line(`Pessoa: ${report.personName}`,11,[24,52,59]);
  if(report.episode)line(`Episódio selecionado: ${report.episode.title} · ${shortDay(report.episode.date)}. Apenas vínculos explícitos foram incluídos.`,9,[25,105,82]);
  line(`Período: ${shortDay(report.start)} a ${shortDay(report.end)} · Preparado em: ${recordedAtBR(report.generatedAt)}`);
  line('Documento informativo gerado com registros existentes. Não é laudo, prescrição ou diagnóstico.',9,[129,95,45]);
  heading('Conteúdo selecionado');
  line(report.sections.map(x=>sectionLabels[x]||x).join(' · '));
  line(`${report.rows.length} ${report.rows.length===1?'linha':'linhas'} nesta versão · ${report.availableCount} ${report.availableCount===1?'ocorrência elegível':'ocorrências elegíveis'} conforme o período e as seções.`);
  if(report.omittedBySummary>0)line(`O resumo omite ${report.omittedBySummary} ocorrências por concisão. Para o histórico integral, escolha o modo detalhado.`,9,[129,95,45]);
  if(!report.rows.length){heading('Nenhuma ocorrência selecionada');line('Não há registros acessíveis para este período e estas seções. Isso não prova ausência de acontecimentos clínicos.');}
  else{
    const sections=[...new Set(report.rows.map(r=>r.section))];
    for(const section of sections){
      heading(sectionLabels[section]||section);
      for(const item of report.rows.filter(r=>r.section===section))row(item);
    }
  }
  heading('Limitações e cuidados de leitura');
  for(const [i,item] of report.limitations.entries())line(`${i+1}. ${item}`,8,[85,102,112]);
  line('Acesso e envio: este PDF foi preparado localmente após solicitação explícita. Confira o destinatário antes de compartilhar.',8,[25,100,78]);
  footer();return pdf.output('blob');
}
