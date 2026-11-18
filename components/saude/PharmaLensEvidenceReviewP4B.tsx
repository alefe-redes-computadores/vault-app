'use client';
import {useMemo,useState} from 'react';
import {BookOpenCheck,ClipboardCopy,ExternalLink,ShieldAlert} from 'lucide-react';
import type {Medicamento} from '@/lib/types';
import type {PharmaLensCandidateCI360} from '@/lib/health-intelligence/pharmalens-document-candidate-ci360';
import {resolveMedicationKnowledgeM153P4} from '@/lib/medication-intelligence/knowledge-resolver-m153p4';
import {buildPharmaLensEvidenceP4B,formatPharmaLensEvidenceP4B} from '@/lib/health-intelligence/pharmalens-evidence-p4b';

/** A review receipt exists only while its parent private OCR/transcription session is open. */
export function PharmaLensEvidenceReviewP4B({medication,candidate}:{medication:Medicamento;candidate:PharmaLensCandidateCI360}){
  const [copyState,setCopyState]=useState<'idle'|'copied'|'fallback'>('idle');
  const review=useMemo(()=>buildPharmaLensEvidenceP4B(candidate,{
    name:medication.nome,strength:medication.dosagem,manufacturer:medication.laboratorio_etiqueta,
  },resolveMedicationKnowledgeM153P4(medication)),[candidate,medication]);
  const printable=useMemo(()=>formatPharmaLensEvidenceP4B(review),[review]);
  async function copyLocal(){
    setCopyState('idle');
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(printable);setCopyState('copied');
    }catch{setCopyState('fallback');}
  }
  return <section aria-label="Conferência das evidências e suas fontes" className="mt-3 space-y-3 rounded-xl border border-sky-300/20 bg-sky-300/[.035] p-3">
    <div className="flex items-start gap-2"><BookOpenCheck size={17} className="mt-0.5 shrink-0 text-sky-200"/><div className="min-w-0"><h4 className="text-xs font-bold text-ink-primary">Conferência por origem</h4><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Rótulo, cadastro e fatos do catálogo ficam separados. Um princípio ativo não prova a identidade do produto.</p></div></div>
    <div className="space-y-1.5">{review.fields.map(row=><div key={row.field} className="rounded-lg border border-surface-border/50 bg-surface/60 px-2.5 py-2">
      <strong className="block break-words text-[11px] text-ink-primary">{row.label}</strong>
      <p className="mt-1 break-words text-[11px] leading-snug text-ink-secondary">Rótulo: {row.textValue||'não identificado'}</p>
      <p className="break-words text-[11px] leading-snug text-ink-muted">Cadastro: {row.declaredValue||'não informado'}</p>
      <p className={`mt-1 text-[10px] ${row.comparison==='diverge_textualmente'?'text-amber-200':'text-ink-muted'}`}>{row.comparison==='coincide_textualmente'?'Texto coincide — não é validação oficial':row.comparison==='diverge_textualmente'?'Diferença textual: conferir no documento original':'Comparação não disponível'}</p>
    </div>)}</div>
    <div className="rounded-lg border border-surface-border/50 bg-surface/60 p-2.5"><strong className="block text-[11px] text-ink-primary">Fatos do catálogo vinculados anteriormente</strong>
      {!review.catalogFacts.length?<p className="mt-1 text-[11px] text-ink-muted">Nenhum fato do catálogo disponível nesta conferência.</p>:review.catalogFacts.map((fact,i)=><div className="mt-2 border-t border-surface-border/40 pt-2 text-[10px] leading-relaxed text-ink-muted" key={`${fact.label}:${i}`}>
        <p className="break-words text-ink-secondary">{fact.label}: {fact.value}</p>
        <p className="break-words">{fact.authority==='official_exact'?'Correspondência exata já vinculada':'Inferência no catálogo já vinculado'} · {fact.source} · versão {fact.version||'não informada'} · data {fact.verifiedAt||'não informada'}</p>
      </div>)}
      <p className="mt-2 text-[10px] leading-relaxed text-amber-200">Referência vinculada não comprova autenticidade de foto, lote ou número sanitário extraído.</p>
    </div>
    <div className="flex items-start gap-1.5 rounded-lg border border-amber-300/20 p-2.5 text-[10px] leading-relaxed text-amber-200"><ShieldAlert size={15} className="shrink-0"/><span>{review.textConflicts} diferença(s) textuais para revisar. Nenhuma validação de registro sanitário ou interação medicamentosa foi realizada.</span></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Fontes oficiais para conferência manual">
      <a target="_blank" rel="noopener noreferrer" href="https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos" className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-surface-border/70 px-2.5 text-center text-[11px] font-semibold text-sky-200">Consultar registros na Anvisa <ExternalLink size={13}/></a>
      <a target="_blank" rel="noopener noreferrer" href="https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico" className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-surface-border/70 px-2.5 text-center text-[11px] font-semibold text-sky-200">Consultar bulas na Anvisa <ExternalLink size={13}/></a>
    </div>
    <p className="text-[10px] leading-relaxed text-ink-muted">Os links abrem os portais públicos; o VAULT não consulta, sincroniza nem confirma a resposta automaticamente.</p>
    <button type="button" onClick={()=>void copyLocal()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-violet-300/25 bg-violet-400/[.06] px-3 text-xs font-semibold text-violet-200"><ClipboardCopy size={15}/>Copiar conferência manualmente</button>
    {copyState==='copied'&&<p role="status" className="text-[11px] text-emerald-200">Resumo copiado por sua ação. Não foi compartilhado automaticamente.</p>}
    {copyState==='fallback'&&<div role="status" className="space-y-1"><p className="text-[11px] text-amber-200">Cópia automática indisponível. Selecione o texto abaixo.</p><textarea readOnly aria-label="Resumo local para copiar" value={printable} rows={5} className="w-full rounded-lg border border-surface-border bg-surface p-2 text-[11px] text-ink-primary"/></div>}
  </section>;
}
