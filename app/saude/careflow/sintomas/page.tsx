'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquareHeart, Plus, ShieldCheck } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthTimePicker } from '@/components/saude/HealthTimePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useConsultas } from '@/hooks/useConsultas';
import { useMedicamentos } from '@/hooks/useMedicamentos';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { getLocalTodayISO } from '@/lib/health-utils';
import { isClockM2, isIsoDateM2 } from '@/lib/careflow-m2/domain';
const pick='min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none';
const types=['Zumbido','Tontura','Náusea','Dor','Cansaço','Sono','Outro'];
export default function SymptomsCareFlowPage(){
  const {user}=useAuth(),{activePersonId}=useActivePersonId();const {consultas=[]}=useConsultas();
  const {medicamentos=[]}=useMedicamentos();const {registros=[],createRegistro}=useRegistrosSaude();const {events=[],append}=useCareFlowM2();
  const [type,setType]=useState(types[0]),[other,setOther]=useState(''),[intensity,setIntensity]=useState(5),[date,setDate]=useState(getLocalTodayISO()),[time,setTime]=useState(new Date().toTimeString().slice(0,5));
  const [note,setNote]=useState(''),[medication,setMedication]=useState(''),[consultation,setConsultation]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const own=useMemo(()=>registros.filter(r=>r.user_id===user?.id&&r.person_id===activePersonId&&r.categoria==='sintoma').sort((a,b)=>b.data.localeCompare(a.data)),[registros,user?.id,activePersonId]);
  const add=async()=>{
    if(!activePersonId||busy)return;setBusy(true);setStatus('');
    try{
      const name=(type==='Outro'?other:type).trim();if(!name||!isIsoDateM2(date)||!isClockM2(time))throw new Error('Informe sintoma, data e horário válidos.');
      const recordId=await createRegistro({categoria:'sintoma',tipo:name.toLocaleLowerCase('pt-BR'),nome:name,data:date,horario:time,intensidade:intensity,observacoes:note.trim().slice(0,500),medicamento_id:medication||null});
      setNote('');setOther('');
      if(consultation){try{await append({kind:'monitor_note',related_id:recordId,parent_id:consultation,payload:{date,time,link:'consultation_to_existing_symptom',origin:'patient_confirmed'}});setStatus('Sintoma real registrado e vinculado à consulta.');}
        catch{setStatus(`Sintoma ${recordId.slice(0,8)} foi salvo, mas o vínculo com a consulta não. Não grave o sintoma novamente.`);}}
      else setStatus('Sintoma registrado na Linha de Saúde.');
    }catch(e){setStatus(e instanceof Error?e.message:'Não foi possível registrar o sintoma.');}finally{setBusy(false);}
  };
  const links=useMemo(()=>new Set(events.filter(x=>x.kind==='monitor_note').map(x=>x.related_id)),[events]);
  const trend=useMemo(()=>own.slice(0,50).reverse().filter(r=>typeof r.intensidade==='number'),[own]);
  const points=useMemo(()=>trend.map((r,i)=>`${15+i*290/Math.max(1,trend.length-1)},${115-(r.intensidade||0)*10}`).join(' '),[trend]);
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-32 pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4"><header className="flex gap-3"><Link href="/saude/careflow" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border"><ArrowLeft size={18}/></Link><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">CareFlow 360 · Registro longitudinal</p><h1 className="text-xl font-bold">Sintomas e evolução</h1><p className="text-xs text-ink-muted">Relatos com hora real, intensidade e vínculos confirmados.</p></div></header>
    <section className="space-y-3 rounded-3xl border border-violet-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><MessageSquareHeart size={17} className="text-violet-300"/>Novo sintoma observado</h2><div className="grid grid-cols-2 gap-2"><div className="min-w-0 text-xs text-ink-muted"><span>Sintoma</span><HealthRelationPicker title="Selecionar sintoma" value={type} onValueChange={setType} className={`${pick} mt-1`}>{types.map(t=><option key={t} value={t}>{t}</option>)}</HealthRelationPicker></div><label className="text-xs text-ink-muted">Intensidade relatada: {intensity}/10<input type="range" min={0} max={10} step={1} value={intensity} onChange={e=>setIntensity(Number(e.target.value))} className="mt-3 w-full"/></label>{type==='Outro'&&<label className="col-span-2 text-xs text-ink-muted">Nome do sintoma<input className={`${pick} mt-1`} value={other} onChange={e=>setOther(e.target.value)} maxLength={100}/></label>}<CustomDatePicker label="Dia real" value={date} onChange={setDate} maxDate={getLocalTodayISO()}/><div className="min-w-0 text-xs text-ink-muted"><span>Horário real</span><HealthTimePicker className="mt-1" value={time} onChange={setTime} clearable={false}/></div></div><label className="block text-xs text-ink-muted">Contexto relatado<textarea rows={3} className={`${pick} mt-1 p-3`} value={note} onChange={e=>setNote(e.target.value)} maxLength={500} placeholder="O que você percebeu, sem presumir a causa."/></label><div className="text-xs text-ink-muted"><span>Medicamento mencionado (opcional; não indica causalidade)</span><HealthRelationPicker title="Selecionar medicamento" value={medication} onValueChange={setMedication} className={`${pick} mt-1`} medications={medicamentos}><option value="">Nenhum vínculo</option>{medicamentos.filter(m=>m.id&&m.user_id===user?.id&&m.person_id===activePersonId).map(m=><option value={m.id} key={m.id}>{m.nome}</option>)}</HealthRelationPicker></div><div className="text-xs text-ink-muted"><span>Consulta relacionada (opcional)</span><HealthRelationPicker title="Selecionar consulta" value={consultation} onValueChange={setConsultation} className={`${pick} mt-1`}><option value="">Nenhuma</option>{consultas.filter(c=>c.id&&c.user_id===user?.id&&c.person_id===activePersonId).map(c=><option key={c.id} value={c.id}>{c.data} · {c.especialidade||c.medico||'Consulta'}</option>)}</HealthRelationPicker></div><button type="button" disabled={busy||!activePersonId} onClick={()=>void add()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-300 text-sm font-bold text-void disabled:opacity-40"><ShieldCheck size={17}/>Guardar relato real</button></section>
    {trend.length>1&&<section className="rounded-2xl border border-surface-border bg-surface p-3"><h2 className="text-sm font-bold">Evolução da intensidade informada</h2><p className="mt-1 text-[10px] text-ink-muted">Comparação descritiva de sintomas diferentes, não um diagnóstico ou tendência clínica ajustada.</p><svg viewBox="0 0 320 130" role="img" aria-label="Intensidade relatada dos últimos sintomas em ordem cronológica" className="mt-2 w-full"><line x1="15" y1="115" x2="305" y2="115" stroke="currentColor" strokeOpacity="0.2"/><polyline fill="none" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" points={points}/></svg></section>}
    <section className="space-y-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Plus size={16} className="text-emerald-300"/>Histórico por data ({own.length})</h2>{!own.length&&<p className="text-xs text-ink-muted">Nenhum sintoma documentado para esta pessoa.</p>}{own.slice(0,100).map(r=><article className="rounded-2xl border border-surface-border bg-surface p-3" key={r.id}><p className="text-[10px] text-ink-muted">{r.data} · {r.horario||'sem horário'}{links.has(r.id||'')?' · Vinculado à consulta':''}</p><div className="mt-1 flex items-center justify-between"><strong className="text-sm">{r.nome}</strong><span className="text-xs text-violet-300">{r.intensidade??'?'} / 10</span></div>{r.observacoes&&<p className="mt-1 text-xs text-ink-muted">{r.observacoes}</p>}</article>)}</section>{status&&<p role="status" className="rounded-xl border border-amber-300/20 p-3 text-xs text-amber-200">{status}</p>}
  </div></main></PageTransition>;
}
