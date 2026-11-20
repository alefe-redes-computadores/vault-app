'use client';
import { useEffect,useState } from 'react';
import { FileText,Download,Share2,RotateCcw,LockKeyhole } from 'lucide-react';
import type { ClinicalAssetM1 } from '@/lib/clinical-exams-m1/types';
import { openClinicalAssetBlobM3,shareClinicalAssetM3,retryClinicalAssetM3 } from '@/lib/clinical-exams-m3/repository';
import { hasNativeClinicalCacheM3 } from '@/lib/clinical-exams-m3/cache';
export function ClinicalAssetViewerM3({personId,asset}:{personId:string;asset:ClinicalAssetM1}){
 const [url,setUrl]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 useEffect(()=>{setUrl('');setMessage('');},[personId,asset.id]);
 const open=async()=>{
   setLoading(true);setMessage('');
   try{const blob=await openClinicalAssetBlobM3(personId,asset.id);const next=URL.createObjectURL(blob);setUrl(next);}
   catch(error){setMessage(error instanceof Error?error.message:'Falha ao abrir.');}
   finally{setLoading(false);}
 };
 const share=async()=>{setLoading(true);setMessage('');try{await shareClinicalAssetM3(personId,asset.id);}catch(e){setMessage(e instanceof Error?e.message:'Falha ao compartilhar.');}finally{setLoading(false);}};
 const retry=async()=>{setLoading(true);setMessage('');try{await retryClinicalAssetM3(personId,asset.id);setMessage('Upload privado confirmado.');}catch(e){setMessage(e instanceof Error?e.message:'Arquivo não disponível; selecione novamente na origem.');}finally{setLoading(false);}};
 return <div className="rounded-xl border border-surface-border/60 bg-void/20 p-3">
  <div className="flex min-w-0 items-start gap-2"><FileText size={18} className="shrink-0 text-amber-300"/>
   <div className="min-w-0 flex-1"><strong className="block break-all text-xs text-ink-primary">{asset.filename}</strong>
   <p className="mt-1 text-[11px] text-ink-muted">{(asset.size_bytes/1024/1024).toFixed(1)} MB · {asset.upload_status==='synced'?'Sincronizado em armazenamento privado':asset.upload_status==='uploading'?'Enviando':asset.upload_status==='failed'?'Envio precisa de revisão':'Aguardando upload'} · SHA-256 verificado na abertura</p></div><LockKeyhole size={14} className="shrink-0 text-ink-muted"/></div>
  <div className="mt-2 flex flex-wrap gap-1.5">
   <button type="button" disabled={loading} onClick={()=>void open()} className="min-h-11 rounded-xl border border-sky-300/25 px-3 text-xs font-semibold text-sky-200">{loading?'Abrindo…':'Abrir documento'}</button>
   {hasNativeClinicalCacheM3()&&<button type="button" disabled={loading} onClick={()=>void share()} className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs"><Share2 size={14}/>Compartilhar</button>}
   {asset.upload_status!=='synced'&&hasNativeClinicalCacheM3()&&<button type="button" disabled={loading} onClick={()=>void retry()} className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-border px-3 text-xs"><RotateCcw size={14}/>Reenviar</button>}
  </div>
  {url&&<div className="mt-3 space-y-2"><a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold" href={url} download={asset.filename}><Download size={15}/>Salvar cópia autorizada</a>
   {asset.mime_type==='application/pdf'?<div className="min-h-64 rounded-xl border border-surface-border bg-white"><iframe title={`Prévia de ${asset.filename}`} src={url} className="h-[65vh] w-full rounded-xl"/></div>
    :<img className="max-h-[60vh] w-full rounded-xl object-contain" alt={`Documento ${asset.filename}`} src={url}/>}
   <p className="text-[11px] text-ink-muted">A prévia não usa URL pública nem insere token no PDF. No Android, use Compartilhar se o visualizador interno não abrir.</p></div>}
  {message&&<p role="status" className="mt-2 whitespace-pre-wrap text-[11px] text-amber-200">{message}</p>}
 </div>;
}
