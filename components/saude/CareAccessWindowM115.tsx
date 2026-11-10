"use client";
import {useEffect,useState} from "react";
import {CalendarClock,ClipboardCheck,Trash2} from "lucide-react";
import {HealthTimePicker} from "@/components/saude/HealthTimePicker";
import {readAccessWindowM115,saveAccessWindowM115,eraseAccessWindowM115,type AccessWindowM115} from "@/lib/health-supply/access-window-m115";
import {getLocalTodayISO} from "@/lib/health-utils";
export function CareAccessWindowM115({userId,personId,cycleId,withdrawalDate}:{userId:string;personId:string;cycleId:string;withdrawalDate?:string|null}){
  const [saved,setSaved]=useState<AccessWindowM115|null>(null),[cutoff,setCutoff]=useState("14:00"),[source,setSource]=useState(""),[documents,setDocuments]=useState(""),[feedback,setFeedback]=useState("");
  useEffect(()=>{const current=readAccessWindowM115(userId,personId,cycleId);setSaved(current);setCutoff(current?.cutoff??"14:00");setSource(current?.source??"");setDocuments(current?.documents??"");setFeedback("");},[userId,personId,cycleId]);
  function save(){try{const next=saveAccessWindowM115(userId,personId,cycleId,{cutoff,source,documents});setSaved(next);setFeedback("Janela informada salva apenas neste dispositivo. Não foram criados alarmes.");}catch(e){setFeedback(e instanceof Error?e.message:"Não foi possível salvar.");}}
  function remove(){if(!window.confirm("Apagar a anotação local de atendimento deste ciclo?"))return;try{eraseAccessWindowM115(userId,personId,cycleId);setSaved(null);setFeedback("Anotação local removida.");}catch{setFeedback("Não foi possível remover.");}}
  const today=getLocalTodayISO();
  const dateOk=typeof withdrawalDate==="string"&&/^\d{4}-\d\d-\d\d$/.test(withdrawalDate);
  const isToday=dateOk&&withdrawalDate===today;
  const pastCutoff=isToday&&Boolean(saved)&&((new Date().getHours()*60+new Date().getMinutes())>(Number(saved!.cutoff.slice(0,2))*60+Number(saved!.cutoff.slice(3))));
  return <section className="rounded-[20px] border border-amber-300/20 bg-amber-300/[.025] p-3" aria-label="Janela administrativa informada para retirada">
    <div className="flex items-start gap-2"><CalendarClock size={18} className="shrink-0 text-amber-200"/><div><h3 className="text-xs font-bold text-ink-primary">Horário informado pela unidade</h3><p className="mt-1 text-[11px] text-ink-muted">Opcional, por ciclo de fornecimento. Não representa uma regra universal do SUS ou validade de prescrição.</p></div></div>
    {dateOk?<p className="mt-2 text-xs text-ink-muted">Retirada vinculada: {withdrawalDate!.split("-").reverse().join("/")}{saved?` · limite anotado ${saved.cutoff}`:""}</p>:<p className="mt-2 text-[11px] text-amber-200">Sem data de retirada vinculada: confirme o agendamento na seção Retiradas.</p>}
    {pastCutoff?<p className="mt-2 rounded-xl border border-amber-300/30 p-2 text-[11px] text-amber-200">O horário que você registrou para hoje já passou. Confira diretamente com a unidade; isso não confirma uma retirada perdida.</p>:null}
    <div className="mt-3 grid gap-2"><label className="text-xs text-ink-muted">Horário-limite informado<HealthTimePicker value={cutoff} onChange={setCutoff}/></label><label className="grid gap-1 text-xs text-ink-muted">Fonte da informação<input value={source} onChange={e=>setSource(e.target.value.slice(0,140))} placeholder="Ex.: farmácia da unidade, confirmado por telefone" className="min-h-11 rounded-xl border border-surface-border bg-surface-raised p-3 text-xs text-ink-primary"/></label><label className="grid gap-1 text-xs text-ink-muted">Documentos que a unidade informou (opcional)<textarea value={documents} onChange={e=>setDocuments(e.target.value.slice(0,800))} rows={2} placeholder="Ex.: receita original e documento com foto" className="rounded-xl border border-surface-border bg-surface-raised p-3 text-xs text-ink-primary"/></label></div>
    <div className="mt-3 flex gap-2"><button type="button" onClick={save} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300/25 text-xs font-bold text-amber-200"><ClipboardCheck size={15}/>Salvar localmente</button>{saved?<button type="button" onClick={remove} aria-label="Apagar anotação" className="flex size-11 items-center justify-center rounded-xl border border-surface-border text-rose-200"><Trash2 size={15}/></button>:null}</div>
    <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">Este registro é local, não sincroniza, não altera estoque ou status, não verifica validade legal e não agenda notificações automaticamente.</p>
    {feedback?<p role="status" className="mt-2 text-xs text-amber-200">{feedback}</p>:null}
  </section>;
}
