'use client';
/** M2 — canonical exam orders, sessions, partial collection and explicit consultation relationships. */
import { Suspense, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardList, FlaskConical, CalendarCheck, Plus, CheckCircle2, RotateCcw, FileCheck2, XCircle, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { createExamOrderM1 } from '@/lib/clinical-exams-m1/repository';
import { scheduleExamSessionM2, recordExamSessionProgressM2, cancelExamSessionM2, rescheduleExamSessionM2, recordExamResultM2, linkExamReviewConsultationM2 } from '@/lib/clinical-exams-m2/repository';
import { displayCivilM2, localCivilToIsoM2, projectExamWorkspaceM2, type ExamWorkspaceM2 } from '@/lib/clinical-exams-m2/domain';
import { checkExamNotificationStateM2, requestExactExamAlarmsM2 } from '@/lib/clinical-exams-m2/notifications';
import { getLocalTodayISO } from '@/lib/health-utils';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthTimePicker } from '@/components/saude/HealthTimePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { ExamClinicalDocumentsM3 } from '@/components/saude/ExamClinicalDocumentsM3';

const input='mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5 text-sm text-ink-primary outline-none focus:border-sky-300';
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-xs font-semibold text-ink-primary transition hover:border-sky-300';
const primary='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2.5 text-xs font-bold text-void disabled:opacity-50';
const box='rounded-2xl border border-surface-border/80 bg-surface p-4';
const statusName:Record<string,string>={pending:'Pendente',scheduled:'Agendado',collected:'Coletado / realizado',result_pending:'Aguardando laudo',result_received:'Resultado recebido',cancelled:'Cancelado',recollection_needed:'Reagendar / recoletar'};
const uuid=()=>crypto.randomUUID();

function OrdersPage(){
  const router=useRouter(),params=useSearchParams();
  const {user}=useAuth(); const {activePersonId}=useActivePersonId();
  const uid=user?.id||'',pid=activePersonId||'';
  const [newOpen,setNewOpen]=useState(params.has('novo'));
  const [title,setTitle]=useState('Pedido de exames');
  const [kind,setKind]=useState<'medical_request'|'standalone'>('medical_request');
  const [requestedOn,setRequestedOn]=useState(getLocalTodayISO());
  const [validUntil,setValidUntil]=useState('');
  const [itemsText,setItemsText]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [consultationId,setConsultationId]=useState(params.get('consulta')||'');
  const [doctorId,setDoctorId]=useState('');
  const [selection,setSelection]=useState<string[]>([]);
  const [scheduledAt,setScheduledAt]=useState('');
  const [laboratory,setLaboratory]=useState('');
  const [labProtocol,setLabProtocol]=useState('');
  const [expectedResult,setExpectedResult]=useState('');
  const [prepSource,setPrepSource]=useState<''|'laboratorio'|'profissional'|'documento'>('');
  const [prepMinutes,setPrepMinutes]=useState('');
  const [prepInstructions,setPrepInstructions]=useState('');
  const [prepConfirmed,setPrepConfirmed]=useState(false);
  const [prepAlert,setPrepAlert]=useState(false);
  const [sessionAlert,setSessionAlert]=useState(false);
  const [resultAlert,setResultAlert]=useState(false);
  const [reviewId,setReviewId]=useState('');
  const [resultEdits,setResultEdits]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
  const [alarmMode,setAlarmMode]=useState('');
  const createIntent=useRef<{key:string;ids:{orderId:string;itemIds:string[];linkId?:string}}|null>(null);
  const sessionIntent=useRef<{key:string;sessionId:string;linkIds:string[]}|null>(null);
  const rescheduleIntent=useRef<{key:string;sessionId:string;linkIds:string[]}|null>(null);
  const selectedOrder=params.get('id')||'';
  const state=useLiveQuery(async()=>{
    if(!uid||!pid)return {rows:[] as ExamWorkspaceM2[],consultas:[] as Array<{id:string;data?:string;especialidade?:string;medico?:string}>,medicos:[] as Array<{id:string;nome:string}>};
    const [orders,items,sessions,links,consults,doctors]=await Promise.all([
      db.exam_orders.where('person_id').equals(pid).toArray(),
      db.exam_order_items.where('person_id').equals(pid).toArray(),
      db.exam_sessions.where('person_id').equals(pid).toArray(),
      db.exam_session_items.where('person_id').equals(pid).toArray(),
      db.consultas.where('person_id').equals(pid).toArray(),
      db.medicos.where('user_id').equals(uid).toArray(),
    ]);
    return {
      rows:projectExamWorkspaceM2(orders,items,sessions,links,uid,pid),
      consultas:consults.filter(x=>x.user_id===uid).map(x=>({id:x.id||'',data:x.data,especialidade:x.especialidade,medico:x.medico})).filter(x=>x.id),
      medicos:doctors.filter(x=>x.user_id===uid&&x.id).map(x=>({id:x.id!,nome:x.nome})),
    };
  },[uid,pid]);
  const selected=useMemo(()=>state?.rows.find(r=>r.order.id===selectedOrder),[state,selectedOrder]);
  const selectedPending=selected?.items.filter(i=>(i.status==='pending'||i.status==='recollection_needed')&&!i.deleted_at)||[];
  const lines=useMemo(()=>[...new Set(itemsText.split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean))].slice(0,120),[itemsText]);
  const busyCall=async(work:()=>Promise<void>)=>{
    if(busy)return;
    setBusy(true);setFeedback('');
    try{await work();setFeedback('Operação registrada. A sincronização seguirá a fila offline do VAULT.');}
    catch(e){setFeedback(e instanceof Error?e.message:'Não foi possível concluir. Nenhum resultado foi presumido.');}
    finally{setBusy(false);}
  };
  const create=()=>busyCall(async()=>{
    if(!pid||!uid||!confirmed||!lines.length)throw Error('Selecione uma pessoa e confirme manualmente cada exame.');
    if(kind==='standalone'&&lines.length!==1)throw Error('Exame avulso deve conter somente um item.');
    const fingerprint=JSON.stringify([uid,pid,title,kind,requestedOn,validUntil,doctorId,consultationId,lines]);
    if(createIntent.current?.key!==fingerprint)createIntent.current={key:fingerprint,
      ids:{orderId:uuid(),itemIds:lines.map(()=>uuid()),linkId:consultationId?uuid():undefined}};
    const id=await createExamOrderM1({personId:pid,title,kind,items:lines,requestedOn,validUntil:validUntil||null,
      doctorId:doctorId||null,consultationId:consultationId||null,idempotency:createIntent.current.ids});
    setNewOpen(false);setConfirmed(false);setItemsText('');createIntent.current=null;
    router.replace(`/saude/exames/pedidos?id=${encodeURIComponent(id)}`);
  });
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Sao_Paulo';
  const sessionInput=(order:ExamWorkspaceM2,ids:readonly string[],intentScope:'create'|'reschedule'='create')=>{
    if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(scheduledAt))
      throw Error('Escolha a data e o horário completo confirmados pelo laboratório.');
    if(expectedResult && !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(expectedResult))
      throw Error('Informe data e horário completos da previsão do resultado.');
    if(!ids.length)throw Error('Marque os exames que serão realizados nessa sessão.');
    if(prepMinutes.trim()&&(!prepSource||!prepInstructions.trim()||!prepConfirmed))
      throw Error('Informe fonte e instruções reais do preparo, confirmando sua origem.');
    if(prepAlert&&!prepMinutes.trim())throw Error('Sem preparo informado não pode haver alerta de jejum.');
    const minutes=prepMinutes.trim()?Number(prepMinutes):null;
    if(minutes!=null&&(!Number.isInteger(minutes)||minutes<0||minutes>10080))throw Error('Duração de preparo inválida.');
    const fingerprint=JSON.stringify([uid,pid,order.order.id,ids,scheduledAt,laboratory,labProtocol,expectedResult,
      prepSource,prepMinutes,prepInstructions,prepConfirmed,prepAlert,sessionAlert,resultAlert,intentScope]);
    const ref=intentScope==='create'?sessionIntent:rescheduleIntent;
    if(ref.current?.key!==fingerprint)ref.current={key:fingerprint,sessionId:uuid(),linkIds:ids.map(()=>uuid())};
    const idempotency={sessionId:ref.current.sessionId,linkIds:ref.current.linkIds};
    return {personId:pid,orderId:order.order.id,itemIds:ids,idempotency,
      scheduledAt:localCivilToIsoM2(scheduledAt),timeZone:tz,laboratoryName:laboratory.trim()||null,
      prepMinutes:minutes,prepInstructions:prepInstructions.trim()||null,prepConfirmedByUser:prepConfirmed,
      prepSource,expectedResultAt:expectedResult?localCivilToIsoM2(expectedResult):null,
      labProtocolCode:labProtocol.trim()||null,prepReminderOptIn:prepAlert,
      appointmentReminderOptIn:sessionAlert,resultReminderOptIn:resultAlert};
  };
  const schedule=()=>busyCall(async()=>{
    if(!selected)throw Error('Selecione um pedido.');
    const ids=selection.filter(id=>selectedPending.some(item=>item.id===id));
    await scheduleExamSessionM2(sessionInput(selected,ids));
    sessionIntent.current=null;
    setSelection([]);setScheduledAt('');
  });
  const optins=()=>busyCall(async()=>{
    const status=await checkExamNotificationStateM2();setAlarmMode(status);
  });
  return <main className="min-h-screen bg-void px-3 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary">
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex items-start gap-3">
        <button type="button" className={button} onClick={()=>router.push('/saude/exames')} aria-label="Voltar para exames"><ArrowLeft size={18}/></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">VAULT · Exames 360</p>
          <h1 className="text-xl font-bold">Pedidos, sessões e resultados</h1>
          <p className="mt-1 text-xs text-ink-muted">Cada exame tem situação própria. Somente horários confirmados aparecem na agenda.</p></div>
      </header>
      {!pid&&<section role="alert" className={box}>Selecione uma pessoa para acessar seus exames.</section>}
      {feedback&&<p role="status" className="rounded-xl border border-sky-300/30 bg-sky-300/10 p-3 text-xs">{feedback}</p>}
      <section className={box}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><ClipboardList size={17}/> Pedidos ({state?.rows.length||0})</h2>
          <button className={primary} onClick={()=>{setNewOpen(x=>!x);router.replace('/saude/exames/pedidos?novo=1');}} disabled={!pid}><Plus size={16}/> Novo pedido</button></div>
        {newOpen&&<div className="mt-4 space-y-3 border-t border-surface-border pt-4">
          <p className="text-xs text-ink-muted">Transcreva apenas exames confirmados no pedido; OCR não confirma marcações. Anexos e laudos serão integrados na M3.</p>
          <button type="button" className={button} onClick={()=>router.push('/saude/careflow/exames?novo=1')}>
            Revisar foto / OCR local antes de confirmar os exames
          </button>
          <div className="block text-xs"><span>Tipo de pedido</span><HealthRelationPicker title="Tipo de pedido" kind="status" className={`${input} mt-1`} value={kind} onValueChange={v=>{setKind(v as 'medical_request'|'standalone');setConfirmed(false);}}><option value="medical_request">Pedido médico com vários exames</option><option value="standalone">Exame avulso (um item)</option></HealthRelationPicker></div>
          <label className="block text-xs">Título<input className={input} value={title} maxLength={240} onChange={e=>{setTitle(e.target.value);setConfirmed(false);}}/></label>
          <label className="block text-xs">Exames confirmados — um por linha<textarea rows={5} className={input} value={itemsText} onChange={e=>{setItemsText(e.target.value);setConfirmed(false);}} placeholder="Hemograma&#10;Eletrocardiograma"/></label>
          <p className="text-xs text-sky-200">{lines.length} {lines.length===1?'exame':'exames'} para salvar. Nenhum agendamento será presumido.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CustomDatePicker label="Solicitado em" value={requestedOn} onChange={v=>{setRequestedOn(v);setConfirmed(false);}} />
            <CustomDatePicker label="Validade (se informada)" value={validUntil} onChange={v=>{setValidUntil(v);setConfirmed(false);}} />
            <div className="block text-xs"><span>Médico cadastrado</span><HealthRelationPicker title="Médico cadastrado" kind="doctor" className={`${input} mt-1`} value={doctorId} onValueChange={v=>{setDoctorId(v);setConfirmed(false);}}><option value="">Não informado</option>{state?.medicos.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</HealthRelationPicker></div>
            <div className="block text-xs"><span>Consulta de origem</span><HealthRelationPicker title="Consulta de origem" kind="consultation" className={`${input} mt-1`} value={consultationId} onValueChange={v=>{setConsultationId(v);setConfirmed(false);}}><option value="">Nenhuma consulta vinculada</option>{state?.consultas.map(c=><option key={c.id} value={c.id}>{c.data||''} · {c.especialidade||c.medico||'Consulta'}</option>)}</HealthRelationPicker></div>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Conferi os nomes no pedido real. Não estou afirmando que foram realizados.</label>
          <button type="button" className={primary} disabled={busy||!confirmed||!lines.length} onClick={create}><ShieldCheck size={16}/>Salvar pedido e itens canônicos</button>
        </div>}
        <div className="mt-3 space-y-2">{state?.rows.map(row=><button key={row.order.id} type="button" onClick={()=>{setNewOpen(false);setSelection([]);router.replace(`/saude/exames/pedidos?id=${encodeURIComponent(row.order.id)}`);}}
          className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedOrder===row.order.id?'border-sky-300/60 bg-sky-300/10':'border-surface-border/60 bg-void/20'}`}>
          <FlaskConical size={19} className="shrink-0 text-sky-300"/><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{row.order.title}</strong><span className="text-[11px] text-ink-muted">{row.items.length} itens · {row.sessions.length} sessões · {row.pending} pendentes · {row.resulted} resultados</span></span>
          <Clock size={16} className="shrink-0"/></button>)}</div>
      </section>
      {selected&&<>
        <section className={box}>
          <h2 className="flex items-center gap-2 text-sm font-bold"><CalendarCheck size={17}/> Sessões confirmadas</h2>
          <p className="my-2 text-[11px] text-ink-muted">Uma sessão pode reunir vários exames. A passagem do tempo não marca coleta ou resultado.</p>
          {selected.sessions.length===0&&<p className="text-xs text-ink-muted">Nenhuma sessão confirmada para este pedido.</p>}
          <div className="space-y-3">{selected.sessions.map(({session,links})=><div key={session.id} className="rounded-xl border border-surface-border/70 bg-void/30 p-3">
            <strong className="block text-sm">{session.laboratory_name||'Local informado na sessão'}</strong>
            <p className="mt-1 text-xs">{displayCivilM2(session.scheduled_at)} · {session.timezone_name} · {session.status==='scheduled'?'Confirmada':session.status==='completed'?'Encerrada':session.status==='cancelled'?'Cancelada':'Não realizada'}</p>
            {session.lab_protocol_code&&<p className="mt-1 text-xs">Protocolo: {session.lab_protocol_code}</p>}
            {session.prep_instructions&&<p className="mt-2 whitespace-pre-wrap rounded-lg bg-sky-300/[.05] p-2 text-xs text-ink-muted">Preparo declarado: {session.prep_instructions}</p>}
            {session.expected_result_at&&<p className="mt-1 text-xs text-ink-muted">Previsão de resultado: {displayCivilM2(session.expected_result_at)} (não é laudo recebido)</p>}
            <div className="mt-2 space-y-1">{links.map(link=>{const item=selected.items.find(x=>x.id===link.exam_order_item_id);return <div key={link.id} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-surface-border/40 p-2">
              <span className="min-w-0 flex-1 text-xs">{item?.name||'Exame indisponível'} · <span className="text-ink-muted">{statusName[link.status]||link.status}</span></span>
              {session.status==='scheduled'&&link.status==='scheduled'&&item?.status==='scheduled'&&<>
                <button disabled={busy} className={button} onClick={()=>busyCall(()=>recordExamSessionProgressM2(pid,session.id,[{itemId:link.exam_order_item_id,action:'collected'}]))}><CheckCircle2 size={14}/>Coletado</button>
                <button disabled={busy} className={button} onClick={()=>busyCall(()=>recordExamSessionProgressM2(pid,session.id,[{itemId:link.exam_order_item_id,action:'recollection_needed'}]))}><RotateCcw size={14}/>Recoleta</button>
                <button disabled={busy} className={button} onClick={()=>busyCall(()=>recordExamSessionProgressM2(pid,session.id,[{itemId:link.exam_order_item_id,action:'missed'}]))}>Não realizado</button>
              </>}
            </div>;})}</div>
            {session.status==='scheduled'&&<div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={()=>busyCall(async()=>{
              const remaining=links.filter(x=>x.status==='scheduled').map(x=>x.exam_order_item_id);
              if(!remaining.length)throw Error('Nenhum exame pendente nesta sessão.');
              await recordExamSessionProgressM2(pid,session.id,remaining.map(itemId=>({itemId,action:'collected'})));
            })}><CheckCircle2 size={14}/>Coletar pendentes</button>
              <button disabled={busy} className={button} onClick={()=>busyCall(async()=>{
                if(!window.confirm('Cancelar esta sessão? Coletas já confirmadas permanecerão no histórico.'))return;
                await cancelExamSessionM2(pid,session.id);
              })}><XCircle size={14}/>Cancelar sessão</button>
              <button disabled={busy} className={button} onClick={()=>busyCall(async()=>{
                const still=links.filter(x=>x.status==='scheduled').map(x=>x.exam_order_item_id);
                if(!still.length)throw Error('Nenhum exame para remarcar.');
                if(!window.confirm('Criar nova sessão e preservar o histórico do agendamento anterior?'))return;
                await rescheduleExamSessionM2(pid,session.id,sessionInput(selected,still,'reschedule'));
                rescheduleIntent.current=null;
              })}><RotateCcw size={14}/>Remarcar para data abaixo</button>
            </div>}
          </div>)}</div>
        </section>
        {selectedPending.length>0&&<section className={box}>
          <h2 className="text-sm font-bold">Agendar exames pendentes ({selectedPending.length})</h2>
          <p className="my-2 text-xs text-ink-muted">Marque somente os itens confirmados pelo laboratório. Os demais continuarão sem compromisso.</p>
          <div className="space-y-1">{selectedPending.map(item=><label key={item.id} className="flex min-h-11 items-center gap-2 border-b border-surface-border/40 text-xs"><input type="checkbox" checked={selection.includes(item.id)} onChange={e=>setSelection(prev=>e.target.checked?[...prev,item.id]:prev.filter(x=>x!==item.id))}/><span className="min-w-0 break-words">{item.name}</span></label>)}</div>
          <SessionFields {...{scheduledAt,setScheduledAt,laboratory,setLaboratory,labProtocol,setLabProtocol,expectedResult,setExpectedResult,prepSource,setPrepSource,prepMinutes,setPrepMinutes,prepInstructions,setPrepInstructions,prepConfirmed,setPrepConfirmed,prepAlert,setPrepAlert,sessionAlert,setSessionAlert,resultAlert,setResultAlert,input}}/>
          <button type="button" disabled={busy||!selection.length} className={`${primary} mt-3 w-full`} onClick={schedule}><CalendarCheck size={16}/>Confirmar sessão para {selection.length} exames</button>
        </section>}
        {selected.sessions.some(x=>x.session.status==='scheduled')&&selectedPending.length===0&&<section className={box}>
          <p className="text-xs text-ink-muted">Para remarcar exames ainda agendados, informe a nova data e local abaixo e toque em “Remarcar” na sessão correspondente.</p>
          <SessionFields {...{scheduledAt,setScheduledAt,laboratory,setLaboratory,labProtocol,setLabProtocol,expectedResult,setExpectedResult,prepSource,setPrepSource,prepMinutes,setPrepMinutes,prepInstructions,setPrepInstructions,prepConfirmed,setPrepConfirmed,prepAlert,setPrepAlert,sessionAlert,setSessionAlert,resultAlert,setResultAlert,input}}/>
        </section>}
        <section className={box}><h2 className="text-sm font-bold">Resultados factuais e próximos retornos</h2>
          <p className="my-2 text-xs text-ink-muted">Resultados factuais exigem confirmação. Laudos compartilhados são anexados abaixo, na autoridade privada M3.</p>
          <div className="space-y-3">{selected.items.map(item=><div key={item.id} className="rounded-lg border border-surface-border/60 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><strong className="min-w-0 text-xs">{item.name}</strong><span className="text-[11px] text-sky-300">{statusName[item.status]||item.status}</span></div>
            {(item.status==='collected'||item.status==='result_pending')&&<div className="mt-2 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs">Resumo factual<input className={input} value={resultEdits[item.id]||''} onChange={e=>setResultEdits(x=>({...x,[item.id]:e.target.value}))} placeholder="Resultado transcrito, sem diagnóstico"/></label>
              <button type="button" disabled={busy||!(resultEdits[item.id]||'').trim()} className={button} onClick={()=>busyCall(()=>recordExamResultM2(pid,item.id,resultEdits[item.id],new Date().toISOString()))}><FileCheck2 size={14}/>Confirmar</button></div>}
            {item.result_summary&&<p className="mt-2 whitespace-pre-wrap text-xs text-ink-muted">{item.result_summary}</p>}
          </div>)}</div>
          <div className="mt-3 flex flex-wrap gap-2"><HealthRelationPicker title="Consulta de revisão" kind="consultation" value={reviewId} className={`${input} flex-1`} onValueChange={setReviewId}><option value="">Vincular consulta de retorno</option>{state?.consultas.map(c=><option key={c.id} value={c.id}>{c.data} · {c.especialidade||c.medico||'Consulta'}</option>)}</HealthRelationPicker>
            <button type="button" className={button} disabled={busy||!reviewId} onClick={()=>busyCall(()=>linkExamReviewConsultationM2(pid,selected.order.id,reviewId).then(()=>{}))}>Vincular retorno</button></div>
        </section>
        <ExamClinicalDocumentsM3 orderId={selected.order.id}
          items={selected.items.map(i=>({id:i.id,name:i.name,status:i.status}))}
          sessions={selected.sessions.map(({session,links})=>({id:session.id,label:session.laboratory_name||'Sessão de exames',itemIds:links.map(l=>l.exam_order_item_id)}))}/>
      </>}
      <section className={box}><h2 className="text-sm font-bold">Alertas Android — diagnóstico</h2>
        <p className="mt-1 text-xs text-ink-muted">Avisos exigem consentimento por sessão, notificações do VAULT habilitadas e permissão do Android. Em Espaço Privado bloqueado, o Android 15 pode não entregar avisos.</p>
        <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={button} onClick={optins}>Conferir permissão</button>
          <button type="button" className={button} onClick={()=>busyCall(requestExactExamAlarmsM2)}>Configurar alarmes exatos</button></div>
        {alarmMode&&<p className="mt-2 text-xs">Modo observado: {alarmMode==='exact'?'exato':alarmMode==='approximate'?'aproximado / sem garantia de minuto':alarmMode==='denied'?'sem permissão':alarmMode==='disabled'?'avisos desligados':alarmMode==='web'?'PWA sem alarme nativo':alarmMode}</p>}
      </section>
    </div>
  </main>;
}

/** A data não implica horário. Só um HH:mm explicitamente selecionado torna o agendamento válido. */
function ClinicalCivilDateTimeM2({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  const [date='',time='']=value.split('T');
  return <fieldset className="min-w-0 space-y-1 rounded-xl border border-surface-border/50 p-2.5">
    <legend className="px-1 text-xs font-semibold">{label}</legend>
    <div className="grid min-w-0 gap-2 sm:grid-cols-2">
      <CustomDatePicker label="Data" value={date} onChange={d=>onChange(d?`${d}T${time}`:'')}/>
      <div className="min-w-0"><p className="mb-1.5 text-sm font-medium">Horário</p>
        <HealthTimePicker value={time.slice(0,5)} disabled={!date} onChange={t=>onChange(date?`${date}T${t}`:'')}/>
      </div>
    </div>
    {date&&!time&&<p role="status" className="text-[11px] text-amber-200">Data escolhida, mas horário ainda não confirmado.</p>}
  </fieldset>;
}

type SessionFieldsProps={scheduledAt:string;setScheduledAt:(v:string)=>void;laboratory:string;setLaboratory:(v:string)=>void;
 labProtocol:string;setLabProtocol:(v:string)=>void;expectedResult:string;setExpectedResult:(v:string)=>void;
 prepSource:''|'laboratorio'|'profissional'|'documento';setPrepSource:(v:''|'laboratorio'|'profissional'|'documento')=>void;
 prepMinutes:string;setPrepMinutes:(v:string)=>void;prepInstructions:string;setPrepInstructions:(v:string)=>void;
 prepConfirmed:boolean;setPrepConfirmed:(v:boolean)=>void;prepAlert:boolean;setPrepAlert:(v:boolean)=>void;
 sessionAlert:boolean;setSessionAlert:(v:boolean)=>void;resultAlert:boolean;setResultAlert:(v:boolean)=>void;input:string};
function SessionFields(p:SessionFieldsProps){return <div className="mt-3 space-y-3 border-t border-surface-border/50 pt-3">
  <div className="grid gap-3 sm:grid-cols-2">
    <ClinicalCivilDateTimeM2 label="Data e horário confirmados" value={p.scheduledAt} onChange={p.setScheduledAt}/>
    <label className="block text-xs">Laboratório / clínica<input className={p.input} value={p.laboratory} onChange={e=>p.setLaboratory(e.target.value)} placeholder="Somente local confirmado"/></label>
    <label className="block text-xs">Protocolo (opcional)<input className={p.input} value={p.labProtocol} onChange={e=>p.setLabProtocol(e.target.value)}/></label>
    <ClinicalCivilDateTimeM2 label="Previsão do resultado (opcional)" value={p.expectedResult} onChange={p.setExpectedResult}/>
  </div>
  <details className="rounded-xl border border-surface-border/50 p-3"><summary className="cursor-pointer text-xs font-bold">Preparo / jejum — somente orientação declarada</summary>
    <div className="mt-2 block text-xs"><span>Origem confirmada do preparo</span><HealthRelationPicker title="Fonte de orientação do preparo" kind="status" className={`${p.input} mt-1`} value={p.prepSource} onValueChange={v=>p.setPrepSource(v as SessionFieldsProps['prepSource'])}>
      <option value="">Nenhuma orientação informada</option><option value="laboratorio">Laboratório</option><option value="profissional">Profissional de saúde</option><option value="documento">Documento do pedido</option></HealthRelationPicker></div>
    <label className="mt-2 block text-xs">Antecedência em minutos (se informada)<input type="number" min={0} max={10080} className={p.input} value={p.prepMinutes} onChange={e=>p.setPrepMinutes(e.target.value)}/></label>
    <label className="mt-2 block text-xs">Orientação textual<textarea className={p.input} rows={3} value={p.prepInstructions} onChange={e=>p.setPrepInstructions(e.target.value)} placeholder="Copie a orientação recebida; o VAULT não deduz jejum"/></label>
    <label className="mt-2 flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={p.prepConfirmed} onChange={e=>p.setPrepConfirmed(e.target.checked)}/> Confirmei a orientação na fonte identificada</label>
  </details>
  <div className="grid gap-2 sm:grid-cols-3">
    <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={p.prepAlert} onChange={e=>p.setPrepAlert(e.target.checked)}/> Aviso de preparo (opt-in)</label>
    <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={p.sessionAlert} onChange={e=>p.setSessionAlert(e.target.checked)}/> Aviso de sessão (opt-in)</label>
    <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={p.resultAlert} onChange={e=>p.setResultAlert(e.target.checked)}/> Aviso de previsão de laudo (opt-in)</label>
  </div>
</div>;}

export default function CanonicalExamOrdersPageM2(){return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-ink-primary">Abrindo pedidos de exames…</main>}><OrdersPage/></Suspense>;}
