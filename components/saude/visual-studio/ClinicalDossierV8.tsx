'use client';
import { useMemo, useState } from 'react';
import { Check, ClipboardCopy, FileDown, FileText, ShieldAlert } from 'lucide-react';
import type { Medicamento } from '@/lib/types';
import type { BrainV7Result } from '@/lib/health-intelligence/brain-v7-universal';
import { buildDossierOnePageV8,type StudioSnapshotV8 } from '@/lib/health-intelligence/visual-studio-v8';

export function ClinicalDossierV8({brain,studio,medications,userId,personId}:{brain:BrainV7Result|null;studio:StudioSnapshotV8;medications:readonly Medicamento[];userId:string;personId:string}){
  const [feedback,setFeedback]=useState('');const [busy,setBusy]=useState(false);
  const lines=useMemo(()=>brain?buildDossierOnePageV8({brain,studio,medications,userId,personId,generatedISO:`${studio.day}T12:00:00.000Z`}):[],[brain,studio,medications,userId,personId]);
  const text=lines.join('\n');
  async function copy(){setFeedback('');try{if(!navigator.clipboard?.writeText)throw new Error('indisponível');await navigator.clipboard.writeText(text);setFeedback('Síntese copiada neste aparelho. Revise antes de compartilhar.');}catch{setFeedback('Cópia automática indisponível; selecione o texto abaixo.');}}
  async function pdf(){if(busy||!brain||!studio.authorized)return;setBusy(true);setFeedback('');
    try{const {jsPDF}=await import('jspdf');const doc=new jsPDF({format:'a4',unit:'mm',orientation:'portrait'});
      // A true one-page summary: fit by stepping from 9.2pt to 7.0pt, then mark overflow.
      const top=16,left=13,width=184,bottom=281;
      let font=9.2,wrapped:string[]=[],lineH=4.35;
      for(;font>=7;font-=0.4){doc.setFontSize(font);lineH=font*0.49;wrapped=lines.flatMap(x=>doc.splitTextToSize(x||' ',width) as string[]);if(wrapped.length*lineH<=bottom-top-8)break;}
      const maximum=Math.floor((bottom-top-8)/lineH);const truncated=wrapped.length>maximum;
      const visible=truncated?[...wrapped.slice(0,Math.max(0,maximum-2)),'[Conteúdo restante disponível no VAULT; consultar o histórico completo.]']:wrapped;
      doc.setDrawColor(72,155,142);doc.line(left,12,197,12);doc.setFont('helvetica','normal');doc.setTextColor(26,38,51);doc.setFontSize(font);
      visible.forEach((line,i)=>doc.text(line,left,top+i*lineH));
      doc.setDrawColor(198,207,212);doc.line(left,286,197,286);doc.setFontSize(7);doc.setTextColor(85,94,107);
      doc.text('VAULT | Documento pessoal observacional | 1/1 | Não é prescrição.',left,292);
      doc.save(`VAULT-V8-consulta-${studio.day}.pdf`);setFeedback(truncated?'PDF de uma página criado com redução de conteúdo; histórico completo permanece no VAULT.':'PDF de uma página criado no dispositivo. Revise antes de compartilhar.');
    }catch{setFeedback('PDF indisponível neste aparelho; use o texto ou a exportação do Brain V7.');}finally{setBusy(false);}}
  return <section className="rounded-[25px] border border-violet-400/20 bg-surface/80 p-4"><div className="flex items-center gap-2"><FileText size={18} className="text-violet-300"/><h2 className="text-sm font-bold text-ink-primary">Dossiê clínico · uma página</h2></div>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">Síntese dos dados realmente cadastrados. Mantém as ressalvas de cobertura e segurança; a versão detalhada continua disponível no Brain V7.</p>
    {brain&&studio.authorized?<><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>void copy()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 text-xs font-semibold text-violet-200"><ClipboardCopy size={15}/>Copiar texto</button><button type="button" disabled={busy} onClick={()=>void pdf()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 text-xs font-semibold text-violet-200 disabled:opacity-50"><FileDown size={15}/>{busy?'Gerando…':'PDF A4'}</button></div><details className="mt-3 rounded-xl border border-surface-border px-3"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-ink-secondary">Conferir o conteúdo antes de exportar</summary><textarea readOnly aria-label="Prévia do dossiê V8" value={text} rows={19} className="mb-3 w-full rounded-xl border border-surface-border bg-void/50 p-3 font-mono text-[11px] leading-relaxed text-ink-primary"/></details></>:<p className="mt-3 text-xs text-ink-muted">Sem dados autorizados para montar o documento.</p>}
    {feedback&&<p role="status" className="mt-2 flex items-start gap-2 text-xs text-violet-200"><Check size={14}/>{feedback}</p>}
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-amber-200"><ShieldAlert size={14} className="shrink-0"/>O dossiê não valida doses fora da bula, tolerância, reinício de opioides, segurança cardiovascular ou interações. Não substitui avaliação profissional.</p>
  </section>;
}
