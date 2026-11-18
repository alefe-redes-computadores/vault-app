'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, CalendarClock, FileText, HeartPulse, Plus } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthTimePicker } from '@/components/saude/HealthTimePicker';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';
import { useHealthReminders } from '@/hooks/useHealthReminders';
import { healthRemindersRepository } from '@/lib/repositories/healthReminders';
import { saveHealthMeasurement } from '@/lib/repositories/healthMeasurements';
import { pdfLibraryM2 } from '@/lib/careflow-m2/pdf-library';
import { getLocalTodayISO } from '@/lib/health-utils';
import { isClockM2, isIsoDateM2 } from '@/lib/careflow-m2/domain';
const input='min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary focus:border-sky-300/50 outline-none';
const nowClock=()=>new Date().toTimeString().slice(0,5);
const validBP=(sys:number,dia:number)=>Number.isInteger(sys)&&Number.isInteger(dia)&&sys>=30&&sys<=300&&dia>=20&&dia<=200&&dia<sys;
export default function PressureCareFlowPage(){
  const {events=[],append,activePersonId,userId}=useCareFlowM2();
  const {registros=[]}=useRegistrosSaude();const {reminders=[]}=useHealthReminders();
  const [start,setStart]=useState(getLocalTodayISO()),[end,setEnd]=useState(getLocalTodayISO());
  const [slots,setSlots]=useState(['08:00','14:00','20:00']),[planNote,setPlanNote]=useState('');
  const [selectedPlan,setSelectedPlan]=useState(''),[systolic,setSystolic]=useState(''),[diastolic,setDiastolic]=useState('');
  const [date,setDate]=useState(getLocalTodayISO()),[time,setTime]=useState(nowClock()),[note,setNote]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const plans=useMemo(()=>events.filter(e=>e.kind==='monitor_plan'&&e.user_id===userId&&e.person_id===activePersonId).sort((a,b)=>b.created_at.localeCompare(a.created_at)),[events,userId,activePersonId]);
  const measurements=useMemo(()=>registros.filter(r=>r.user_id===userId&&r.person_id===activePersonId&&r.tipo==='pressao_arterial').sort((a,b)=>`${b.data}T${b.horario||'00:00'}`.localeCompare(`${a.data}T${a.horario||'00:00'}`)),[registros,userId,activePersonId]);
  const refs=useMemo(()=>new Set(reminders.filter(r=>r.user_id===userId&&r.person_id===activePersonId&&r.careflow_m2?.plan_id).map(r=>r.careflow_m2!.plan_id)),[reminders,userId,activePersonId]);
  const trend=useMemo(()=>measurements.slice(0,60).reverse().map(r=>{
    const match=/^\s*(\d+)\s*\/\s*(\d+)/.exec(String(r.valor_medicao||''));
    return match?{date:r.data,sys:Number(match[1]),dia:Number(match[2])}:null;
  }).filter((r):r is {date:string;sys:number;dia:number}=>Boolean(r)),[measurements]);
  const chart=useMemo(()=>{
    const nums=trend.flatMap(x=>[x.sys,x.dia]),min=Math.max(0,Math.min(...nums)-15),max=Math.max(...nums)+15,span=Math.max(1,max-min);
    const toPoint=(kind:'sys'|'dia')=>trend.map((x,i)=>`${20+i*280/Math.max(1,trend.length-1)},${125-100*(x[kind]-min)/span}`).join(' ');
    return {top:Math.round(max),bottom:Math.round(min),systolic:toPoint('sys'),diastolic:toPoint('dia')};
  },[trend]);
  const createPlan=async()=>{
    if(!activePersonId||busy)return;setBusy(true);setMessage('');
    try{
      const clean=[...new Set(slots.filter(Boolean))].sort();
      if(!isIsoDateM2(start)||!isIsoDateM2(end)||end<start||clean.length<1||clean.length>6||clean.some(x=>!isClockM2(x)))throw new Error('Confira datas e horários.');
      const id=crypto.randomUUID();
      await append({id,kind:'monitor_plan',payload:{start,end,slots:clean,note:planNote.trim(),origin:'patient_confirmed'}});
      setSelectedPlan(id);
      try{
        await healthRemindersRepository.createMany(clean.map(clock=>({person_id:activePersonId,
          title:`Registrar pressão · ${clock}`,body:'Registre apenas valores realmente medidos.',
          target_type:'health_record:medicao',target_route:'/saude/registros/novo?preset=medicao',
          time:clock,frequency:'daily',weekdays:[],status:'active',
          careflow_m2:{plan_id:id,start,end},
        })));
        setMessage(`Plano registrado de ${start} a ${end}, com ${clean.length} lembrete(s) de período limitado.`);
      }catch(e){setMessage(`Plano preservado (ID ${id.slice(0,8)}), mas não foi possível criar os lembretes. Configure-os em Lembretes de Saúde. ${e instanceof Error?e.message:''}`);}
    }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar o plano.');}finally{setBusy(false);}
  };
  const saveReading=async()=>{
    if(!activePersonId||busy)return;setBusy(true);setMessage('');
    const id=crypto.randomUUID();
    try{
      const sys=Number(systolic),dia=Number(diastolic);
      if(!validBP(sys,dia)||!isIsoDateM2(date)||!isClockM2(time))throw new Error('Informe valores inteiros de pressão e data/hora válidas.');
      await saveHealthMeasurement(activePersonId,{id,type:'pressao_arterial',value:sys,second:dia,date,time,deviceId:null,source:'manual',notes:note.trim()});
      setSystolic('');setDiastolic('');setNote('');
      if(selectedPlan){
        try{await append({kind:'monitor_reading',parent_id:selectedPlan,related_id:id,payload:{source:'manual',date,time,systolic:sys,diastolic:dia}});
          setMessage('Medição real e vínculo ao plano salvos.');
        }catch{setMessage(`Medição ${id.slice(0,8)} foi salva no histórico canônico; vínculo ao plano não foi concluído. Não repita a medição, consulte o histórico.`);}
      }else setMessage('Medição salva no histórico de saúde da pessoa.');
    }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar a medição.');}finally{setBusy(false);}
  };
  const archivePdf=async()=>{
    if(!activePersonId||!measurements.length||busy)return;setBusy(true);setMessage('');
    try{
      const {default:jsPDF}=await import('jspdf');
      const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});let y=18;
      const write=(content:string)=>{pdf.setFontSize(9);for(const line of pdf.splitTextToSize(content,174) as string[]){if(y>278){pdf.addPage();y=18;}pdf.text(line,18,y);y+=5;}y+=2;};
      pdf.setFont('helvetica','bold');write('VAULT / ACOMPANHAMENTO DE PRESSAO ARTERIAL');
      pdf.setFont('helvetica','normal');write('Registros pessoais declarados; nao substituem avaliacao medica.');
      for(const r of measurements)write(`${r.data} ${r.horario||''} | ${r.valor_medicao||'sem valor'} | ${r.observacoes||''}`);
      const blob=pdf.output('blob');
      const freshPerson=activePersonId;
      await pdfLibraryM2.add(freshPerson,{title:`Pressão arterial · ${measurements.length} medições`,start:measurements[measurements.length-1]?.data||getLocalTodayISO(),end:measurements[0]?.data||getLocalTodayISO(),origin:'clinical_report',blob});
      setMessage('PDF arquivado SOMENTE neste dispositivo. Abra a Biblioteca para localizar e compartilhar.');
    }catch(e){setMessage(e instanceof Error?e.message:'Falha ao arquivar PDF.');}finally{setBusy(false);}
  };
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4"><header className="flex gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">CareFlow 360 · Monitoramento</p><h1 className="text-xl font-bold">Pressão arterial</h1><p className="text-xs text-ink-muted">Planos finitos, medições reais e histórico longitudinal.</p></div></header>
    <section className="space-y-3 rounded-3xl border border-sky-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><CalendarClock size={17} className="text-sky-300"/>Novo plano de acompanhamento</h2><div className="grid grid-cols-2 gap-2"><CustomDatePicker label="Início" value={start} onChange={setStart}/><CustomDatePicker label="Fim" value={end} minDate={start} onChange={setEnd}/></div><p className="text-[11px] text-ink-muted">Horários iniciais são apenas sugestões da interface: confirme datas e horários reais antes de salvar. Não representam medições. Depois da data final, os lembretes deixam de ser agendados.</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{slots.map((slot,i)=><div key={i} className="min-w-0 text-xs text-ink-muted"><span>Horário {i+1}</span><div className="mt-1 flex min-w-0 items-center gap-1"><HealthTimePicker className="min-w-0 flex-1" value={slot} clearable={false} onChange={value=>setSlots(v=>v.map((x,j)=>i===j?value:x))}/><button type="button" aria-label={`Remover horário ${i+1}`} className="min-h-11 min-w-11 rounded-xl border border-surface-border" onClick={()=>setSlots(v=>v.filter((_,j)=>j!==i))}>×</button></div></div>)}</div><button type="button" disabled={slots.length>=6} onClick={()=>setSlots(v=>[...v,'12:00'])} className="flex min-h-11 items-center gap-2 text-xs text-sky-300 disabled:opacity-40"><Plus size={15}/>Adicionar horário</button><label className="block text-xs text-ink-muted">Observação do plano<input className={`${input} mt-1`} maxLength={250} value={planNote} onChange={e=>setPlanNote(e.target.value)} placeholder="Orientação recebida, se houver"/></label><button type="button" disabled={busy||!activePersonId} onClick={()=>void createPlan()} className="min-h-12 w-full rounded-xl bg-sky-300 text-sm font-bold text-void disabled:opacity-40">Guardar plano + configurar lembretes</button></section>
    {plans.length>0&&<section className="space-y-2"><h2 className="text-sm font-bold">Plano · lembretes programados</h2>{plans.map(p=><button key={p.id} type="button" onClick={()=>setSelectedPlan(selectedPlan===p.id?'':p.id)} aria-pressed={selectedPlan===p.id} className={`w-full rounded-2xl border p-3 text-left text-xs ${selectedPlan===p.id?'border-sky-300 bg-sky-300/10':'border-surface-border bg-surface'}`}><span className="block font-bold">{String(p.payload.start).split('-').reverse().join('/')} a {String(p.payload.end).split('-').reverse().join('/')}</span><span className="mt-1 block text-ink-muted">{Array.isArray(p.payload.slots)?p.payload.slots.join(' · '):'Sem horários'} · {refs.has(p.id)?'lembretes vinculados':'conferir lembretes'}</span></button>)}</section>}
    <section className="space-y-3 rounded-3xl border border-emerald-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><HeartPulse size={17} className="text-emerald-300"/>Registrar pressão realmente medida</h2><div className="grid grid-cols-2 gap-2"><label className="text-xs text-ink-muted">Sistólica (mmHg)<input type="number" inputMode="numeric" className={`${input} mt-1`} value={systolic} onChange={e=>setSystolic(e.target.value)} placeholder="120"/></label><label className="text-xs text-ink-muted">Diastólica (mmHg)<input type="number" inputMode="numeric" className={`${input} mt-1`} value={diastolic} onChange={e=>setDiastolic(e.target.value)} placeholder="80"/></label><CustomDatePicker label="Data da medição" value={date} onChange={setDate} maxDate={getLocalTodayISO()}/><div className="min-w-0 text-xs text-ink-muted"><span>Horário real</span><HealthTimePicker className="mt-1" value={time} onChange={setTime} clearable={false}/></div></div><label className="block text-xs text-ink-muted">Observação (opcional)<input className={`${input} mt-1`} value={note} onChange={e=>setNote(e.target.value)} placeholder="Contexto declarado, não diagnóstico"/></label><p className="text-[11px] text-ink-muted">{selectedPlan?'Esta medição será vinculada ao plano selecionado.':'Sem plano selecionado — registro será salvo na Linha de Saúde.'}</p><button type="button" disabled={busy||!activePersonId} onClick={()=>void saveReading()} className="min-h-12 w-full rounded-xl bg-emerald-300 text-sm font-bold text-void disabled:opacity-40">Salvar medição real</button></section>
    {trend.length>=2&&<section className="rounded-3xl border border-surface-border bg-surface p-3"><h2 className="text-sm font-bold">Tendência registrada · {trend.length} medições</h2><p className="mt-1 text-[10px] text-ink-muted">Linhas de valores informados por você, em ordem cronológica. Sem limite clínico automático.</p><svg viewBox="0 0 320 150" role="img" aria-label="Gráfico de evolução de pressão sistólica e diastólica registradas" className="mt-2 w-full"><line x1="20" y1="125" x2="305" y2="125" stroke="currentColor" strokeOpacity="0.15"/><text x="1" y="18" fontSize="9" fill="currentColor">{chart.top}</text><text x="1" y="127" fontSize="9" fill="currentColor">{chart.bottom}</text><polyline fill="none" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" points={chart.systolic}/><polyline fill="none" stroke="#a78bfa" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" points={chart.diastolic}/></svg><p className="flex gap-4 text-[10px] text-ink-muted"><span className="text-sky-300">● Sistólica</span><span className="text-violet-300">● Diastólica</span></p></section>}
    <section className="space-y-2"><div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Activity size={16} className="text-violet-300"/>Histórico de medições ({measurements.length})</h2><button onClick={()=>void archivePdf()} disabled={busy||!measurements.length} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-violet-300/30 px-3 text-xs text-violet-300 disabled:opacity-40"><FileText size={15}/>Arquivar PDF local</button></div>{!measurements.length&&<p className="text-xs text-ink-muted">Nenhuma medição de pressão registrada para esta pessoa.</p>}{measurements.slice(0,150).map(r=><div className="flex justify-between gap-2 rounded-xl border border-surface-border/60 bg-surface p-3" key={r.id}><span className="text-xs text-ink-muted">{r.data?.split('-').reverse().join('/')} · {r.horario||'Horário não informado'}</span><strong className="text-sm text-ink-primary">{r.valor_medicao||'Sem valor'}</strong></div>)}{measurements.length>150&&<p className="text-xs text-ink-muted">Mostrando as 150 mais recentes. O relatório inclui todo o histórico carregado.</p>}</section>
    <p className="text-[11px] leading-relaxed text-ink-muted">As medições são autorrelatadas e não interpretadas como diagnóstico. Se houver sintomas importantes ou valores preocupantes, siga a orientação do seu profissional de saúde. <span className="block pt-2"><Link href="/saude/careflow/sintomas" className="text-violet-200 underline">Ver sintomas registrados separadamente</Link> — um sintoma não comprova causa de pressão.</span></p>{message&&<p role="status" className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-xs text-amber-200">{message}</p>}
  </div></main></PageTransition>;
}
