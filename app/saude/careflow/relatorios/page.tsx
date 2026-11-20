'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { formatCareFlowDayR3 } from '@/lib/m3/careflow-display-r3';
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
  // P6 P3: as operacoes em curso pertencem ao titular do gesto, nunca ao perfil posterior.
  const liveScopeP6=useRef({userId:user?.id||'',personId:activePersonId||''});
  liveScopeP6.current={userId:user?.id||'',personId:activePersonId||''};
  const fileInputP6=useRef<HTMLInputElement>(null);
  const deepLinkR3=useRef('');
  const [lastFocusR3,setLastFocusR3]=useState<{uid:string;pid:string;id:string}|null>(null);
  const [deleteTargetP6,setDeleteTargetP6]=useState<{id:string;title:string;userId:string;personId:string}|null>(null);
  useEffect(()=>{setChosen(null);setTitle('');setDeleteTargetP6(null);setMessage('');if(fileInputP6.current)fileInputP6.current.value='';},[user?.id,activePersonId]);
  const sameScopeP6=(scope:{userId:string;personId:string})=>
    liveScopeP6.current.userId===scope.userId&&liveScopeP6.current.personId===scope.personId;
  const chooseFileP6=(file:File|undefined)=>{
    if(!file){setChosen(null);return;}
    if(file.type&&file.type!=='application/pdf'){setChosen(null);setMessage('Escolha um arquivo PDF verdadeiro.');return;}
    if(file.size<10||file.size>12*1024*1024){setChosen(null);setMessage('O PDF deve ter até 12 MB e não estar vazio.');return;}
    setChosen(file);setMessage('PDF selecionado apenas neste aparelho. Confira título e data antes de arquivar.');
  };
  const years=useMemo(()=>[...new Set((files||[]).map(f=>f.year))].sort().reverse(),[files]);
  const visible=useMemo(()=>(files||[]).filter(f=>(!year||f.year===year)&&[f.title,f.start,f.end,f.year].join(' ').toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR'))),[files,year,q]);
  // Deep link de PDF privado: consulta apenas arquivos ja filtrados por conta/pessoa.
  useEffect(()=>{
    if(!files||!user?.id||!activePersonId)return;
    const requested=new URLSearchParams(window.location.search).get('arquivo')||'';
    if(!requested)return;
    const scope=`${user.id}:${activePersonId}:${requested}`;
    if(deepLinkR3.current===scope)return;
    deepLinkR3.current=scope;
    const owned=files.find(f=>f.id===requested);
    if(!owned){setMessage('Arquivo não disponível para a pessoa ativa neste aparelho.');return;}
    setLastFocusR3({uid:user.id,pid:activePersonId,id:requested});setQ('');setYear('');
  },[files,user?.id,activePersonId]);
  const highlightedR3=lastFocusR3?.uid===user?.id&&lastFocusR3?.pid===activePersonId?lastFocusR3.id:'';
  useEffect(()=>{
    if(!highlightedR3||!visible.some(f=>f.id===highlightedR3))return;
    const frame=requestAnimationFrame(()=>document.getElementById(`careflow-arquivo-${highlightedR3}`)?.scrollIntoView({block:'center',behavior:'auto'}));
    return()=>cancelAnimationFrame(frame);
  },[highlightedR3,visible]);
  const importFile=async()=>{
    if(!chosen||!activePersonId||!user?.id||busy)return;
    const scope={userId:user.id,personId:activePersonId};
    const input={title:title||chosen.name.replace(/\.pdf$/i,''),start:date,end:date,origin:'imported' as const,blob:chosen};
    setBusy(true);setMessage('');
    try{
      await pdfLibraryM2.add(scope.personId,{...input,scopeGuard:()=>sameScopeP6(scope)});
      if(!sameScopeP6(scope)){
        setMessage('Pessoa alterada após a gravação; o PDF permaneceu no titular original. Confira esse perfil.');return;
      }
      setChosen(null);setTitle('');if(fileInputP6.current)fileInputP6.current.value='';
      setMessage('PDF arquivado neste aparelho, sem envio à nuvem.');
    }catch(e){if(sameScopeP6(scope))setMessage(e instanceof Error?e.message:'Não foi possível arquivar.');}
    finally{setBusy(false);}
  };
  const download=async(id:string)=>{
    if(!activePersonId||!user?.id)return;
    const scope={userId:user.id,personId:activePersonId};
    const row=await pdfLibraryM2.get(scope.personId,id);
    if(!sameScopeP6(scope))return;
    if(!row){setMessage('Arquivo não encontrado para esta pessoa.');return;}
    const url=URL.createObjectURL(row.content);const anchor=document.createElement('a');anchor.href=url;anchor.download=`VAULT-${row.title.replace(/[^\p{L}\p{N}.-]+/gu,'-').slice(0,90)}.pdf`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  const requestDeleteP6=(id:string,title:string)=>{
    if(!activePersonId||!user?.id||busy)return;
    setDeleteTargetP6({id,title,userId:user.id,personId:activePersonId});
  };
  const removeP6=async()=>{
    const target=deleteTargetP6;if(!target||busy)return;
    if(!sameScopeP6(target)){setDeleteTargetP6(null);return;}
    setBusy(true);
    try{
      await deleteLocalPdfM2(target.personId,target.id);
      if(sameScopeP6(target))setMessage('PDF local removido; registros clínicos originais preservados.');
    }catch(e){if(sameScopeP6(target))setMessage(e instanceof Error?e.message:'Falha ao remover PDF.');}
    finally{setBusy(false);setDeleteTargetP6(null);}
  };
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4"><header className="flex gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" aria-label="Voltar ao CareFlow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Minha saúde · Arquivos privados</p><h1 className="text-xl font-bold">Biblioteca de relatórios</h1><p className="text-xs text-ink-muted">Busque por título, data ou ano sem percorrer mês por mês.</p></div></header>
    <details className="group rounded-2xl border border-surface-border bg-surface p-2"><summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-semibold text-violet-200">Arquivar outro PDF neste aparelho</summary><section className="space-y-3 rounded-3xl border border-violet-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><Archive size={17} className="text-violet-300"/>Selecionar e arquivar PDF</h2><p className="text-[11px] leading-relaxed text-ink-muted">Somente este aparelho armazena o binário PDF. Os registros clínicos originais têm sincronização independente. Desinstalar/limpar dados do navegador pode eliminar arquivos locais — exporte uma cópia.</p><label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-violet-300/25 bg-violet-300/[.055] px-3.5 py-3 text-xs font-semibold text-violet-200 focus-within:ring-2 focus-within:ring-violet-300/30"><span className="min-w-0 flex-1 break-words">{chosen?chosen.name:'Selecionar PDF neste aparelho'}{chosen?<span className="mt-1 block text-[10px] font-normal text-ink-muted">{(chosen.size/1024).toFixed(1)} KB · somente neste aparelho</span>:null}</span><FilePlus2 size={18} className="shrink-0"/><input ref={fileInputP6} aria-label="Escolher PDF local" className="sr-only" accept="application/pdf,.pdf" type="file" onChange={e=>chooseFileP6(e.target.files?.[0])}/></label><label className="block text-xs text-ink-muted">Título<input className={`${field} mt-1`} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nome do exame ou relatório"/></label><CustomDatePicker label="Data de referência" value={date} onChange={setDate} maxDate={getLocalTodayISO()}/><button type="button" disabled={!chosen||busy||!activePersonId} onClick={()=>void importFile()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 text-sm font-bold text-void disabled:opacity-40"><FilePlus2 size={16}/>Arquivar arquivo local</button><Link href="/saude/relatorios" className="block min-h-11 rounded-xl border border-surface-border px-3 py-3 text-center text-xs text-emerald-300">Criar relatório clínico 360</Link></section></details>
    <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Buscar relatórios</span><span className="relative block"><Search size={15} className="absolute left-3 top-3.5 text-ink-muted"/><input className={`${field} pl-9`} placeholder="Buscar título, período, ano…" value={q} onChange={e=>setQ(e.target.value)}/></span></label><div className="w-32"><HealthRelationPicker compact title="Filtrar relatórios por ano" className={field} value={year} onValueChange={setYear}><option value="">Todos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</HealthRelationPicker></div></div>
    <section className="space-y-2"><p className="text-xs text-ink-muted">{visible.length} arquivo(s) neste dispositivo · pessoa ativa</p>{visible.map(file=><article id={`careflow-arquivo-${file.id}`} key={file.id} className={`flex scroll-mt-24 items-center gap-2 rounded-2xl border bg-surface p-3 ${highlightedR3===file.id?'border-violet-300/60 ring-2 ring-violet-300/20':'border-surface-border'}`}><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{file.title}</strong><p className="mt-1 text-[10px] text-ink-muted">{formatCareFlowDayR3(file.start)} {file.start!==file.end?`a ${formatCareFlowDayR3(file.end)}`:''} · {(file.bytes/1024).toFixed(1)} KB · {file.year}</p></div><button type="button" title="Baixar cópia" aria-label={`Baixar ${file.title}`} onClick={()=>void download(file.id)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-emerald-300/25 text-emerald-300"><FileDown size={17}/></button><button type="button" title="Excluir arquivo local" aria-label={`Excluir ${file.title}`} disabled={busy} onClick={()=>requestDeleteP6(file.id,file.title)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border text-ink-muted"><Trash2 size={16}/></button></article>)}{visible.length===0&&<p className="rounded-xl border border-surface-border p-4 text-xs text-ink-muted">Sem relatórios para este filtro. Arquive um PDF ou gere um na Central de Relatórios.</p>}</section>
    {message&&<p role="status" className="rounded-xl border border-amber-300/30 p-3 text-xs text-amber-200">{message}</p>}
  </div><ConfirmationModal isOpen={Boolean(deleteTargetP6)} onClose={()=>{if(!busy)setDeleteTargetP6(null);}} onConfirm={()=>void removeP6()} type="danger" isLoading={busy} closeOnBackdrop={!busy} title="Excluir PDF deste aparelho?" confirmLabel="Excluir PDF local" message={<span><strong className="block break-words text-ink-primary">{deleteTargetP6?.title||'Arquivo selecionado'}</strong><span className="mt-2 block">Somente este arquivo local será excluído. Receitas, doses, consultas, exames e outros registros clínicos não serão alterados.</span></span>}/></main></PageTransition>;
}
