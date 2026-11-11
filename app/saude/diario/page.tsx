"use client";
/** VAULT M113: escrita opcional. Nunca diagnostica, persiste ou compartilha automaticamente. */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard } from "@capacitor/clipboard";
import { ArrowLeft, BookHeart, Check, ClipboardCopy, HeartHandshake, LockKeyhole, NotebookPen, ShieldAlert, Trash2 } from "lucide-react";
import { EncryptedRecoveryM115 } from "@/components/saude/EncryptedRecoveryM115";
import { privateActivityReviewsM118 } from "@/lib/private-activity-review-m118";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useSharedHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { buildPatternTimelineM113 } from "@/lib/health-intelligence/pattern-timeline-m113";
import { eraseJournalM113, eraseProtectedJournalM114, readJournalM113, saveJournalM113, therapySummaryM113, hasProtectedJournalM114, protectJournalM114, unlockJournalM114, saveProtectedJournalM114, MAX_JOURNAL_ENTRIES, type M113DiaryEntry } from "@/lib/private-journal-m113";

const dateLabel = (stamp:string) => {const d=new Date(stamp);return Number.isFinite(d.getTime())?d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"Registro sem data";};
export default function PersonalTherapyJournalM113(){
  const router=useRouter();
  const {user}=useAuth(), {activePersonId}=useActivePersonId();
  const health=useSharedHealthIntelligence({includeAudit:false});
  const [draft,setDraft]=useState(""),[entries,setEntries]=useState<M113DiaryEntry[]>([]);
  const [activity,setActivity]=useState(""),[before,setBefore]=useState(""),[after,setAfter]=useState(""),[perception,setPerception]=useState("");
  const [consent,setConsent]=useState(false),[selected,setSelected]=useState<string[]>([]),[includeTimeline,setIncludeTimeline]=useState(false);
  const [feedback,setFeedback]=useState("");
  const [protectedMode,setProtectedMode]=useState(false),[unlocked,setUnlocked]=useState(true),[passphrase,setPassphrase]=useState(""),[privacyBusy,setPrivacyBusy]=useState(false);
  const ready=Boolean(user?.id&&activePersonId);
  useEffect(()=>{
    setDraft("");setActivity("");setBefore("");setAfter("");setPerception("");setConsent(false);setSelected([]);setIncludeTimeline(false);setFeedback("");
    const isProtected=hasProtectedJournalM114(user?.id,activePersonId);setProtectedMode(isProtected);setUnlocked(!isProtected);setPassphrase("");setEntries(isProtected?[]:readJournalM113(user?.id,activePersonId));
  },[user?.id,activePersonId]);
  function lockProtectedSession(message="Diário bloqueado; use sua frase para abrir novamente."){
    if(!protectedMode)return;
    setEntries([]);setSelected([]);setDraft("");setActivity("");setBefore("");setAfter("");setPerception("");setIncludeTimeline(false);setConsent(false);setPassphrase("");setUnlocked(false);setFeedback(message);
  }
  useEffect(()=>{
    if(!protectedMode||!unlocked)return;
    const onVisibility=()=>{if(document.visibilityState!=="visible")lockProtectedSession("Diário bloqueado ao sair do aplicativo.");};
    const onPageHide=()=>lockProtectedSession("Diário bloqueado ao sair do aplicativo.");
    document.addEventListener("visibilitychange",onVisibility);window.addEventListener("pagehide",onPageHide);
    return()=>{document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("pagehide",onPageHide);};
  },[protectedMode,unlocked]);
  const timeline=useMemo(()=>ready&&!health.error&&!health.isLoading&&health.context&&health.context.userId===user?.id&&health.context.personId===activePersonId
    ? buildPatternTimelineM113(health.context):null,[ready,health.error,health.isLoading,health.context,user?.id,activePersonId]);
  const summary=useMemo(()=>therapySummaryM113(entries,selected,includeTimeline?timeline:null),[entries,selected,includeTimeline,timeline]);
  const activityReviews=useMemo(()=>privateActivityReviewsM118(entries),[entries]);
  function prepareActivityReview(){
    const item=activity.trim(),b=before.trim(),a=after.trim(),p=perception.trim();
    if(!item||!b||!a){setFeedback("Informe a situação e como se sentiu antes e depois; nada foi salvo.");return;}
    const text=["O que me ajudou (se eu quiser contar):",`Situação ou atividade: ${item}`,`Como me senti antes: ${b}`,`Como me senti depois: ${a}`,`O que percebi: ${p||"Não informado"}`].join("\n");
    setDraft(old=>[old.trim(),text].filter(Boolean).join("\n\n").slice(0,6000));
    setFeedback("Relato preparado no editor. Confira e escolha se deseja salvar.");
    setActivity("");setBefore("");setAfter("");setPerception("");
  }
  async function save(){
    if(!user?.id||!activePersonId){setFeedback("Entre na conta e selecione uma pessoa.");return;}
    if(!consent){setFeedback(protectedMode?"Confirme o salvamento cifrado somente neste aparelho.":"Confirme o salvamento aberto somente neste aparelho.");return;}
    const text=draft.trim();
    if(!text||text.length>6000){setFeedback("Escreva entre 1 e 6000 caracteres.");return;}
    if(entries.length>=MAX_JOURNAL_ENTRIES){setFeedback("Limite de entradas neste aparelho. Exclua entradas antigas antes de salvar.");return;}
    try{
      const id=`entry_${Date.now()}_${Math.random().toString(36).slice(2,11)}`;
      const saved=protectedMode?await saveProtectedJournalM114(user.id,activePersonId,[{id,createdAt:new Date().toISOString(),text},...entries],passphrase):saveJournalM113(user.id,activePersonId,[{id,createdAt:new Date().toISOString(),text},...entries],true);
      setEntries(saved);setSelected(current=>[id,...current]);setDraft("");setFeedback("Salvo somente neste dispositivo. Não sincronizado e não compartilhado.");
    }catch{setFeedback("Não foi possível salvar. O texto continua no editor.");}
  }
  async function remove(id:string){
    if(!user?.id||!activePersonId)return;
    const rest=entries.filter(e=>e.id!==id);
    try{setEntries(protectedMode?await saveProtectedJournalM114(user.id,activePersonId,rest,passphrase):saveJournalM113(user.id,activePersonId,rest,true));setSelected(v=>v.filter(x=>x!==id));setFeedback("Entrada excluída do armazenamento deste dispositivo.");}
    catch{setFeedback("Não foi possível excluir agora.");}
  }
  async function unlock(){if(!user?.id||!activePersonId)return;setPrivacyBusy(true);try{setEntries(await unlockJournalM114(user.id,activePersonId,passphrase));setUnlocked(true);setFeedback("Diário desbloqueado somente nesta tela.");}catch{setFeedback("Não foi possível desbloquear. Confira a frase; o arquivo foi preservado.");}finally{setPrivacyBusy(false);}}
  async function enableProtection(){if(!user?.id||!activePersonId||passphrase.length<10){setFeedback("Use uma frase com pelo menos 10 caracteres.");return;}setPrivacyBusy(true);try{await protectJournalM114(user.id,activePersonId,entries,passphrase);setProtectedMode(true);setUnlocked(true);setConsent(true);setFeedback("Proteção local ativada. A cópia aberta foi removida somente após verificação.");}catch{setFeedback("A proteção não foi concluída; as notas atuais foram preservadas.");}finally{setPrivacyBusy(false);}}
  function clearAll(){
    if(!user?.id||!activePersonId||!window.confirm("Excluir TODAS as notas deste aparelho para esta pessoa? Essa ação não pode ser desfeita."))return;
    try{if(protectedMode)eraseProtectedJournalM114(user.id,activePersonId);else eraseJournalM113(user.id,activePersonId);setEntries([]);setSelected([]);setProtectedMode(false);setUnlocked(true);setPassphrase("");setFeedback("Todas as notas locais desta pessoa foram excluídas.");}catch{setFeedback("Não foi possível excluir.");}
  }
  async function copySummary(){
    if(!summary){setFeedback("Selecione notas ou a cronologia antes de preparar o resumo.");return;}
    try{await Clipboard.write({string:summary});setFeedback("Resumo copiado mediante sua escolha. Confira onde vai colar ou enviar.");}
    catch{setFeedback("Não foi possível copiar. Revise o texto na prévia.");}
  }
  return <main className="min-h-screen bg-void px-4 pb-28 pt-5 header-safe-top text-ink-primary">
    <div className="mx-auto max-w-2xl space-y-3">
      <header className="flex items-start gap-3"><button onClick={()=>router.push("/inteligencia/alertas")} aria-label="Voltar" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></button><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-violet-300">VAULT · Expressão emocional</p><h1 className="mt-1 text-xl font-bold">Diário para conversas difíceis</h1><p className="mt-1 text-xs leading-relaxed text-ink-muted">Escreva com suas palavras. O aplicativo não interpreta, diagnostica ou envia este texto automaticamente.</p></div></header>
      {protectedMode&&!unlocked?<section className="rounded-[22px] border border-violet-300/25 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><LockKeyhole size={18} className="text-violet-200"/>Diário protegido neste aparelho</h2><p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Digite sua frase. Ela não é salva e não existe recuperação automática.</p><input type="password" autoComplete="current-password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm" placeholder="Frase de proteção"/><button type="button" onClick={()=>void unlock()} disabled={privacyBusy||passphrase.length<10} className="mt-2 min-h-12 w-full rounded-xl bg-violet-300 font-bold text-void disabled:opacity-40">Desbloquear localmente</button><p className="mt-2 text-[10px] text-ink-faint">A proteção vale para o conteúdo em repouso; mantenha também o bloqueio do aparelho.</p></section>:null}
      {!protectedMode&&unlocked?<details className="rounded-[18px] border border-violet-300/20 bg-violet-300/[.035] px-3"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-xs font-bold text-violet-200"><LockKeyhole size={16}/>Proteger notas com frase secreta</summary><div className="space-y-2 border-t border-surface-border/50 py-3"><p className="text-[11px] leading-relaxed text-ink-muted">A frase não é armazenada. Esquecê-la significa perder o acesso às notas cifradas.</p><input type="password" autoComplete="new-password" value={passphrase} onChange={e=>setPassphrase(e.target.value)} className="min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm" placeholder="No mínimo 10 caracteres"/><button type="button" onClick={()=>void enableProtection()} disabled={privacyBusy||passphrase.length<10} className="min-h-12 w-full rounded-xl border border-violet-300/30 text-xs font-bold text-violet-200 disabled:opacity-40">Cifrar, verificar e remover cópia aberta</button></div></details>:null}
      {protectedMode&&unlocked?<button type="button" onClick={()=>lockProtectedSession()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-300/25 text-xs font-bold text-violet-200"><LockKeyhole size={15}/>Bloquear diário agora</button>:null}
      {user?.id&&activePersonId?<EncryptedRecoveryM115 kind="journal" userId={user.id} personId={activePersonId}/>:null}
      {protectedMode&&!unlocked?null:<>
      <section className="rounded-[22px] border border-violet-300/20 bg-surface p-4">
        <div className="flex items-center gap-2"><NotebookPen size={19} className="text-violet-300"/><h2 className="text-sm font-bold">O que você gostaria de conseguir explicar?</h2></div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Pode escrever sobre o dia, situações difíceis, algo que ajudou ou o que deseja conversar na próxima consulta. Você decide o conteúdo.</p>
        <details className="mt-2 rounded-xl border border-violet-300/20 p-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-violet-200">O que me ajudou · relato guiado (opcional)</summary>
          <div className="space-y-2 border-t border-violet-300/10 pt-3">
            <p className="text-[10px] leading-relaxed text-ink-muted">Compare apenas o que você relatou. Não comprova efeito ou tratamento.</p>
            {([["Situação ou atividade",activity,setActivity],["Como me senti antes",before,setBefore],["Como me senti depois",after,setAfter],["O que percebi (opcional)",perception,setPerception]] as const).map(([label,value,update],index)=><label key={label} className="block text-[11px] text-ink-secondary">{label}<input value={value} onChange={e=>update(e.target.value.slice(0,300))} maxLength={300} placeholder={index===0?"Ex.: descanso, conversa, caminhada":"Em minhas próprias palavras"} className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary"/></label>)}
            <button type="button" onClick={prepareActivityReview} className="min-h-11 w-full rounded-xl border border-violet-300/30 text-xs font-semibold text-violet-200">Preparar texto para revisar antes de salvar</button>
          </div>
        </details>
        <textarea value={draft} onChange={e=>setDraft(e.target.value.slice(0,6000))} disabled={!ready} rows={6} placeholder="Hoje eu gostaria de conseguir dizer que…" aria-label="Meu texto privado" className="mt-3 w-full resize-y rounded-xl border border-surface-border bg-surface-raised p-3 text-sm leading-relaxed text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:opacity-50"/>
        <p className="mt-1 text-right font-mono text-[10px] text-ink-muted">{draft.length}/6000</p>
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.04] p-3 text-[11px] leading-relaxed text-ink-muted"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 size-4 accent-violet-300"/><span><strong>Autorizo salvar somente neste aparelho.</strong> {protectedMode?"As notas usam criptografia local com a frase desta sessão; ela não é salva.":"Sem a criptografia opcional, ficam abertas no armazenamento local."} Quem acessar o aplicativo já desbloqueado poderá vê-las. Não há sincronização nem backup automático.</span></label>
        <button type="button" onClick={save} disabled={!ready||!draft.trim()||!consent} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 px-3 text-sm font-bold text-void disabled:opacity-40"><Check size={17}/> Salvar nota localmente</button>
      </section>
      <section className="rounded-[22px] border border-surface-border bg-surface p-4" aria-label="Notas locais privadas">
        <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><BookHeart size={17} className="text-violet-200"/> Minhas notas ({entries.length})</h2>{entries.length>0&&<button type="button" onClick={clearAll} className="flex min-h-10 items-center gap-1 text-[11px] text-rose-200"><Trash2 size={13}/> Apagar todas</button>}</div>
        {!entries.length?<p className="mt-3 text-xs text-ink-muted">Nenhuma nota salva neste aparelho para esta pessoa.</p>:<div className="mt-3 space-y-2">{entries.map(e=><div key={e.id} className="rounded-xl border border-surface-border/70 bg-surface-raised/40 p-3"><div className="flex items-start gap-2"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[11px] text-ink-muted"><input type="checkbox" checked={selected.includes(e.id)} onChange={event=>setSelected(old=>event.target.checked?[...old,e.id]:old.filter(x=>x!==e.id))} className="size-4 accent-violet-300"/> Incluir no resumo · {dateLabel(e.createdAt)}</label><button type="button" onClick={()=>remove(e.id)} aria-label="Excluir nota" className="flex size-9 items-center justify-center rounded-lg text-rose-200"><Trash2 size={15}/></button></div><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-secondary">{e.text}</p></div>)}</div>}
      </section>
      {activityReviews.length>0 && <details className="rounded-[20px] border border-violet-300/20 bg-surface p-3" aria-label="Comparações voluntárias de atividades">
        <summary className="min-h-11 cursor-pointer text-xs font-bold text-violet-200">Meus relatos antes e depois ({activityReviews.length})</summary>
        <div className="space-y-2 border-t border-surface-border/40 pt-3">{activityReviews.slice(0,10).map(item=><div key={item.id} className="rounded-xl bg-surface-raised/40 p-3 text-xs leading-relaxed">
          <strong className="block text-ink-primary">{item.activity}</strong>
          <span className="mt-1 block text-ink-muted">Antes: {item.before}</span><span className="block text-ink-muted">Depois: {item.after}</span>
        </div>)}<p className="text-[10px] text-ink-faint">Relatos particulares, não resultados clínicos. Comparação não indica causalidade. O Brain não recebe esse conteúdo.</p></div>
      </details>}
      <section className="rounded-[22px] border border-emerald-300/15 bg-surface p-4" aria-label="Resumo escolhido para terapia">
        <h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardCopy size={18} className="text-emerald-300"/> Preparar resumo para terapia</h2>
        <p className="mt-2 text-[11px] text-ink-muted">Somente as notas marcadas entram no resumo. Você também pode incluir uma cronologia objetiva de eventos já registrados no VAULT.</p>
        <label className="mt-3 flex items-start gap-2 text-xs text-ink-secondary"><input type="checkbox" checked={includeTimeline} onChange={e=>setIncludeTimeline(e.target.checked)} disabled={!timeline} className="mt-0.5 size-4 accent-emerald-300"/><span>Incluir cronologia de 30 dias e tendências descritivas {timeline?`(${timeline.recordedDays} dias registrados)`:"(aguardando dados válidos)"}</span></label>
        {summary?<pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-surface-border bg-void/40 p-3 font-sans text-[11px] leading-relaxed text-ink-muted">{summary}</pre>:<p className="mt-3 text-xs text-ink-faint">Selecione uma nota ou a cronologia para ver a prévia.</p>}
        <button type="button" onClick={()=>void copySummary()} disabled={!summary} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-300/10 text-xs font-bold text-emerald-200 disabled:opacity-40"><ClipboardCopy size={16}/> Copiar resumo escolhido</button>
      </section>
      <section className="rounded-2xl border border-rose-300/15 bg-rose-300/[.04] p-3"><p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-200"/><span>Se precisar de ajuda agora, um diário não substitui apoio presencial. Seu plano de segurança fica separado destas notas. Em risco imediato, procure emergência (SAMU 192).</span></p><button type="button" onClick={()=>router.push("/saude/plano-seguranca")} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 text-xs font-bold text-rose-200"><HeartHandshake size={16}/> Abrir plano pessoal de segurança</button></section>
      <p className="flex gap-2 text-[10px] leading-relaxed text-ink-faint"><LockKeyhole size={14} className="shrink-0"/> Sem envio automático e sem leitura pelo Brain. {protectedMode?"Protegido em repouso por frase secreta nesta pessoa e conta; a tela desbloqueada continua exigindo cuidado.":"Sem proteção criptográfica enquanto você não ativar a opção acima."}</p></>}
      {feedback&&<p role="status" className="rounded-xl border border-violet-300/20 p-3 text-xs text-violet-200">{feedback}</p>}
    </div>
  </main>;
}
