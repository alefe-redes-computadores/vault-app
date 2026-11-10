"use client";
/** VAULT M113: escrita opcional. Nunca diagnostica, persiste ou compartilha automaticamente. */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard } from "@capacitor/clipboard";
import { ArrowLeft, BookHeart, Check, ClipboardCopy, HeartHandshake, LockKeyhole, NotebookPen, ShieldAlert, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSharedHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { buildPatternTimelineM113 } from "@/lib/health-intelligence/pattern-timeline-m113";
import { eraseJournalM113, readJournalM113, saveJournalM113, therapySummaryM113, MAX_JOURNAL_ENTRIES, type M113DiaryEntry } from "@/lib/private-journal-m113";

const dateLabel = (stamp:string) => {const d=new Date(stamp);return Number.isFinite(d.getTime())?d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"Registro sem data";};
export default function PersonalTherapyJournalM113(){
  const router=useRouter();
  const {user}=useAuth(), {activePersonId}=useActivePersonId();
  const health=useSharedHealthIntelligence({includeAudit:false});
  const [draft,setDraft]=useState(""),[entries,setEntries]=useState<M113DiaryEntry[]>([]);
  const [consent,setConsent]=useState(false),[selected,setSelected]=useState<string[]>([]),[includeTimeline,setIncludeTimeline]=useState(false);
  const [feedback,setFeedback]=useState("");
  const ready=Boolean(user?.id&&activePersonId);
  useEffect(()=>{
    setDraft("");setConsent(false);setSelected([]);setIncludeTimeline(false);setFeedback("");
    setEntries(readJournalM113(user?.id,activePersonId));
  },[user?.id,activePersonId]);
  const timeline=useMemo(()=>ready&&!health.error&&!health.isLoading&&health.context&&health.context.userId===user?.id&&health.context.personId===activePersonId
    ? buildPatternTimelineM113(health.context):null,[ready,health.error,health.isLoading,health.context,user?.id,activePersonId]);
  const summary=useMemo(()=>therapySummaryM113(entries,selected,includeTimeline?timeline:null),[entries,selected,includeTimeline,timeline]);
  function save(){
    if(!user?.id||!activePersonId){setFeedback("Entre na conta e selecione uma pessoa.");return;}
    if(!consent){setFeedback("Marque o consentimento para guardar texto não criptografado neste dispositivo.");return;}
    const text=draft.trim();
    if(!text||text.length>6000){setFeedback("Escreva entre 1 e 6000 caracteres.");return;}
    if(entries.length>=MAX_JOURNAL_ENTRIES){setFeedback("Limite de entradas neste aparelho. Exclua entradas antigas antes de salvar.");return;}
    try{
      const id=`entry_${Date.now()}_${Math.random().toString(36).slice(2,11)}`;
      const saved=saveJournalM113(user.id,activePersonId,[{id,createdAt:new Date().toISOString(),text},...entries],true);
      setEntries(saved);setSelected(current=>[id,...current]);setDraft("");setFeedback("Salvo somente neste dispositivo. Não sincronizado e não compartilhado.");
    }catch{setFeedback("Não foi possível salvar. O texto continua no editor.");}
  }
  function remove(id:string){
    if(!user?.id||!activePersonId)return;
    const rest=entries.filter(e=>e.id!==id);
    try{setEntries(saveJournalM113(user.id,activePersonId,rest,true));setSelected(v=>v.filter(x=>x!==id));setFeedback("Entrada excluída do armazenamento deste dispositivo.");}
    catch{setFeedback("Não foi possível excluir agora.");}
  }
  function clearAll(){
    if(!user?.id||!activePersonId||!window.confirm("Excluir TODAS as notas deste aparelho para esta pessoa? Essa ação não pode ser desfeita."))return;
    try{eraseJournalM113(user.id,activePersonId);setEntries([]);setSelected([]);setFeedback("Todas as notas locais desta pessoa foram excluídas.");}catch{setFeedback("Não foi possível excluir.");}
  }
  async function copySummary(){
    if(!summary){setFeedback("Selecione notas ou a cronologia antes de preparar o resumo.");return;}
    try{await Clipboard.write({string:summary});setFeedback("Resumo copiado mediante sua escolha. Confira onde vai colar ou enviar.");}
    catch{setFeedback("Não foi possível copiar. Revise o texto na prévia.");}
  }
  return <main className="min-h-screen bg-void px-4 pb-28 pt-5 header-safe-top text-ink-primary">
    <div className="mx-auto max-w-2xl space-y-3">
      <header className="flex items-start gap-3"><button onClick={()=>router.push("/inteligencia/alertas")} aria-label="Voltar" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-violet-300">VAULT · Expressão emocional</p><h1 className="mt-1 text-xl font-bold">Diário para conversas difíceis</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Escreva com suas palavras. O aplicativo não interpreta, diagnostica ou envia este texto automaticamente.</p></div></header>
      <section className="rounded-[22px] border border-violet-300/20 bg-surface p-4">
        <div className="flex items-center gap-2"><NotebookPen size={19} className="text-violet-300"/><h2 className="text-sm font-bold">O que você gostaria de conseguir explicar?</h2></div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Pode escrever sobre o dia, situações difíceis, algo que ajudou ou o que deseja conversar na próxima consulta. Você decide o conteúdo.</p>
        <textarea value={draft} onChange={e=>setDraft(e.target.value.slice(0,6000))} disabled={!ready} rows={6} placeholder="Hoje eu gostaria de conseguir dizer que…" aria-label="Meu texto privado" className="mt-3 w-full resize-y rounded-xl border border-surface-border bg-surface-raised p-3 text-sm leading-relaxed text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:opacity-50"/>
        <p className="mt-1 text-right font-mono text-[10px] text-ink-muted">{draft.length}/6000</p>
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-[11px] leading-relaxed text-ink-muted"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 size-4 accent-violet-300"/><span><strong>Autorizo salvar somente neste aparelho.</strong> As notas ficam no armazenamento local do navegador, <strong>sem criptografia</strong>. Quem acessar o aparelho desbloqueado poderá ter acesso a elas. Não há sincronização nem backup automático.</span></label>
        <button type="button" onClick={save} disabled={!ready||!draft.trim()||!consent} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 text-sm font-bold text-void disabled:opacity-40"><Check size={17}/> Salvar nota localmente</button>
      </section>
      <section className="rounded-[22px] border border-surface-border bg-surface p-4" aria-label="Notas locais privadas">
        <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><BookHeart size={17} className="text-violet-200"/> Minhas notas ({entries.length})</h2>{entries.length>0&&<button type="button" onClick={clearAll} className="flex min-h-10 items-center gap-1 text-[11px] text-rose-200"><Trash2 size={13}/> Apagar todas</button>}</div>
        {!entries.length?<p className="mt-3 text-xs text-ink-muted">Nenhuma nota salva neste aparelho para esta pessoa.</p>:<div className="mt-3 space-y-2">{entries.map(e=><div key={e.id} className="rounded-xl border border-surface-border/70 bg-surface-raised/40 p-3"><div className="flex items-start gap-2"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[11px] text-ink-muted"><input type="checkbox" checked={selected.includes(e.id)} onChange={event=>setSelected(old=>event.target.checked?[...old,e.id]:old.filter(x=>x!==e.id))} className="size-4 accent-violet-300"/> Incluir no resumo · {dateLabel(e.createdAt)}</label><button type="button" onClick={()=>remove(e.id)} aria-label="Excluir nota" className="flex size-9 items-center justify-center rounded-lg text-rose-200"><Trash2 size={15}/></button></div><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-secondary">{e.text}</p></div>)}</div>}
      </section>
      <section className="rounded-[22px] border border-emerald-300/15 bg-surface p-4" aria-label="Resumo escolhido para terapia">
        <h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardCopy size={18} className="text-emerald-300"/> Preparar resumo para terapia</h2>
        <p className="mt-2 text-[11px] text-ink-muted">Somente as notas marcadas entram no resumo. Você também pode incluir uma cronologia objetiva de eventos já registrados no VAULT.</p>
        <label className="mt-3 flex items-start gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={includeTimeline} onChange={e=>setIncludeTimeline(e.target.checked)} disabled={!timeline} className="mt-0.5 size-4 accent-emerald-300"/><span>Incluir cronologia de 30 dias e tendências descritivas {timeline?`(${timeline.recordedDays} dias registrados)`:"(aguardando dados válidos)"}</span></label>
        {summary?<pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-surface-border bg-void/40 p-3 font-sans text-[11px] leading-relaxed text-ink-muted">{summary}</pre>:<p className="mt-3 text-xs text-ink-faint">Selecione uma nota ou a cronologia para ver a prévia.</p>}
        <button type="button" onClick={()=>void copySummary()} disabled={!summary} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-300/10 text-xs font-bold text-emerald-200 disabled:opacity-40"><ClipboardCopy size={16}/> Copiar resumo escolhido</button>
      </section>
      <section className="rounded-2xl border border-rose-300/15 bg-rose-300/[.04] p-3"><p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-200"/><span>Se precisar de ajuda agora, um diário não substitui apoio presencial. Seu plano de segurança fica separado destas notas. Em risco imediato, procure emergência (SAMU 192).</span></p><button type="button" onClick={()=>router.push("/saude/plano-seguranca")} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 text-xs font-bold text-rose-200"><HeartHandshake size={16}/> Abrir plano pessoal de segurança</button></section>
      <p className="flex gap-2 text-[10px] leading-relaxed text-ink-faint"><LockKeyhole size={14} className="shrink-0"/> Sem envio automático, sem leitura pelo Brain, sem criptografia em repouso. Para informações muito sensíveis, prefira não salvar em um aparelho compartilhado.</p>
      {feedback&&<p role="status" className="rounded-xl border border-violet-300/20 p-3 text-xs text-violet-200">{feedback}</p>}
    </div>
  </main>;
}
