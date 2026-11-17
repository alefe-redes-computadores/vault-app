'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Archive, FileDown, FilePlus2, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { db } from '@/lib/db';
import { pdfLibraryM2, deleteLocalPdfM2 } from '@/lib/careflow-m2/pdf-library';
import { getLocalTodayISO } from '@/lib/health-utils';
import { PageTransition } from '@/components/PageTransition';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
const field='min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none';
export default function CareFlowReportLibraryPage(){
  const {user}=useAuth(),{activePersonId}=useActivePersonId();
  const files=useLiveQuery(async()=>{
    if(!activePersonId||!user?.id)return [];
    const rows=await db.careflow_reports_m2.where('person_id').equals(activePersonId).toArray();
    return rows.filter(x=>x.user_id===user.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  },[activePersonId,user?.id]);
  const [q,setQ]=useState(''),[year,setYear]=useState(''),[title,setTitle]=useState(''),[date,setDate]=useState(getLocalTodayISO());
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[chosen,setChosen]=useState<File|null>(null);
  const years=useMemo(()=>[...new Set((files||[]).map(f=>f.year))].sort().reverse(),[files]);
  const visible=useMemo(()=>(files||[]).filter(f=>(!year||f.year===year)&&[f.title,f.start,f.end,f.year].join(' ').toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR'))),[files,year,q]);
  const importFile=async()=>{
    if(!chosen||!activePersonId||busy)return;setBusy(true);setMessage('');
    try{await pdfLibraryM2.add(activePersonId,{title:title||chosen.name.replace(/\.pdf$/i,''),start:date,end:date,origin:'imported',blob:chosen});setChosen(null);setTitle('');setMessage('PDF arquivado neste aparelho, sem envio à nuvem.');}
    catch(e){setMessage(e instanceof Error?e.message:'Não foi possível arquivar.');}finally{setBusy(false);}
  };
  const download=async(id:string)=>{
    if(!activePersonId)return;
    const row=await pdfLibraryM2.get(activePersonId,id);if(!row){setMessage('Arquivo não encontrado para esta pessoa.');return;}
    const url=URL.createObjectURL(row.content);const anchor=document.createElement('a');anchor.href=url;anchor.download=`VAULT-${row.title.replace(/[^\p{L}\p{N}.-]+/gu,'-').slice(0,90)}.pdf`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  const remove=async(id:string)=>{if(!activePersonId||busy)return;if(!window.confirm('Apagar apenas este PDF local? Os registros clínicos originais serão preservados.'))return;
    setBusy(true);try{await deleteLocalPdfM2(activePersonId,id);setMessage('Arquivo local removido; registros clínicos não foram alterados.');}catch(e){setMessage(e instanceof Error?e.message:'Falha ao remover PDF.');}finally{setBusy(false);}};
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4"><header className="flex gap-3"><Link href="/saude/careflow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border"><ArrowLeft size={18}/></Link><div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">CareFlow 360 · Arquivo local</p><h1 className="text-xl font-bold">Biblioteca de relatórios</h1><p className="text-xs text-ink-muted">Busque por título, data ou ano sem percorrer mês por mês.</p></div></header>
    <section className="space-y-3 rounded-3xl border border-violet-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><Archive size={17} className="text-violet-300"/>Arquivar PDF existente</h2><p className="text-[11px] leading-relaxed text-ink-muted">Somente este aparelho armazena o binário PDF. Os registros clínicos originais têm sincronização independente. Desinstalar/limpar dados do navegador pode eliminar arquivos locais — exporte uma cópia.</p><input className="block w-full text-xs" accept="application/pdf,.pdf" type="file" onChange={e=>setChosen(e.target.files?.[0]||null)}/><label className="block text-xs text-ink-muted">Título<input className={`${field} mt-1`} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nome do exame ou relatório"/></label><CustomDatePicker label="Data de referência" value={date} onChange={setDate} maxDate={getLocalTodayISO()}/><button type="button" disabled={!chosen||busy||!activePersonId} onClick={()=>void importFile()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 text-sm font-bold text-void disabled:opacity-40"><FilePlus2 size={16}/>Arquivar arquivo local</button><Link href="/saude/relatorios" className="block min-h-11 rounded-xl border border-surface-border px-3 py-3 text-center text-xs text-emerald-300">Criar relatório clínico 360</Link></section>
    <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Buscar relatórios</span><span className="relative block"><Search size={15} className="absolute left-3 top-3.5 text-ink-muted"/><input className={`${field} pl-9`} placeholder="Buscar título, período, ano…" value={q} onChange={e=>setQ(e.target.value)}/></span></label><div className="w-32"><HealthRelationPicker compact title="Filtrar relatórios por ano" className={field} value={year} onValueChange={setYear}><option value="">Todos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</HealthRelationPicker></div></div>
    <section className="space-y-2"><p className="text-xs text-ink-muted">{visible.length} arquivo(s) neste dispositivo · pessoa ativa</p>{visible.map(file=><article key={file.id} className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface p-3"><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.title}</strong><p className="mt-1 text-[10px] text-ink-muted">{file.start} {file.start!==file.end?`a ${file.end}`:''} · {(file.bytes/1024).toFixed(1)} KB · {file.year}</p></div><button type="button" title="Baixar cópia" aria-label={`Baixar ${file.title}`} onClick={()=>void download(file.id)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-emerald-300/25 text-emerald-300"><FileDown size={17}/></button><button type="button" title="Excluir arquivo local" aria-label={`Excluir ${file.title}`} disabled={busy} onClick={()=>void remove(file.id)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border text-ink-muted"><Trash2 size={16}/></button></article>)}{visible.length===0&&<p className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">Sem relatórios para este filtro. Arquive um PDF ou gere um na Central de Relatórios.</p>}</section>
    {message&&<p role="status" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-200">{message}</p>}
  </div></main></PageTransition>;
}
