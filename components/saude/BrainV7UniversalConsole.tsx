'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, ArrowLeft, BookHeart, BrainCircuit, Check, ClipboardCopy, Clock3, FileText, HeartPulse, Package, ShieldAlert, ShieldCheck, Sparkles, Watch } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useLocalDay } from '@/hooks/useLocalDay';
import type { Medicamento } from '@/lib/types';
import { projectBrainUniversalV7, shiftBrainDayV7 } from '@/lib/health-intelligence/brain-v7-universal';
import { prepareBrainV7Dossier, type BrainV7Rationale } from '@/lib/health-intelligence/brain-v7-dossier';

function isRationale(value: unknown): value is BrainV7Rationale {
  if (!value || typeof value !== 'object') return false;
  const x = value as Partial<BrainV7Rationale>;
  return typeof x.id==='string' && typeof x.medicationId==='string' && typeof x.recordedAt==='string' &&
    (x.source==='relato_pessoal'||x.source==='documento_referido') && typeof x.note==='string' && x.note.length<=1200;
}
const dateBR = (day: string|null) => day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.split('-').reverse().join('/') : 'sem data';
const short = (s: string, max=140) => s.length>max ? `${s.slice(0,max)}…` : s;
const section = 'rounded-[23px] border border-surface-border/75 bg-surface/75 p-4';
const subtle = 'text-xs leading-relaxed text-ink-muted';
const title = 'flex items-center gap-2 text-sm font-bold text-ink-primary';

/** All business information comes from owner/person-indexed Dexie queries, never hard-coded patient data. */
export function BrainV7UniversalConsole() {
  const {user,loading:authLoading}=useAuth();
  const {activePersonId}=useActivePersonId();
  const today=useLocalDay();
  const uid=user?.id||'';
  const pid=activePersonId||'';
  const scope=`${uid}:${pid}`;
  const [loadedScope,setLoadedScope]=useState('');
  const [anchors,setAnchors]=useState<string[]>([]);
  const [rationales,setRationales]=useState<BrainV7Rationale[]>([]);
  const [selected,setSelected]=useState('');
  const [draft,setDraft]=useState('');
  const [reference,setReference]=useState('');
  const [source,setSource]=useState<BrainV7Rationale['source']>('relato_pessoal');
  const [status,setStatus]=useState('');
  const [copied,setCopied]=useState('');
  const [confirmRemoval,setConfirmRemoval]=useState('');
  const [busy,setBusy]=useState(false);
  const nowISO=useMemo(()=>new Date().toISOString(),[today]);
  const storageKey=useMemo(()=>`vault:brain-v7:local:${encodeURIComponent(uid)}:${encodeURIComponent(pid)}`,[uid,pid]);

  useEffect(()=>{
    let a:string[]=[];let r:BrainV7Rationale[]=[];
    if(uid&&pid){
      try {
        const raw=localStorage.getItem(storageKey);
        if(raw){const saved=JSON.parse(raw) as {anchors?:unknown;rationales?:unknown};
          if(Array.isArray(saved.anchors))a=saved.anchors.filter((x:unknown):x is string=>typeof x==='string').slice(0,5);
          if(Array.isArray(saved.rationales))r=saved.rationales.filter(isRationale).slice(-30);
        }
      } catch {/* no access to device settings: still render read-only */}
    }
    setAnchors(a);setRationales(r);setDraft('');setReference('');setSelected('');setStatus('');setConfirmRemoval('');setLoadedScope(scope);
  },[storageKey,scope,uid,pid]);

  const data=useLiveQuery(async()=>{
    if(!uid||!pid)return null;
    try {
      const from=shiftBrainDayV7(today,-39);
      const [medications,acquisitions,doseLogs,records]=await Promise.all([
        db.medicamentos.where('[user_id+person_id]').equals([uid,pid]).toArray(),
        db.renovacoes.where('[user_id+person_id]').equals([uid,pid]).toArray(),
        db.doseLogs.where('[user_id+person_id+data]').between([uid,pid,from],[uid,pid,today],true,true).toArray(),
        db.registros_saude.where('[user_id+person_id+data]').between([uid,pid,shiftBrainDayV7(today,-13)],[uid,pid,today],true,true).toArray(),
      ]);
      return {scope,medications,acquisitions,doseLogs,records,error:''};
    }catch(e){return {scope,medications:[] as Medicamento[],acquisitions:[],doseLogs:[],records:[],error:e instanceof Error?e.message:'Falha ao consultar registros.'};}
  },[uid,pid,today]);
  const snapshot=data?.scope===scope?data:null;
  const ready=Boolean(uid&&pid&&loadedScope===scope&&snapshot&&!snapshot.error);
  const medicines=useMemo(()=>(ready&&snapshot?snapshot.medications:[]).filter((m):m is Medicamento & {id:string}=>Boolean(m.id&&m.user_id===uid&&m.person_id===pid)),[snapshot,ready,uid,pid]);
  const includedAnchors=useMemo(()=>anchors.filter(id=>medicines.some(m=>m.id===id&&m.tipo_uso==='continuo')),[anchors,medicines]);
  const includedNotes=useMemo(()=>rationales.filter(x=>medicines.some(m=>m.id===x.medicationId)),[rationales,medicines]);
  const report=useMemo(()=>ready&&snapshot?projectBrainUniversalV7({userId:uid,personId:pid,todayISO:today,nowISO,
    medications:medicines,acquisitions:snapshot.acquisitions,doseLogs:snapshot.doseLogs,records:snapshot.records,anchorMedicationIds:includedAnchors}):null,
    [ready,snapshot,uid,pid,today,nowISO,medicines,includedAnchors]);
  const dossier=useMemo(()=>report&&snapshot?prepareBrainV7Dossier({report,userId:uid,personId:pid,medications:medicines,
    acquisitions:snapshot.acquisitions,rationales:includedNotes}):'', [report,snapshot,uid,pid,medicines,includedNotes]);
  function saveSettings(nextAnchors: string[], nextNotes: BrainV7Rationale[]) {
    try {localStorage.setItem(storageKey,JSON.stringify({anchors:nextAnchors.slice(0,5),rationales:nextNotes.slice(-30)}));return true;}
    catch {setStatus('Não foi possível gravar no dispositivo. Verifique o armazenamento local.');return false;}
  }
  function toggleAnchor(id:string){
    if(!ready||!medicines.some(m=>m.id===id&&m.tipo_uso==='continuo'))return;
    const next=anchors.includes(id)?anchors.filter(x=>x!==id):[...anchors,id].slice(0,5);
    if(saveSettings(next,rationales)){setAnchors(next);setStatus('Preferência de base salva somente neste aparelho. Não modifica a prescrição.');}
  }
  function addRationale(){
    if(!ready||!medicines.some(m=>m.id===selected)||!draft.trim())return;
    const next=[...rationales,{id:`bv7-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,medicationId:selected,
      recordedAt:new Date().toISOString(),source,note:draft.trim().slice(0,1000),...(reference.trim()?{reference:reference.trim().slice(0,120)}:{})}].slice(-30);
    if(saveSettings(anchors,next)){setRationales(next);setDraft('');setReference('');setStatus('Contexto salvo neste aparelho; nenhuma regra de dose ou alerta foi alterada.');}
  }
  function removeRationale(id: string) {
    if(!ready||confirmRemoval!==id)return;
    const next=rationales.filter(x=>x.id!==id);
    if(saveSettings(anchors,next)){setRationales(next);setConfirmRemoval('');setStatus('Anotação pessoal excluída deste aparelho.');}
  }
  async function copy(){try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(dossier);setCopied('Dossiê copiado neste aparelho.');}
    catch {setCopied('Cópia indisponível. Abra o texto para selecionar manualmente.');}}
  async function pdf(){
    if(!dossier||busy)return;
    setBusy(true);setCopied('');
    try {
      const {jsPDF}=await import('jspdf');
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      pdf.setFont('helvetica','normal');pdf.setFontSize(8.2);
      const width=182;const wrapped=dossier.split('\n').flatMap(x=>pdf.splitTextToSize(x||' ',width) as string[]);
      let y=16;for(const line of wrapped){if(y>279){pdf.addPage();y=16;}pdf.text(line,14,y);y+=4.1;}
      pdf.save(`vault-dossie-observacional-${today}.pdf`);
      setCopied('PDF criado localmente no aparelho. Revise antes de compartilhar.');
    }catch{setCopied('Exportação PDF indisponível. Você pode copiar o resumo em texto.');}finally{setBusy(false);}
  }
  return <main className="min-h-[100dvh] bg-void px-3.5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 text-ink-primary">
    <div className="mx-auto max-w-xl space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/saude/minha-saude" aria-label="Voltar para Minha Saúde" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></Link>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-300">VAULT · Brain V7 · Fênix</p><h1 className="font-display text-2xl font-bold">Inteligência de contexto</h1><p className={subtle}>Estabilidade, memória terapêutica e evidências</p></div>
        <BrainCircuit size={24} className="shrink-0 text-violet-300"/>
      </header>
      <section className="rounded-2xl border border-violet-400/25 bg-violet-400/[.05] p-4">
        <p className={`${title} text-violet-200`}><Sparkles size={17}/>Brain V7 observacional</p>
        <p className={`mt-2 ${subtle}`}>Este painel organiza informações declaradas e registros reais. Não determina dose segura, não interpreta tolerância como proteção e não reduz alertas de interações.</p>
        {/* V8_VISUAL_STUDIO: independent clinical presentation with no changes to Brain calculations. */}
        <Link href="/saude/visual-studio" className="mt-3 flex min-h-11 items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-400/[.055] px-3 text-xs font-semibold text-emerald-200">Visual Studio V8 · Fênix, PillStudio e dossiê <span aria-hidden="true">›</span></Link>
        <Link href="/saude/pharmalens" className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-violet-200 underline underline-offset-2">Abrir PharmaLens · experiência por fabricante</Link>
      </section>
      {authLoading ? <p role="status" className={subtle}>Restaurando sessão…</p>
      :!uid?<p role="status" className={subtle}>Entre na conta para consultar informações pessoais.</p>
      :!pid?<p role="status" className={subtle}>Selecione uma pessoa no VAULT.</p>
      :data===undefined||loadedScope!==scope||!snapshot?<p role="status" className={subtle}>Consultando somente o histórico desta pessoa…</p>
      :snapshot.error?<p role="alert" className="rounded-xl border border-rose-400/30 p-3 text-xs text-rose-200">{snapshot.error}</p>
      :report&&<>
        <section className={section}>
          <h2 className={title}><HeartPulse size={17} className="text-emerald-300"/>Stability Anchor · seu chão</h2>
          <p className={`mt-2 ${subtle}`}>Marque voluntariamente até 5 tratamentos contínuos como referência pessoal. Falta de registro NÃO equivale a falta de medicamento, e uma retomada não prova estabilidade farmacológica.</p>
          <div className="mt-3 flex flex-wrap gap-2">{medicines.filter(m=>m.tipo_uso==='continuo'&&m.status!=='descontinuado').map(m=><button key={m.id} type="button" aria-pressed={includedAnchors.includes(m.id)} onClick={()=>toggleAnchor(m.id)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold ${includedAnchors.includes(m.id)?'border-emerald-300/50 bg-emerald-400/10 text-emerald-200':'border-surface-border bg-surface-raised text-ink-muted'}`}>{includedAnchors.includes(m.id)?'✓ ':''}{m.nome}</button>)}</div>
          {!report.anchors.length&&<p className={`mt-3 ${subtle}`}>Nenhuma base selecionada. Nada será classificado automaticamente pelo nome do medicamento.</p>}
          {report.anchors.map(a=><div key={a.medicationId} className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.035] p-3">
            <p className="text-sm font-semibold text-ink-primary">{a.medicationName}</p>
            <p className={`mt-2 ${subtle}`}>Últimos 14 dias: {a.documentedDays} dia(s) documentado(s), {a.taken} dose(s) tomadas, {a.explicitlyIgnored} ignoradas e {a.confirmedOutOfStock} informadas sem estoque.</p>
            <p className={`mt-1 ${subtle}`}>Última tomada registrada: {dateBR(a.lastTakenDay)} · última ignorada: {dateBR(a.lastIgnoredDay)}</p>
            {a.returnDay&&<p className="mt-2 text-xs text-amber-200">Retomada registrada em {dateBR(a.returnDay)}. Janela apenas observacional: não comprova estabilidade farmacológica.</p>}
            {a.warnings.map(w=><p key={w} className="mt-2 text-[11px] text-amber-200">{w}</p>)}
          </div>)}
        </section>
        <section className={section}>
          <h2 className={title}><Activity size={17} className="text-sky-300"/>Matriz de quatro eixos</h2>
          <p className={`mt-2 ${subtle}`}>Cada eixo mostra a última avaliação 0–10 registrada. Não é diagnóstico de depressão, abstinência ou efeito de fabricante.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">{report.axes.map(a=><div key={a.kind} className="rounded-xl border border-surface-border/65 bg-surface-raised/60 p-3"><p className="text-[11px] text-ink-muted">{a.label}</p><p className="mt-1 text-xl font-bold text-ink-primary">{a.value===null?'—':`${a.value}/10`}</p><p className="mt-1 text-[10px] text-ink-muted">{a.observedDays} dia(s) · {dateBR(a.day)}</p></div>)}</div>
        </section>
        <section className={section}>
          <h2 className={title}><Clock3 size={17} className="text-cyan-300"/>ChronoCircadian · rotina e sono</h2>
          <p className={`mt-2 ${subtle}`}>Sono com horário de início e fim comprovados: {report.sleep.observedDays} dia(s) em 14. Último despertar registrado: {report.sleep.lastWakeAt?new Date(report.sleep.lastWakeAt).toLocaleString('pt-BR'):'sem dados completos'}.</p>
          <p className={`mt-2 ${subtle}`}>Dados de sono enriquecem a análise; não alteram automaticamente horários prescritos ou classificações de atraso.</p>
          {report.lifestyle.length>0&&<div className="mt-3 flex flex-wrap gap-2">{report.lifestyle.slice(0,12).map((x,i)=><span key={`${x.day}-${x.label}-${i}`} className="rounded-full border border-cyan-400/20 bg-cyan-400/[.04] px-2 py-1 text-[11px] text-cyan-200">{x.label} · {dateBR(x.day)}</span>)}</div>}
        </section>
        <section className={section}>
          <h2 className={title}><ShieldAlert size={17} className="text-amber-300"/>Doses SOS e contexto de segurança</h2>
          <p className={`mt-2 ${subtle}`}>Constam {report.rescue.takenIn24h} registro(s) de doses SOS/extra tomadas nas últimas 24 horas em relação a {new Date(report.rescue.checkedAt).toLocaleString('pt-BR')}.</p>
          {report.rescue.byMedication.map(x=><p key={x.medicationId} className={`mt-1 ${subtle}`}>• {x.medicationName}: {x.count} registro(s)</p>)}
          <p className="mt-3 text-[11px] leading-relaxed text-amber-200">O VAULT não recomenda novas doses. Intervalos longos não eliminam interações; informe sua equipe de saúde se houver necessidade de doses repetidas ou efeitos inesperados.</p>
        </section>
        <details className={section}>
          <summary className={`${title} min-h-11 cursor-pointer`}><BookHeart size={17} className="text-violet-300"/>Washout & Memory · histórico de transições</summary>
          <p className={`mt-2 ${subtle}`}>Motivos declarados de interrupção e substituições registradas. O app não calcula lavagem farmacológica sem parâmetros clínicos.</p>
          {!report.transitions.length&&<p className={`mt-3 ${subtle}`}>Nenhuma transição documentada.</p>}
          {report.transitions.slice(0,25).map(x=><div key={x.medicationId} className="mt-3 rounded-xl border border-surface-border/60 p-3"><p className="text-xs font-semibold text-ink-primary">{x.medicationName} · {x.label}</p><p className={`mt-1 ${subtle}`}>{dateBR(x.stoppedOn)} {x.replacementName?`· substituição cadastrada: ${x.replacementName}`:''}</p>{x.reason&&<p className={`mt-1 ${subtle}`}>Motivo informado: {short(x.reason)}</p>}</div>)}
        </details>
        <details className={section}>
          <summary className={`${title} min-h-11 cursor-pointer`}><Package size={17} className="text-emerald-300"/>CareJourney · SUS e particular</summary>
          <p className={`mt-2 ${subtle}`}>Compras particulares realizadas com tipo registrado: {report.supply.purchasedEvents}; valor informado: R$ {report.supply.paidTotal.toFixed(2).replace('.',',')}. Aquisições SUS/gratuitas: {report.supply.freeOrSusEvents}. Sem preço: {report.supply.amountUnreportedEvents}.</p>
          <p className={`mt-2 ${subtle}`}>Tratamento compartilhado não vincula automaticamente um medicamento a processos do SUS. Não é calculada economia presumida.</p>
        </details>
        <section className={section}>
          <h2 className={title}><ShieldCheck size={17} className="text-emerald-300"/>Clinical Context Ledger · justificativas</h2>
          <p className={`mt-2 ${subtle}`}>Registre fatos históricos ou a referência de um documento. Trata-se de anotação pessoal, não de validação do prescritor nem de autorização para alterar/silenciar alertas de dose ou interação.</p>
          <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{medicines.slice(0,50).map(m=><button key={m.id} onClick={()=>setSelected(m.id)} type="button" aria-pressed={selected===m.id} className={`min-h-10 rounded-xl border px-2.5 text-xs ${selected===m.id?'border-emerald-300/40 text-emerald-200':'border-surface-border text-ink-muted'}`}>{m.nome}</button>)}</div>
          {selected&&<><div className="mt-3 flex gap-2" role="group" aria-label="Origem da justificativa">{([{id:'relato_pessoal',label:'Relato pessoal'},{id:'documento_referido',label:'Documento referido'}] as const).map(x=><button key={x.id} type="button" onClick={()=>setSource(x.id)} aria-pressed={source===x.id} className={`min-h-11 flex-1 rounded-xl border px-2 text-xs ${source===x.id?'border-violet-300/50 text-violet-200':'border-surface-border text-ink-muted'}`}>{x.label}</button>)}</div>
            <label className="mt-3 block text-xs text-ink-primary">Histórico ou justificativa declarada<textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} rows={3} placeholder="Descreva somente o que foi registrado ou informado; não declare aprovação médica presumida." className="mt-2 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-sm"/></label>
            <label className="mt-3 block text-xs text-ink-primary">Referência do documento (opcional, não verificada)<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={120} placeholder="Ex.: consulta de 10/11, receita arquivada" className="mt-2 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"/></label>
            <button type="button" disabled={!draft.trim()} onClick={addRationale} className="mt-3 min-h-11 w-full rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-200 disabled:opacity-40">Registrar contexto neste dispositivo</button></>}
          {!!includedNotes.length&&<div className="mt-3 space-y-2">{includedNotes.slice(-5).map(x=><div key={x.id} className="rounded-lg border border-surface-border/60 p-2 text-[11px] text-ink-muted"><strong className="text-ink-primary">{medicines.find(m=>m.id===x.medicationId)?.nome}</strong> · {x.source==='documento_referido'?'Documento referido, não verificado':'Relato pessoal'}<p className="mt-1 break-words">{short(x.note,220)}</p>
            {confirmRemoval===x.id ? <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>removeRationale(x.id)} className="min-h-10 rounded-lg border border-rose-400/30 px-3 text-xs text-rose-200">Confirmar exclusão local</button><button type="button" onClick={()=>setConfirmRemoval('')} className="min-h-10 rounded-lg border border-surface-border px-3 text-xs">Cancelar</button></div> : <button type="button" onClick={()=>setConfirmRemoval(x.id)} className="mt-2 min-h-10 rounded-lg border border-surface-border px-3 text-xs text-ink-muted">Excluir anotação</button>}
          </div>)}</div>}
          {status&&<p role="status" className="mt-2 text-xs text-emerald-200">{status}</p>}
        </section>
        <section className={`${section} border-sky-400/20`}>
          <h2 className={title}><FileText size={17} className="text-sky-300"/>Dossiê clínico observacional</h2>
          <p className={`mt-2 ${subtle}`}>Resumo gerado do histórico existente, com faltas de cobertura, dados declarados e limitações. A exportação acontece no próprio dispositivo.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>void copy()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/5 px-2 text-xs font-semibold text-sky-200"><ClipboardCopy size={15}/>Copiar texto</button>
            <button type="button" disabled={busy} onClick={()=>void pdf()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/5 px-2 text-xs font-semibold text-violet-200 disabled:opacity-40"><FileText size={15}/>{busy?'Gerando…':'Exportar PDF'}</button>
          </div>
          {copied&&<p role="status" className="mt-2 flex gap-2 text-xs text-sky-200"><Check size={14}/>{copied}</p>}
          <details className="mt-3 rounded-xl border border-surface-border/60 px-3"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-primary">Revisar documento completo</summary><textarea readOnly value={dossier} aria-label="Dossiê observacional para consulta" rows={16} className="mb-3 w-full rounded-xl border border-surface-border bg-surface-raised p-3 font-mono text-[11px] text-ink-primary"/></details>
        </section>
        <p className="flex gap-2 px-2 text-[11px] leading-relaxed text-ink-muted"><Watch size={15} className="mt-0.5 shrink-0"/>Indicadores de wearables não substituem avaliação de sintomas, sinais clínicos ou atendimento em caso de urgência. Este painel não opera a prescrição.</p>
      </>}
    </div>
  </main>;
}
