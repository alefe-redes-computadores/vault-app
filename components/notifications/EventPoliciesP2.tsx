'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useLiveQuery} from 'dexie-react-hooks';
import {BellRing,CalendarDays,Clock3,HeartHandshake,RotateCcw,ShieldCheck,ShieldAlert,ChevronRight} from 'lucide-react';
import {useAuth} from '@/hooks/useAuth';
import {useActivePersonId} from '@/hooks/useActivePersonId';
import {HealthRelationPicker} from '@/components/saude/HealthRelationPicker';
import {HealthTimePicker} from '@/components/saude/HealthTimePicker';
import {CustomDatePicker} from '@/components/DatePicker';
import {db} from '@/lib/db';
import {getLocalTodayISO} from '@/lib/health-utils';
import {getEventOffsetsM3,type CommitmentKindM3} from '@/lib/m3/notification-overrides';
import {getVaultNotificationBrainSettings,formatReminderOffset} from '@/lib/notification-brain';
import {isFutureAcquisition,isPrescriptionOnly,renewalEventDate} from '@/lib/health-supply/renewal-event';
import {notificationPoliciesRepositoryP2} from '@/lib/repositories/notificationPoliciesP2';
import {CHECKIN_DAYS_P2,EVENT_KINDS_P2,EVENT_PRESETS_P2,EVENT_POLICY_CHANGED_P2,readEventQuietP2,writeEventQuietP2,
 type EventKindP2,type EventPolicyValueP2,validLocalDateTimeP2} from '@/lib/m3/policy-record-p2';
import {checkinInvitationsP2,checkinCanAnswerP2} from '@/lib/m3/checkins-p2';

type SourceEvent={kind:EventKindP2;id:string;date:string;time:string|null;title:string;status:string};
const names:Record<EventKindP2,string>={consulta:'Consulta',cirurgia:'Cirurgia',exame:'Exame',retirada:'Retirada',compra:'Compra planejada',retorno:'Retorno de exame',checkin:'Acompanhamento'};
const day=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'): 'Data a conferir';
const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
const fallbackFor=(kind:EventKindP2,settings:ReturnType<typeof getVaultNotificationBrainSettings>):number[]=>{
  if(kind==='cirurgia'||kind==='retorno'||kind==='checkin')return settings.eventOffsets.consulta;
  return settings.eventOffsets[kind];
};
export function EventPoliciesP2(){
  const {user}=useAuth(),{activePersonId}=useActivePersonId();
  const uid=user?.id||'',pid=activePersonId||'';
  const [selected,setSelected]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[,setRevision]=useState(0);
  // Rascunho somente visual; não sincronizar data e hora pela metade.
  const [specialDraft,setSpecialDraft]=useState<{key:string;date:string;time:string}|null>(null);
  useEffect(()=>{setSelected('');setSpecialDraft(null);setMessage('');},[uid,pid]);
  useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener(EVENT_POLICY_CHANGED_P2,refresh);return()=>window.removeEventListener(EVENT_POLICY_CHANGED_P2,refresh);},[]);
  const snapshot=useLiveQuery(async()=>{
    if(!uid||!pid)return {uid,pid,consultas:[],exames:[],cirurgias:[],retiradas:[],renovacoes:[],policies:[]} as const;
    const [consultas,exames,cirurgias,retiradas,renovacoes,policies]=await Promise.all([
      db.consultas.where('user_id').equals(uid).toArray(),db.exames.where('user_id').equals(uid).toArray(),
      db.cirurgias.where('user_id').equals(uid).toArray(),db.retiradas.where('user_id').equals(uid).toArray(),
      db.renovacoes.where('user_id').equals(uid).toArray(),db.notification_policies_p2.where('[user_id+person_id]').equals([uid,pid]).toArray()]);
    return {uid,pid,consultas:consultas.filter(r=>r.person_id===pid),exames:exames.filter(r=>r.person_id===pid),
      cirurgias:cirurgias.filter(r=>r.person_id===pid),retiradas:retiradas.filter(r=>r.person_id===pid),
      renovacoes:renovacoes.filter(r=>r.person_id===pid),policies:policies.filter(r=>r.user_id===uid&&r.person_id===pid)};
  },[uid,pid]);
  const data=snapshot?.uid===uid&&snapshot?.pid===pid?snapshot:undefined;
  const today=getLocalTodayISO();
  const events=useMemo(()=>{
    if(!data)return [] as SourceEvent[];
    const rows:SourceEvent[]=[];
    const add=(kind:EventKindP2,id:string|undefined,date:string,time:string|null|undefined,title:string,status:string)=>{
      if(!id||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today||['realizada','cancelada','nao_realizada','concluida'].includes(status))return;
      rows.push({kind,id,date,time:time&&clock.test(time)?time:null,title,status});
    };
    for(const c of data.consultas)add('consulta',c.id,c.data,c.horario,c.motivo||'Consulta agendada',c.status);
    for(const e of data.exames){add('exame',e.id,e.data,e.horario,e.nome,'agendada');
      if(e.data_retorno)add('retorno',e.id,e.data_retorno,null,`Retorno · ${e.nome}`,'agendada');}
    for(const s of data.cirurgias)add('cirurgia',s.id,s.data,s.horario,s.procedimento,s.status);
    for(const w of data.retiradas)if(!w.renovacao_realizada_id&&!w.realizada_em)add('retirada',w.id,w.data,w.horario,w.medicamento_nome||'Retirada de medicamento',w.status);
    for(const r of data.renovacoes)if(!isPrescriptionOnly(r)&&isFutureAcquisition(r,today))add('compra',r.id,renewalEventDate(r).slice(0,10),null,r.medicamento_nome||'Aquisição planejada','agendada');
    return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)).slice(0,80);
  },[data,today]);
  const choice=events.find(row=>`${row.kind}:${row.id}`===selected)??events[0]??null;
  const choiceKey=choice?`${choice.kind}:${choice.id}`:'';
  const policy=choice?data?.policies.find(p=>p.event_kind===choice.kind&&p.event_id===choice.id)??null:null;
  const global=getVaultNotificationBrainSettings();
  const legacy:CommitmentKindM3|undefined=choice?(choice.kind==='cirurgia'||choice.kind==='retorno'||choice.kind==='checkin'?'consulta':choice.kind):undefined;
  const defaults=choice&&legacy?getEventOffsetsM3({userId:uid,personId:pid,kind:legacy,fallback:fallbackFor(choice.kind,global)}):[];
  const offsets=policy?.offsets??defaults;
  const quiet=readEventQuietP2(uid,pid);
  const savedSpecial=policy?.custom_at??'';
  const matchingDraft=specialDraft?.key===choiceKey?specialDraft:null;
  const specialDate=matchingDraft?.date??savedSpecial.slice(0,10);
  const specialTime=matchingDraft?.time??savedSpecial.slice(11,16);
  const specialValue=specialDate&&specialTime?`${specialDate}T${specialTime}`:'';
  const eventClock=choice?.time||(choice?.kind==='compra'?global.plannedPurchaseTime:global.dateOnlyEventTime);
  const specialTooLate=Boolean(choice&&specialValue&&(specialDate>choice.date||(specialDate===choice.date&&specialTime>eventClock)));
  const specialValid=Boolean(specialValue&&validLocalDateTimeP2(specialValue)&&!specialTooLate);
  async function run(work:()=>Promise<unknown>,ok:string){if(busy)return;setBusy(true);try{await work();setMessage(ok);}catch(err){setMessage(err instanceof Error?err.message:'Não foi possível salvar.');}finally{setBusy(false);}}
  const savePolicy=(value:EventPolicyValueP2)=>choice&&run(()=>notificationPoliciesRepositoryP2.update(pid,choice.kind,choice.id,value),'Preferência salva na fila segura de sincronização. A entrega depende do Android.');
  const completed=(data?.consultas||[]).filter(c=>c.id&&c.status==='realizada').sort((a,b)=>b.data.localeCompare(a.data)).slice(0,10);
  const now=new Date();
  return <div className="mx-auto mt-4 max-w-xl space-y-3" aria-label="Notificações inteligentes por compromisso">
    <section className="rounded-[24px] border border-emerald-400/20 bg-surface p-4">
      <header className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><BellRing size={19}/></span><div className="min-w-0"><h2 className="text-sm font-bold text-ink-primary">Notificações por compromisso</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Regras por ID, conta e pessoa; a configuração entra na fila de sincronização offline. Não altera eventos, horários clínicos ou estado de conclusão.</p></div></header>
      {!uid||!pid?<p className="mt-3 text-xs text-amber-200">Entre na conta e selecione uma pessoa para configurar.</p>:null}
      {events.length===0?<p className="mt-3 text-xs text-ink-muted">Nenhum compromisso futuro elegível nesta pessoa. As categorias gerais continuam funcionando.</p>:<>
        <div className="mt-4 grid gap-1.5"><p className="text-xs font-medium text-ink-muted">Compromisso</p>
          <HealthRelationPicker title="Selecionar compromisso" value={choiceKey} onValueChange={setSelected}
            className="w-full rounded-2xl border border-surface-border bg-void px-3 py-2 text-xs font-semibold text-ink-primary">
            {events.map(e=><option key={`${e.kind}:${e.id}`} value={`${e.kind}:${e.id}`}>{names[e.kind]} · {day(e.date)} · {e.title.slice(0,50)}</option>)}
          </HealthRelationPicker></div>
        {choice&&<div className="mt-3 space-y-3 rounded-2xl border border-surface-border/60 bg-void/30 p-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-ink-primary">{choice.title}</p><p className="mt-1 text-[10px] text-ink-muted">{day(choice.date)}{choice.time?` · ${choice.time}`:' · horário a configurar ou padrão operacional'}</p></div><ShieldCheck size={17} className="shrink-0 text-emerald-300"/></div>
          <label className="flex min-h-11 items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" className="size-5 accent-emerald-400" disabled={busy} checked={policy?.enabled!==false} onChange={e=>savePolicy({enabled:e.target.checked,offsets:policy?.offsets??null,custom_at:policy?.custom_at??null})}/>Lembretes deste compromisso</label>
          <p className="text-[10px] text-ink-muted">{policy?.offsets===null||!policy?'Antecedências da categoria existente.':'Preferências individuais escolhidas.'}</p>
          <div className="flex flex-wrap gap-2">{EVENT_PRESETS_P2.map(n=><button type="button" key={n} disabled={busy||policy?.enabled===false} aria-pressed={offsets.includes(n)} onClick={()=>{
            const values=policy?.offsets??[...defaults],next=values.includes(n)?values.filter(v=>v!==n):[...values,n];
            if(next.length>4){setMessage('Escolha no máximo quatro avisos por compromisso.');return;}
            void savePolicy({enabled:policy?.enabled!==false,offsets:next,custom_at:policy?.custom_at??null});
          }} className={`min-h-11 rounded-xl border px-2.5 text-[10px] font-semibold disabled:opacity-40 ${offsets.includes(n)?'border-emerald-400/60 bg-emerald-400/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{formatReminderOffset(n)}</button>)}</div>
          <div className="rounded-2xl border border-emerald-300/15 bg-surface/70 p-3">
            <p className="text-[11px] font-semibold text-ink-primary">Aviso em data e hora especial <span className="font-normal text-ink-muted">(opcional)</span></p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Configure antes ou no horário do compromisso. A escolha só será gravada quando você confirmar.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <CustomDatePicker label="Data do aviso" value={specialDate} minDate={today} maxDate={choice.date} disabled={busy}
                onChange={date=>setSpecialDraft({key:choiceKey,date,time:specialTime})} />
              <div className="grid gap-1.5"><span className="text-xs font-medium text-ink-muted">Horário do aviso</span>
                <HealthTimePicker value={specialTime} disabled={busy} clearable={false}
                  onChange={time=>setSpecialDraft({key:choiceKey,date:specialDate,time})} />
              </div>
            </div>
            {specialTooLate?<p role="status" className="mt-2 text-[11px] text-amber-200">O aviso precisa ocorrer antes ou no horário do compromisso.</p>:null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy||!specialValid||!matchingDraft} onClick={()=>void run(async()=>{
                if(!choice||!specialValid)return;
                await notificationPoliciesRepositoryP2.update(pid,choice.kind,choice.id,{enabled:policy?.enabled!==false,offsets:policy?.offsets??null,custom_at:specialValue});
                setSpecialDraft(null);
              },'Aviso especial salvo na fila de sincronização.')} className="min-h-11 rounded-xl bg-emerald-400 px-3 text-[11px] font-bold text-void disabled:opacity-40">Salvar aviso especial</button>
              <button type="button" disabled={busy||(!policy?.custom_at&&!matchingDraft)} onClick={()=>void run(async()=>{
                if(!choice)return;
                await notificationPoliciesRepositoryP2.update(pid,choice.kind,choice.id,{enabled:policy?.enabled!==false,offsets:policy?.offsets??null,custom_at:null});
                setSpecialDraft(null);
              },'Aviso especial removido; regras gerais preservadas.')} className="min-h-11 rounded-xl border border-surface-border px-3 text-[11px] text-ink-muted disabled:opacity-40">Limpar aviso especial</button>
            </div>
          </div>
          <button type="button" disabled={busy||!policy} onClick={()=>savePolicy({enabled:true,offsets:null,custom_at:null})} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-[11px] text-ink-muted disabled:opacity-40"><RotateCcw size={14}/> Restaurar antecedentes da categoria</button>
        </div>}
      </>}
      <div className="mt-4 rounded-xl border border-surface-border/50 bg-void/20 p-3"><p className="text-xs font-semibold text-ink-primary">Doses e aferições</p><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Mantêm seus motores e regras finitas já existentes, sem agendar duplicatas. Configure horários de medição e doses nas respectivas áreas.</p><div className="mt-2 flex gap-4 text-[11px] font-semibold text-emerald-300"><Link href="/hoje">Doses</Link><Link href="/saude/lembretes">Aferições e hábitos</Link></div></div>
    </section>
    <section className="rounded-[24px] border border-sky-300/20 bg-surface p-4">
      <div className="flex items-start gap-2"><Clock3 size={19} className="mt-0.5 shrink-0 text-sky-300"/><div><h2 className="text-sm font-bold">Horário de silêncio por categoria</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Opcional e apenas neste dispositivo. Não altera os lembretes de doses nem presume urgência clínica.</p></div></div>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-xs text-ink-muted"><input type="checkbox" className="size-5 accent-sky-300" checked={quiet.enabled} onChange={e=>{try{writeEventQuietP2(uid,pid,{...quiet,enabled:e.target.checked});setMessage('Silêncio local atualizado.');}catch(err){setMessage(String(err));}}}/>Ativar silêncio por categoria</label>
      {quiet.enabled&&<><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><span className="text-[11px] text-ink-muted">Silenciar a partir de</span><HealthTimePicker value={quiet.start} clearable={false} onChange={start=>{try{writeEventQuietP2(uid,pid,{...quiet,start});}catch(err){setMessage(err instanceof Error?err.message:String(err));}}}/></div><div className="grid gap-1.5"><span className="text-[11px] text-ink-muted">Retomar avisos às</span><HealthTimePicker value={quiet.end} clearable={false} onChange={end=>{try{writeEventQuietP2(uid,pid,{...quiet,end});}catch(err){setMessage(err instanceof Error?err.message:String(err));}}}/></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2">{EVENT_KINDS_P2.map(kind=><label key={kind} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/60 bg-void/20 px-2 text-[11px] text-ink-secondary"><input type="checkbox" checked={quiet.kinds.includes(kind)} onChange={e=>{const kinds=e.target.checked?[...quiet.kinds,kind]:quiet.kinds.filter(x=>x!==kind);try{writeEventQuietP2(uid,pid,{...quiet,kinds});}catch(err){setMessage(String(err));}}} className="size-4 accent-sky-300"/>{names[kind]}</label>)}</div></>}
    </section>
    <section className="rounded-[24px] border border-violet-300/20 bg-surface p-4">
      <div className="flex items-start gap-3"><HeartHandshake size={20} className="mt-0.5 shrink-0 text-violet-300"/><div><h2 className="text-sm font-bold">Como foi sua recuperação após a consulta?</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Convites privados D+1, D+3 e D+10, apenas se você ativar. Não são diagnósticos, não registram respostas automaticamente e não serão criados para dias passados.</p></div></div>
      {!completed.length?<p className="mt-3 text-xs text-ink-muted">Nenhuma consulta concluída cadastrada nesta pessoa.</p>:<div className="mt-3 grid gap-3">{completed.map(c=>{
        const id=c.id||'',entry=data?.policies.find(p=>p.event_kind==='checkin'&&p.event_id===id)??null;
        const invitations=checkinInvitationsP2({appointmentId:id,consultDate:c.data,status:c.status,policy:entry,now});
        return <article key={id} className="rounded-2xl border border-surface-border/60 bg-void/30 p-3"><p className="text-xs font-semibold text-ink-primary">{c.motivo||'Consulta'} · {day(c.data)}</p>
          <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-ink-secondary"><input type="checkbox" disabled={busy} className="size-5 accent-violet-300" checked={entry?.enabled??false} onChange={e=>run(()=>notificationPoliciesRepositoryP2.setCheckinConsent(pid,id,e.target.checked),'Preferência privada salva e enfileirada para sincronizar.')}/>Ativar acompanhamento voluntário</label>
          {entry?.enabled&&<div className="mt-2 grid gap-2">{CHECKIN_DAYS_P2.map(dayCount=>{
            const previous=entry.checkin_answers?.[dayCount];const scheduled=Boolean(invitations.some(x=>x.day===dayCount));
            const eligible=checkinCanAnswerP2({consultDate:c.data,status:c.status,consentAt:entry?.consent_at,day:dayCount,now,previous});
            return <div key={dayCount} className="rounded-xl border border-surface-border/50 bg-surface/70 p-2"><p className="text-[11px] text-ink-muted">D+{dayCount} {previous?`· ${previous.answer.replace('_',' ')}`:eligible?'· disponível para responder':scheduled?'· convite agendado':'· fora da janela atual'}</p>
              <div className="mt-2 flex flex-wrap gap-1">{([['reconheci','Reconheci'],['ja_sabia','Já sabia'],['adiar','Adiar 1 dia'],['dispensar','Dispensar']] as const).map(([answer,label])=><button key={answer} type="button" disabled={busy||!eligible} onClick={()=>run(()=>notificationPoliciesRepositoryP2.answerCheckin(pid,id,dayCount,answer),'Resposta voluntária guardada na sua conta.')} className="min-h-11 rounded-xl border border-surface-border/70 px-2.5 text-[10px] text-ink-secondary disabled:opacity-40">{label}</button>)}</div>
            </div>})}</div>}
        </article>})}</div>}
    </section>
    <Link href="/saude/careflow/linha-do-tempo" className="flex min-h-14 items-center justify-between gap-3 rounded-[22px] border border-emerald-400/20 bg-surface p-4 text-xs font-semibold text-emerald-200"><span className="flex items-center gap-2"><CalendarDays size={18}/> Abrir Brain longitudinal factual</span><ChevronRight size={16}/></Link>
    {message?<p className="rounded-xl border border-emerald-400/20 bg-surface p-3 text-xs text-emerald-200" role="status">{message}</p>:null}
    <p className="flex items-start gap-2 px-2 text-[10px] leading-relaxed text-ink-faint"><ShieldAlert size={16} className="shrink-0"/> Preferência salva, sincronização concluída e notificação realmente entregue são três estados distintos. No PWA fechado não há garantia de disparo; no APK dependemos da permissão e do Android.</p>
  </div>;
}
