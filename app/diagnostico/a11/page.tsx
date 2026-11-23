'use client';
/** A11: evidência local visível, SEM selo falso de certificação Android ou RLS. */
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ClipboardCheck,Copy,RefreshCw,ShieldCheck,Smartphone,TriangleAlert,Wifi,LockKeyhole,Database,CheckCircle2} from 'lucide-react';
import {PageTransition} from '@/components/PageTransition';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {collectA11LocalSnapshot,type A11LocalSnapshot} from '@/lib/a11/local-snapshot';
import {redactA11Report} from '@/lib/a11/certification-policy';
import {assessA11AndroidObservation,type A11AndroidObservation} from '@/lib/a11/android-observability';
import {getVaultRuntime} from '@/lib/native-runtime';

const physicalChecks=[
 {id:'identity',label:'Duas contas e duas pessoas: trocar sem revelar registros anteriores'},
 {id:'offline',label:'Dois aparelhos: salvar offline, reiniciar e reconciliar sem perda'},
 {id:'duplicates',label:'Dois aparelhos: agendar M5 ao mesmo tempo e conferir duplicatas'},
 {id:'document',label:'Storage: negar acesso cruzado a documento de teste'},
 {id:'notification',label:'Notificações: permissão, silêncio, Doze e reinício'},
 {id:'keyboard',label:'Android: teclado, Voltar, safe areas e navegação'},
 {id:'talkback',label:'TalkBack e fonte ampliada em 320, 360, 390, 412 e 430 dp'},
 {id:'avatar',label:'Fênix: movimento reduzido, bateria, memória e GPU'},
 {id:'release',label:'APK assinado, versão e atualização sobre versão anterior'},
 {id:'pwa',label:'Vercel READY no mesmo SHA de código publicado'},
] as const;
const countLabel:Record<string,string>={doses:'Doses',vacinas:'Vacinação',reabilitacao:'Reabilitação',internacoes:'Internações',cirurgias:'Jornada cirúrgica',procedimentos:'Procedimentos'};
export default function A11DiagnosticsPage(){
 const {user,loading:authLoading}=useAuth();
 const {activePersonId}=useActivePersonId();
 const scope=JSON.stringify([user?.id||'',activePersonId||'']);
 const scopeRef=useRef(scope);scopeRef.current=scope;
 const counter=useRef(0);
 const [busy,setBusy]=useState(false),[snapshot,setSnapshot]=useState<A11LocalSnapshot|null>(null);
 const [error,setError]=useState(''),[copied,setCopied]=useState('');
 const [checked,setChecked]=useState<Record<string,boolean>>({});
 const [environment,setEnvironment]=useState<A11AndroidObservation|null>(null);
 useEffect(()=>{counter.current++;setSnapshot(null);setError('');setCopied('');setChecked({});setEnvironment(null);setBusy(false)},[scope]);
 const valid=Boolean(!authLoading&&user?.id&&activePersonId);
 const scopedSnapshot=snapshot?.scope===scope?snapshot:null;
 const manualCount=physicalChecks.filter(x=>checked[x.id]).length;
 const profile=environment?assessA11AndroidObservation(environment):null;
 function collectEnvironment(){setEnvironment({runtime:getVaultRuntime(),cssWidth:window.innerWidth,cssHeight:window.innerHeight,
  reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??null,
  visible:document.visibilityState==='visible',online:navigator.onLine})}
 async function checkLocal(){
  const uid=user?.id||'',pid=activePersonId||'';if(!uid||!pid)return;
  const nonce=++counter.current;setBusy(true);setError('');setCopied('');
  try{
   const next=await collectA11LocalSnapshot(uid,pid);
   if(scopeRef.current!==JSON.stringify([uid,pid])||counter.current!==nonce)return;
   setSnapshot(next);
  }catch(cause){if(scopeRef.current===JSON.stringify([uid,pid])&&counter.current===nonce)
    setError(cause instanceof Error?cause.message:'Não foi possível conferir as contagens locais.');
  }finally{if(scopeRef.current===JSON.stringify([uid,pid])&&counter.current===nonce)setBusy(false)}
 }
 async function copyRedacted(){
  if(!scopedSnapshot)return;
  const safe=redactA11Report({counts:scopedSnapshot.counts,queue:scopedSnapshot.queue,
   coverage:scopedSnapshot.coverage,generatedAt:scopedSnapshot.checkedAt,
   isOnline:typeof navigator!=='undefined'&&navigator.onLine});
  try{await navigator.clipboard.writeText(JSON.stringify({...safe,manualChecklist:{checked:manualCount,total:physicalChecks.length,
    notCertified:true}},null,2));if(scopeRef.current===scope)setCopied('Resumo sem IDs copiado. Não é certificado físico.')}
  catch{setCopied('Cópia indisponível neste aparelho. Nenhum dado foi enviado.')}
 }
 return <PageTransition><main className="min-h-[100dvh] bg-void px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-ink-primary header-safe-top sm:px-5">
  <div className="mx-auto max-w-3xl space-y-4">
   <header className="flex items-center gap-3"><Link href="/diagnostico" aria-label="Voltar ao diagnóstico" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={19}/></Link><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">VAULT · A11</p><h1 className="text-xl font-bold">Certificação e integridade</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Evidência local, testes de segurança e roteiro Android. Nenhuma escrita clínica.</p></div><ShieldCheck size={23} className="shrink-0 text-emerald-300"/></header>
   <section className="rounded-2xl border border-amber-300/25 bg-surface p-4" aria-label="Situação de homologação"><div className="flex items-start gap-3"><TriangleAlert size={19} className="mt-0.5 shrink-0 text-amber-300"/><div><h2 className="text-sm font-bold">Certificação física não comprovada</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Gates verdes não substituem testes com duas contas, dois aparelhos e Vercel pronta no mesmo commit. A checagem abaixo não acessa a nuvem e não executa sincronização.</p></div></div></section>
   <section className="space-y-3 rounded-2xl border border-surface-border bg-surface p-4" aria-label="Conferência local"><div className="flex items-center gap-2"><Database size={18} className="text-emerald-300"/><h2 className="text-sm font-bold">Contagens locais da pessoa ativa</h2></div>
    {!valid?<p className="text-xs text-ink-muted">Entre na conta e selecione uma pessoa antes de conferir.</p>:null}
    <button type="button" disabled={!valid||busy} onClick={()=>void checkLocal()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-slate-950 disabled:opacity-40"><RefreshCw size={17} className={busy?'animate-spin':''}/>{busy?'Conferindo sem alterar registros…':'Conferir neste aparelho'}</button>
    {error?<p role="alert" className="rounded-xl border border-rose-400/20 p-3 text-xs text-rose-300">{error}</p>:null}
    {scopedSnapshot?<><div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">{Object.entries(scopedSnapshot.counts).map(([key,value])=><div key={key} className="min-w-0 rounded-xl border border-surface-border bg-surface-raised p-3"><p className="text-[11px] text-ink-muted">{countLabel[key]||'Registro clínico'}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value===null?'Indisponível':value}</p></div>)}</div>
      <div className="rounded-xl border border-surface-border bg-surface-raised p-3"><p className="text-xs font-semibold">Fila desta pessoa</p><p className="mt-1 text-xs text-ink-secondary">{scopedSnapshot.queue.ready} prontos · {scopedSnapshot.queue.deferred} adiados · {scopedSnapshot.queue.failed} falharam</p><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Contagens são uma fotografia local. Zero ocorrências não prova sincronização nem ausência clínica.</p></div>
      {scopedSnapshot.warnings.length?<div role="status" className="space-y-1 text-xs text-amber-200">{scopedSnapshot.warnings.map(x=><p key={x}>{x}</p>)}</div>:null}
      <button type="button" onClick={()=>void copyRedacted()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 px-3 text-xs font-semibold text-emerald-200"><Copy size={16}/>Copiar resumo sem dados pessoais</button>
      {copied?<p role="status" className="text-xs text-ink-muted">{copied}</p>:null}
     </>:null}
   </section>
   <section className="rounded-2xl border border-surface-border bg-surface p-4" aria-label="Ambiente Android e acessibilidade"><h2 className="flex items-center gap-2 text-sm font-bold"><Smartphone size={18} className="text-emerald-300"/>Ambiente e acessibilidade</h2><p className="mt-2 text-xs text-ink-muted">Leitura instantânea sob comando. Não mede FPS, bateria nem prova suporte nativo.</p><button type="button" onClick={collectEnvironment} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-border px-3 text-xs font-semibold"><RefreshCw size={16}/>Conferir este ambiente</button>{profile&&environment?<div className="mt-3 space-y-1 text-xs text-ink-secondary"><p>Modo: {environment.runtime==='android'?'APK Android':environment.runtime==='web'?'Navegador/PWA':'iOS'}</p><p>Área visível: {environment.cssWidth} × {environment.cssHeight} px CSS</p><p>Movimento reduzido: {environment.reducedMotion?'ativado':'não confirmado'}</p><p>{profile.notes[0]}</p><p>Homologação física: pendente</p></div>:null}</section>
   <section className="space-y-3 rounded-2xl border border-surface-border bg-surface p-4" aria-label="Roteiro de teste físico"><div className="flex items-center gap-2"><Smartphone size={18} className="text-emerald-300"/><h2 className="text-sm font-bold">Roteiro físico A11</h2></div><p className="text-xs leading-relaxed text-ink-muted">Marque somente o que foi de fato experimentado. Este checklist é local e não representa certificação nem assinatura do Guardian.</p>
     <div className="space-y-1">{physicalChecks.map(x=><label key={x.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-surface-border/70 p-3 text-xs text-ink-secondary"><input type="checkbox" className="size-4 shrink-0 accent-emerald-400" checked={Boolean(checked[x.id])} onChange={e=>setChecked(v=>({...v,[x.id]:e.target.checked}))}/><span className="min-w-0 flex-1 leading-relaxed">{x.label}</span>{checked[x.id]?<CheckCircle2 size={17} className="shrink-0 text-emerald-300"/>:null}</label>)}</div>
     <p className="text-xs text-ink-muted">{manualCount} de {physicalChecks.length} conferências marcadas neste aparelho. Sem evidência externa, resultado oficial: pendente.</p>
   </section>
   <section className="rounded-2xl border border-surface-border bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><LockKeyhole size={18} className="text-emerald-300"/>Storage e documentos legados</h2><p className="mt-2 text-xs leading-relaxed text-ink-muted">Existem buckets públicos legados com documentos clínicos. Não compartilhar URLs de arquivos pessoais nem desativar buckets sem migração controlada. Testes autenticados devem usar dados fictícios de homologação.</p><p className="mt-2 flex items-center gap-2 text-[11px] text-ink-muted"><Wifi size={15}/>Nenhuma consulta remota ou alteração de armazenamento nesta tela.</p></section>
   <footer className="text-[11px] leading-relaxed text-ink-muted">VAULT A11 · evidência e privacidade · leitura local por conta/pessoa · sem envio automático de relatório.</footer>
  </div>
 </main></PageTransition>;
}
