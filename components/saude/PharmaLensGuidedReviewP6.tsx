"use client";
import { useEffect, useState } from "react";
import { BookOpenCheck, Camera, Database, FileCheck2, Image as ImageIcon, ShieldAlert } from "lucide-react";
import type { Medicamento } from "@/lib/types";
import { resolveMedicationKnowledgeM153P4, knowledgeAuthorityLabel } from "@/lib/medication-intelligence/knowledge-resolver-m153p4";
/** Pré-conferência local: foto não é OCR e não altera documentos, cadastro, estoque ou retirada. */
export function PharmaLensGuidedReviewP6({medication}:{medication:Medicamento}) {
  const [photo,setPhoto]=useState<string|null>(null),[fileName,setFileName]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const facts=resolveMedicationKnowledgeM153P4(medication);
  useEffect(()=>{setConfirmed(false);setPhoto(null);setFileName("");},[medication.id]);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo)},[photo]);
  const official=facts.facts.filter(f=>f.authority==="official_exact"||f.authority==="official_inferred");
  const conflicts=facts.conflicts;
  return <section className="rounded-[24px] border border-violet-400/20 bg-gradient-to-br from-violet-400/[.075] via-surface to-surface p-3.5" aria-label="Conferência guiada de medicamento em três camadas">
    <div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-300">PharmaLens · Conferência guiada</p><h2 className="mt-1 text-sm font-bold text-ink-primary">O que sabemos e o que precisa de confirmação</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Dados declarados e referências oficiais ficam separados. A captura de imagem não executa OCR nem altera registros automaticamente.</p></div>
    <div className="space-y-2">
      <div className="rounded-2xl border border-surface-border/55 bg-void/20 p-3"><div className="flex items-center gap-2"><Camera size={16} className="text-sky-300"/><strong className="text-xs">01 · Foto ou documento</strong><span className="ml-auto rounded-full bg-sky-400/10 px-2 py-0.5 text-[9px] text-sky-200">Conferência humana</span></div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">A leitura OCR automática não está confirmada nesta superfície. Você pode selecionar uma imagem para comparação visual local e confirmar os dados manualmente.</p>
        <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/[.045] px-3 text-xs font-semibold text-sky-200"><ImageIcon size={15}/>Selecionar foto local<input type="file" accept="image/*" className="sr-only" onChange={event=>{const f=event.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")||f.size>10*1024*1024){setFileName("Imagem inválida ou acima de 10 MB");setPhoto(null);return;}setFileName(f.name);setPhoto(URL.createObjectURL(f));setConfirmed(false);}}/></label>
        {fileName?<p className="mt-1 text-[10px] text-ink-muted">{fileName}</p>:null}
        {photo?<img src={photo} alt="Imagem local selecionada para conferência, sem envio" className="mt-2 max-h-72 w-full rounded-xl bg-black object-contain"/>:null}
      </div>
      <div className="rounded-2xl border border-surface-border/55 bg-void/20 p-3"><div className="flex items-center gap-2"><Database size={16} className="text-violet-300"/><strong className="text-xs">02 · Cadastro e catálogo</strong></div>
        <p className="mt-1.5 text-xs font-semibold text-ink-primary">{medication.nome}{medication.dosagem?` · ${medication.dosagem}`:""}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{facts.facts.slice(0,5).map((f,i)=><span key={`${f.kind}:${i}`} className="rounded-lg border border-surface-border/60 bg-surface px-2 py-1 text-[10px] text-ink-secondary" title={[knowledgeAuthorityLabel(f.authority),f.source?.label,f.catalogVersion,f.verifiedAt].filter(Boolean).join(" · ")}>{f.label}: {f.value} · {knowledgeAuthorityLabel(f.authority)}</span>)}</div>
        {!official.length?<p className="mt-2 text-[10px] text-amber-200">Nenhum campo oficial exato/inferido disponível para esta apresentação. O cadastro declarado permanece preservado.</p>:null}
        {official.length>0?<details className="mt-2 rounded-xl border border-violet-300/15 px-2"><summary className="min-h-11 cursor-pointer content-center text-[11px] font-semibold text-violet-200">Ver fonte, versão e data dos dados oficiais</summary><ul className="pb-2 text-[10px] leading-relaxed text-ink-secondary">{official.map((f,i)=><li className="py-1" key={i}>{f.label} · {f.source?.label||"Fonte não identificada"} · {f.catalogVersion||"sem versão"} · {f.verifiedAt||"sem data"}</li>)}</ul></details>:null}
      </div>
      <div className="rounded-2xl border border-surface-border/55 bg-void/20 p-3"><div className="flex items-center gap-2"><FileCheck2 size={16} className="text-emerald-300"/><strong className="text-xs">03 · Confirmar manualmente</strong></div>
        {conflicts.length?<p className="mt-1.5 flex gap-1.5 text-[11px] text-amber-200"><ShieldAlert size={14} className="shrink-0"/>{conflicts.length} divergência(s) entre cadastro e catálogo; nenhuma foi sobrescrita.</p>:<p className="mt-1.5 text-[11px] text-ink-muted">Confronte o que está na embalagem ou receita com o cadastro antes de editar.</p>}
        <button type="button" aria-pressed={confirmed} onClick={()=>setConfirmed(v=>!v)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.055] px-3 text-xs font-semibold text-emerald-200"><BookOpenCheck size={16}/>{confirmed?"Conferência visual realizada neste aparelho":"Confirmar que revisei visualmente"}</button>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Confirmação visual temporária: não valida prescrição, não move estoque, não cria retirada e não promove candidatos ao catálogo global.</p>
      </div>
    </div>
  </section>;
}
