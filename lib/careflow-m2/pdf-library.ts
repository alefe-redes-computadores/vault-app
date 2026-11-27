/** IndexedDB-only PDF library. No binary sync, upload or automatic sharing. */
import { db } from '@/lib/db';
import { getLocalFirstAuthUser } from '@/lib/supabase/local-auth';
import type { Report360 } from '@/lib/clinical-report-360';
export type VaultLocalPdfM2={id:string;user_id:string;person_id:string;title:string;start:string;end:string;year:string;origin:'imported'|'clinical_report';created_at:string;content:Blob;bytes:number};
/** P6 P3 — valida assinatura do binario local; MIME/extensao nao bastam. */
export async function hasPdfSignatureP6(blob:Blob):Promise<boolean>{
  if(blob.size<10||blob.size>12*1024*1024)return false;
  const header=await blob.slice(0,1024).text();
  return /%PDF-[12]\.\d/.test(header);
}
export const pdfLibraryM2={
  async add(personId:string,input:{title:string;start:string;end:string;origin:VaultLocalPdfM2['origin'];blob:Blob;scopeGuard?:()=>boolean}):Promise<string>{
    const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
    if(error||!uid||!personId)throw new Error('Conta/pessoa não identificada.');
    const person=await db.persons.get(personId);if(!person||person.user_id!==uid)throw new Error('Pessoa divergente.');
    if(input.blob.type!=='application/pdf'||input.blob.size<10||input.blob.size>12*1024*1024)throw new Error('Selecione um PDF de até 12 MB.');
    if(!(await hasPdfSignatureP6(input.blob)))throw new Error('Arquivo sem assinatura PDF válida; nada foi arquivado.');
    if(input.scopeGuard&&!input.scopeGuard())throw new Error('Pessoa/conta alterada durante o preparo; PDF não arquivado.');
    const title=input.title.trim().slice(0,120);if(!title)throw new Error('Informe o título do relatório.');
    const row:VaultLocalPdfM2={id:crypto.randomUUID(),user_id:uid,person_id:personId,title,start:input.start,end:input.end,year:(input.end||new Date().toISOString()).slice(0,4),origin:input.origin,created_at:new Date().toISOString(),content:input.blob,bytes:input.blob.size};
    await db.careflow_reports_m2.add(row);return row.id;
  },
  async list(personId:string):Promise<VaultLocalPdfM2[]>{
    const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
    if(error||!uid)return [];
    const rows=await db.careflow_reports_m2.where('person_id').equals(personId).toArray();
    return rows.filter(r=>r.user_id===uid).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  },
  async get(personId:string,id:string):Promise<VaultLocalPdfM2|null>{
    const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
    if(error||!uid)return null;
    const row=await db.careflow_reports_m2.get(id);
    return row&&row.user_id===uid&&row.person_id===personId?row:null;
  },
};
export async function makeClinicalPdfM2(report:Report360):Promise<Blob>{
  const {default:jsPDF}=await import('jspdf');
  const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});let y=21;let page=1;
  const clean=(v:unknown)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  const line=(text:string,size=9)=>{pdf.setFontSize(size);const lines=pdf.splitTextToSize(clean(text),174) as string[];for(const x of lines){if(y>272){pdf.addPage();page++;y=20;}pdf.text(x,18,y);y+=size===9?5:7;}y+=2;};
  pdf.setFont('helvetica','bold');line('VAULT / RELATORIO CLINICO',14);
  pdf.setFont('helvetica','normal');line(`Pessoa: ${report.personName} | ${report.start} a ${report.end}`);
  line('Dados registrados pelo usuario. Nao representa diagnostico medico ou comprovacao de uso.');
  for(const row of report.rows){pdf.setFont('helvetica','bold');line(`${row.date} | ${row.title}`);pdf.setFont('helvetica','normal');line(row.detail);}
  for(const warning of report.limitations)line(`Limite: ${warning}`);
  return pdf.output('blob');
}
export async function deleteLocalPdfM2(personId:string,id:string):Promise<void>{
  const {data,error}=await getLocalFirstAuthUser();const uid=data.user?.id;
  if(error||!uid)throw new Error('Sessão inválida.');
  const row=await db.careflow_reports_m2.get(id);
  if(!row||row.user_id!==uid||row.person_id!==personId)throw new Error('Arquivo não encontrado nesta pessoa.');
  await db.careflow_reports_m2.delete(id);
}
