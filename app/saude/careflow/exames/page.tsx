'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, FileSearch, FlaskConical, Plus, ScanText, ShieldCheck, Check, ChevronDown, ArrowLeft, Camera, HeartPulse, Droplet, ScanLine, Search } from 'lucide-react';
import { useCareFlowM2 } from '@/hooks/useCareFlowM2';
import { useConsultas } from '@/hooks/useConsultas';
import { useMedicos } from '@/hooks/useMedicos';
import { useLocais } from '@/hooks/useLocais';
import { checkedExamItemsM2, isIsoDateM2, projectExamOrdersM2, type ExamItemReviewM2, type ExamItemStateM2 } from '@/lib/careflow-m2/domain';
import { getLocalTodayISO } from '@/lib/health-utils';
import { PageTransition } from '@/components/PageTransition';
import { ClinicalBackLinkP0 } from '@/components/saude/ClinicalBackLinkP0';
import { CustomDatePicker } from '@/components/DatePicker';
import { HealthRelationPicker } from '@/components/saude/HealthRelationPicker';
import { CareFlowOrderRelationsR5 } from '@/components/saude/CareFlowRelationsR5';
const B='min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary focus:border-emerald-300/60 outline-none';
const stateNames:Record<ExamItemStateM2,string>={pending:'Solicitado',collected:'Realizado / coletado',result_received:'Resultado recebido',cancelled:'Cancelado (informado)'};
type DetectorBlock={rawValue?:string};type Detector=new()=>{detect(b:ImageBitmap):Promise<DetectorBlock[]>};
export default function CareFlowExamsPage(){
  const {events=[],appendMany,append,userId,activePersonId}=useCareFlowM2();const {consultas=[]}=useConsultas();
  const {medicos=[]}=useMedicos();const {locais=[]}=useLocais();
  const [title,setTitle]=useState('Pedido de exames'),[date,setDate]=useState(getLocalTodayISO());
  const [consultation,setConsultation]=useState(''),[doctor,setDoctor]=useState(''),[lab,setLab]=useState('');
  const [doctorId,setDoctorId]=useState(''),[locationId,setLocationId]=useState('');
  const appliedConsultation=useRef('');
  useEffect(()=>{
    if(!userId||!activePersonId)return;
    const id=new URLSearchParams(window.location.search).get('consulta')||'';
    const target=consultas.find(c=>c.id===id&&c.user_id===userId&&c.person_id===activePersonId);
    const key=`${userId}:${activePersonId}:${id}`;
    if(!target||appliedConsultation.current===key)return;
    appliedConsultation.current=key;
    setConsultation(current=>current||id);
    if(target.medico_id&&medicos.some(m=>m.id===target.medico_id&&m.user_id===userId))setDoctorId(current=>current||target.medico_id||'');
    if(target.local_id&&locais.some(l=>l.id===target.local_id&&l.user_id===userId))setLocationId(current=>current||target.local_id||'');
    if(isIsoDateM2(target.data))setDate(target.data);
  },[consultas,medicos,locais,userId,activePersonId]);
  const [search,setSearch]=useState(''),[yearFilter,setYearFilter]=useState('');
  const [candidate,setCandidate]=useState(''),[items,setItems]=useState<ExamItemReviewM2[]>([]);
  const [image,setImage]=useState<string|null>(null),[file,setFile]=useState<File|null>(null);
  const [zoom,setZoom]=useState(100),[text,setText]=useState(''),[ocrState,setOcrState]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const [resultValue,setResultValue]=useState(''),[unit,setUnit]=useState(''),[reference,setReference]=useState(''),[method,setMethod]=useState(''),[resultDate,setResultDate]=useState(getLocalTodayISO());
  const [expanded,setExpanded]=useState('');
  const [tab,setTab]=useState<'orders'|'new'>('orders');
  const [itemStates,setItemStates]=useState<Record<string,ExamItemStateM2>>({});
  type ResultDraft={resultValue:string;unit:string;reference:string;method:string;date:string};
  const [drafts,setDrafts]=useState<Record<string,ResultDraft>>({});
  const draft=(id:string):ResultDraft=>drafts[id]||{resultValue:'',unit:'',reference:'',method:'',date:getLocalTodayISO()};
  const changeDraft=(id:string,partial:Partial<ResultDraft>)=>setDrafts(x=>({...x,[id]:{...draft(id),...partial}}));
  const examIcon=(name:string)=>/hemograma|sangue|glicose/i.test(name)?Droplet:/eletro|eco|cora[cç][aã]o/i.test(name)?HeartPulse:/raio|tomo|resson|imagem/i.test(name)?ScanLine:FlaskConical;
  const orders=useMemo(()=>projectExamOrdersM2(events,userId,activePersonId||''),[events,userId,activePersonId]);
  const filtered=useMemo(()=>orders.filter(o=>(!yearFilter||String(o.order.payload.date||'').slice(0,4)===yearFilter)&&[o.order.payload.title,o.order.payload.date,...o.items.map(i=>i.item.payload.name)].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))),[orders,yearFilter,search]);
  const years=useMemo(()=>[...new Set(orders.map(o=>String(o.order.payload.date||'').slice(0,4)).filter(Boolean))].sort().reverse(),[orders]);
  useEffect(()=>{
    const hash=window.location.hash;
    const isOrder=hash.startsWith('#careflow-pedido-'),isItem=hash.startsWith('#careflow-exame-');
    if(!isOrder&&!isItem)return;
    let id='';try{id=decodeURIComponent(hash.slice(isOrder?('#careflow-pedido-'.length):('#careflow-exame-'.length)));}catch{return;}
    const exists=orders.some(row=>isOrder?row.order.id===id:row.items.some(x=>x.item.id===id));
    if(!exists)return;
    if(tab!=='orders'){setTab('orders');return;}
    if(!filtered.some(row=>isOrder?row.order.id===id:row.items.some(x=>x.item.id===id))){setSearch('');setYearFilter('');return;}
    const frame=window.requestAnimationFrame(()=>{const el=document.getElementById(`${isOrder?'careflow-pedido-':'careflow-exame-'}${id}`);if(isItem&&el instanceof HTMLDetailsElement)el.open=true;el?.scrollIntoView({block:'center',behavior:'auto'});});
    return()=>window.cancelAnimationFrame(frame);
  },[filtered,orders,tab]);
  useEffect(()=>()=>{if(image)URL.revokeObjectURL(image);},[image]);
  const addLines=(raw:string,origin:'manual'|'ocr'='manual')=>{
    const lines=raw.split(/\r?\n|;/).map(x=>x.trim()).filter(Boolean).slice(0,100);
    if(!lines.length)return;
    setItems(prev=>[...prev,...lines.filter(x=>!prev.some(item=>item.label.toLocaleLowerCase('pt-BR')===x.toLocaleLowerCase('pt-BR'))).map(label=>({label,mark:(origin==='ocr'?'uncertain':'checked') as ExamItemReviewM2['mark'],confirmed:false}))].slice(0,100));
    setCandidate('');
  };
  const runOCR=async()=>{
    if(!file||busy)return;setBusy(true);let bitmap:ImageBitmap|null=null;
    try{
      const D=(window as Window&{TextDetector?:Detector}).TextDetector;
      if(!D||typeof createImageBitmap!=='function'){setOcrState('Este aparelho não oferece OCR local. Transcreva os itens manualmente.');return;}
      bitmap=await createImageBitmap(file);const result=await new D().detect(bitmap);
      const recognized=result.map(x=>x.rawValue||'').join('\n').trim().slice(0,10000);
      if(!recognized){setOcrState('Não foi possível ler texto. Use a entrada manual.');return;}
      setText(recognized);setOcrState('Texto sugerido pelo OCR. Revise e adicione somente nomes de exames; as caixas NÃO são detectadas.');
    }catch{setOcrState('Falha no OCR experimental; use digitação manual.');}finally{bitmap?.close();setBusy(false);}
  };
  const submit=async()=>{
    setStatus('');setBusy(true);
    try{
      const checked=checkedExamItemsM2(items);
      if(!activePersonId||!userId||!isIsoDateM2(date))throw new Error('Confira pessoa e data.');
      if(consultation&&!consultas.some(c=>c.id===consultation&&c.user_id===userId&&c.person_id===activePersonId))throw new Error('Consulta vinculada não pertence à pessoa ativa.');
      if(doctorId&&!medicos.some(m=>m.id===doctorId&&m.user_id===userId))throw new Error('Médico vinculado não pertence à conta ativa.');
      if(locationId&&!locais.some(l=>l.id===locationId&&l.user_id===userId))throw new Error('Local vinculado não pertence à conta ativa.');
      const orderId=crypto.randomUUID();
      const rows=[{id:orderId,kind:'exam_order' as const,related_id:consultation||null,payload:{title:title.trim(),date,doctor:(doctorId?'':doctor.trim().slice(0,160)),doctor_id:doctorId||null,location_id:locationId||null,laboratory:lab.trim().slice(0,160),origin:'user_verified_from_document',photoStored:false,checked:checked.length,unchecked:items.filter(x=>x.mark==='unchecked').length,uncertain:items.filter(x=>x.mark==='uncertain').length}},
        ...checked.map(name=>({id:crypto.randomUUID(),kind:'exam_item' as const,parent_id:orderId,payload:{name,confirmedByUser:true,state:'pending',origin:'human_selection'}}))];
      await appendMany(rows);setStatus(`${checked.length} exame(s) salvo(s). Itens não marcados/duvidosos não foram importados.`);
      setTab('orders');setItems([]);setImage(null);setFile(null);setText('');setZoom(100);
    }catch(e){setStatus(e instanceof Error?e.message:'Não foi possível guardar o pedido.');}
    finally{setBusy(false);}
  };
  const addUpdate=async(itemId:string,asResult:boolean)=>{
    setStatus('');setBusy(true);
    const existing=orders.flatMap(o=>o.items).find(x=>x.item.id===itemId);
    if(!existing){setStatus('Exame não está mais disponível para esta pessoa.');setBusy(false);return;}
    const edit=draft(itemId);
    try{
      if(asResult){if(!edit.resultValue.trim()||!isIsoDateM2(edit.date))throw new Error('Preencha resultado e data reais.');
        await appendMany([{kind:'exam_result',parent_id:itemId,payload:{date:edit.date,result:edit.resultValue.trim().slice(0,500),unit:edit.unit.trim().slice(0,70),reference:edit.reference.trim().slice(0,300),method:edit.method.trim().slice(0,160),origin:'manual_transcription_no_interpretation'}},{kind:'exam_status',parent_id:itemId,payload:{state:'result_received'}}]);
        setDrafts(prev=>{const next={...prev};delete next[itemId];return next;});setStatus('Resultado factual registrado, sem diagnóstico automático.');
      }else{const next=itemStates[itemId]||existing.state;
        if(next===existing.state)throw new Error('Escolha uma situação diferente antes de registrar.');
        await append({kind:'exam_status',parent_id:itemId,payload:{state:next}});
        setItemStates(prev=>{const nextItems={...prev};delete nextItems[itemId];return nextItems;});
        setStatus('Novo evento de situação registrado para este exame.');}
    }catch(e){setStatus(e instanceof Error?e.message:'Falha ao salvar o evento.');}finally{setBusy(false);}
  };
  return <PageTransition><main className="min-h-screen bg-void px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 header-safe-top text-ink-primary"><div className="mx-auto max-w-3xl space-y-4">
    <header className="flex items-start gap-3"><ClinicalBackLinkP0 fallback="/saude/careflow" className="flex size-11 items-center justify-center rounded-xl border border-surface-border" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Saúde · Exames</p><h1 className="text-xl font-bold">Pedidos, itens e resultados</h1><p className="mt-1 text-xs text-ink-muted">Um pedido, vários exames individuais e histórico independente.</p></div></header>
    <nav role="tablist" aria-label="Pedidos de exame" className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1"><button role="tab" aria-selected={tab==='orders'} type="button" onClick={()=>setTab('orders')} className={`min-h-11 rounded-lg text-sm font-bold ${tab==='orders'?'bg-emerald-300/15 text-emerald-200':'text-ink-muted'}`}>Meus pedidos ({orders.length})</button><button role="tab" aria-selected={tab==='new'} type="button" onClick={()=>setTab('new')} className={`min-h-11 rounded-lg text-sm font-bold ${tab==='new'?'bg-emerald-300/15 text-emerald-200':'text-ink-muted'}`}>+ Novo pedido</button></nav>
    {tab==='new'&&<section role="tabpanel" className="space-y-3 rounded-3xl border border-emerald-300/20 bg-surface p-4"><h2 className="flex items-center gap-2 text-sm font-bold"><Plus size={17} className="text-emerald-300"/>Novo pedido de exames</h2>
      <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-ink-muted">Título<input className={`${B} mt-1`} value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label><CustomDatePicker label="Data de solicitação" value={date} onChange={setDate} maxDate={getLocalTodayISO()}/><details className="text-xs text-ink-muted sm:col-span-2"><summary className="min-h-11 cursor-pointer rounded-xl border border-surface-border/60 px-3 py-3">Informação do laboratório, se já conhecida</summary><label className="mt-2 block">Laboratório informado no documento (não comprova realização)<input className={`${B} mt-1`} value={lab} onChange={e=>setLab(e.target.value)} placeholder="Opcional; não inventar local"/></label></details></div>
      <div className="grid gap-2 sm:grid-cols-2"><div className="min-w-0 text-xs text-ink-muted"><span>Médico responsável</span><HealthRelationPicker title="Escolher médico" kind="doctor" value={doctorId} onValueChange={value=>{setDoctorId(value);if(value)setDoctor("");}} className={`${B} mt-1`}><option value="">Não informado / outro profissional</option>{medicos.filter(m=>m.id&&m.user_id===userId).map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</HealthRelationPicker>{!doctorId&&<label className="mt-2 block">Outro médico (nome informado no pedido)<input className={`${B} mt-1`} value={doctor} onChange={e=>setDoctor(e.target.value)} placeholder="Se não estiver cadastrado"/></label>}</div><div className="min-w-0 text-xs text-ink-muted"><span>Local relacionado (somente se informado no pedido)</span><HealthRelationPicker title="Escolher local" kind="place" value={locationId} onValueChange={setLocationId} className={`${B} mt-1`}><option value="">Sem local confirmado</option>{locais.filter(l=>l.id&&l.user_id===userId).map(l=><option key={l.id} value={l.id}>{l.nome}</option>)}</HealthRelationPicker></div></div>
      <div className="text-xs text-ink-muted"><span>Consulta relacionada</span><HealthRelationPicker kind="consultation" title="Selecionar consulta" value={consultation} onValueChange={setConsultation} className={`${B} mt-1`}><option value="">Sem vínculo confirmado</option>{consultas.filter(c=>c.id&&c.person_id===activePersonId&&c.user_id===userId).map(c=><option key={c.id} value={c.id}>{c.data?.split('-').reverse().join('/')} · {c.especialidade||c.medico||'Consulta'}</option>)}</HealthRelationPicker></div>
      <div className="rounded-2xl border border-surface-border/60 bg-void/30 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><FileSearch size={16} className="text-sky-300"/>Foto do pedido · conferência visual</p><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">A imagem fica somente na tela, para comparar. Nem o OCR nem o VAULT conseguem comprovar quais quadrinhos estão marcados sem sua revisão.</p>
        <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/[.07] px-4 text-xs font-semibold text-sky-200"><Camera size={16}/>Fotografar ou anexar pedido<input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" aria-label="Selecionar foto do pedido" className="sr-only" onChange={e=>{const next=e.target.files?.[0]||null;if(!next)return;if(next.size>10*1024*1024){setStatus('Foto acima de 10 MB.');return;}setFile(next);setImage(URL.createObjectURL(next));setZoom(100);}}/></label>{file&&<div className="mt-2 flex flex-wrap items-center gap-2"><p className="min-w-0 flex-1 break-all text-[11px] text-ink-secondary">Imagem para conferência: {file.name} · não enviada automaticamente</p><button type="button" onClick={()=>{if(image)URL.revokeObjectURL(image);setFile(null);setImage(null);}} className="min-h-11 rounded-xl border border-surface-border px-2.5 text-xs text-ink-muted">Remover imagem</button></div>}
        {image&&<><label className="mt-2 block text-[11px] text-ink-muted">Zoom para ler as marcações: {zoom}%<input type="range" min={100} max={260} step={20} value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="w-full"/></label><div className="max-h-80 overflow-auto rounded-xl bg-black/50"><img src={image} alt="Pedido de exames selecionado para revisão humana" className="mx-auto max-w-none" style={{width:`${zoom}%`}}/></div></>}
        <button disabled={!file||busy} onClick={()=>void runOCR()} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/20 text-xs font-semibold text-sky-300 disabled:opacity-50"><ScanText size={15}/>Sugerir texto por OCR local (se disponível)</button>
        {ocrState&&<p className="mt-1 text-[11px] text-amber-200">{ocrState}</p>}{text&&<details className="mt-2"><summary className="flex min-h-11 items-center gap-2 text-xs text-sky-300"><ChevronDown size={15}/>Revisar transcrição do OCR</summary><textarea rows={4} className={`${B} mt-2 p-2`} value={text} onChange={e=>setText(e.target.value)}/><button className="mt-2 min-h-11 rounded-xl border border-surface-border px-3 text-xs" onClick={()=>addLines(text,'ocr')}>Criar linhas candidatas (não marcadas)</button></details>}
      </div>
      <div className="rounded-2xl border border-surface-border/60 p-3"><label className="text-xs font-semibold">Adicionar um exame à solicitação<input value={candidate} onChange={e=>setCandidate(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addLines(candidate);}}} className={`${B} mt-2`} placeholder="Nome conforme a solicitação"/></label><button type="button" onClick={()=>addLines(candidate)} className="mt-2 min-h-11 rounded-xl border border-emerald-300/30 px-4 text-xs font-semibold text-emerald-300"><Plus size={14} className="mr-1 inline"/>Adicionar para revisar</button><p className="mt-2 text-[11px] text-ink-muted">Cada item é revisado separadamente; OCR nunca confirma marcações sozinho.</p></div>
      {items.length>0&&<div className="space-y-2"><p className="text-xs font-bold">Confirmar item por item — {items.length} {items.length===1?'linha':'linhas'}</p>{items.map((item,i)=><div key={`${item.label}:${i}`} className="rounded-2xl border border-surface-border/60 bg-void/20 p-3"><div className="flex justify-between gap-2"><input aria-label={`Nome do exame ${i+1}`} className={`${B} min-w-0 flex-1`} value={item.label} maxLength={160} onChange={e=>setItems(rows=>rows.map((x,j)=>j===i?{...x,label:e.target.value,confirmed:false}:x))}/><button type="button" className="text-[11px] text-ink-muted underline" onClick={()=>setItems(v=>v.filter((_,j)=>j!==i))}>Excluir linha</button></div><div className="mt-2 grid grid-cols-3 gap-1.5">{([['checked','Marcado'],['unchecked','Não marcado'],['uncertain','Duvidoso']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={item.mark===id} className={`min-h-11 rounded-lg border px-1 text-[10px] font-semibold ${item.mark===id?'border-emerald-300/50 bg-emerald-300/10 text-emerald-300':'border-surface-border text-ink-muted'}`} onClick={()=>setItems(rows=>rows.map((x,j)=>j===i?{...x,mark:id,confirmed:false}:x))}>{label}</button>)}</div><label className="mt-2 flex min-h-11 items-center gap-2 text-[11px]"><input type="checkbox" checked={item.confirmed} onChange={e=>setItems(rows=>rows.map((x,j)=>j===i?{...x,confirmed:e.target.checked}:x))}/>Revisei este item na solicitação original; não indica exame realizado</label></div>)}</div>}
      <button disabled={!items.length||busy||!activePersonId} onClick={()=>void submit()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-sm font-bold text-void disabled:opacity-40"><ShieldCheck size={17}/>Salvar apenas exames marcados e confirmados</button>
    </section>}
    {tab==='orders'&&<section role="tabpanel" className="space-y-2"><h2 className="flex items-center gap-2 text-sm font-bold"><FlaskConical size={17} className="text-violet-300"/>Pedidos existentes ({orders.length})</h2><Link href="/saude/exames" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/[.06] px-3 text-xs font-semibold text-sky-200"><FlaskConical size={15}/>Exames e Laudos individuais</Link><div className="grid grid-cols-[1fr_105px] gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar qualquer exame, ano, pedido…" aria-label="Buscar exames" className={B}/><HealthRelationPicker title="Filtrar ano dos exames" compact value={yearFilter} onValueChange={setYearFilter} className={B}><option value="">Todos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</HealthRelationPicker></div>{!orders.length&&<p className="text-xs text-ink-muted">Nenhum pedido CareFlow foi registrado para esta pessoa.</p>}{filtered.map(order=><div key={order.order.id} id={`careflow-pedido-${order.order.id}`} className="scroll-mt-24 target:ring-2 target:ring-violet-300/55 rounded-3xl border border-surface-border/70 bg-surface p-3.5"><p className="text-[10px] text-ink-muted">{String(order.order.payload.date||'').split('-').reverse().join('/')} · {order.items.length} {order.items.length===1?'exame':'exames'}</p><h3 className="mt-1 font-bold">{String(order.order.payload.title||'Pedido')}</h3><CareFlowOrderRelationsR5 order={order.order} userId={userId} personId={activePersonId||''} doctors={medicos} places={locais} consultations={consultas}/>{order.items.map(({item,state,result})=><details key={item.id} id={`careflow-exame-${item.id}`} className="mt-2 scroll-mt-24 target:ring-2 target:ring-violet-300/55 rounded-xl border border-surface-border/50 bg-void/20 p-3"><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-xs font-bold"><span className="flex min-w-0 items-center gap-1.5">{(()=>{const Icon=examIcon(String(item.payload.name));return <Icon size={16} className="shrink-0 text-emerald-300"/>})()}{String(item.payload.name)}</span><span className="text-[10px] text-violet-300">{stateNames[state]}</span></summary><div className="mt-2 space-y-2 border-t border-surface-border/40 pt-3"><p className="text-[11px] text-ink-muted">Resultado atual: {result?`${String(result.payload.result)} ${String(result.payload.unit||'')}`:'Aguardando registro'}</p><div className="text-[11px] text-ink-muted"><span>Atualizar situação</span><HealthRelationPicker title="Situação do exame" value={itemStates[item.id]||state} onValueChange={value=>setItemStates(prev=>({...prev,[item.id]:value as ExamItemStateM2}))} className={`${B} mt-1`}>{Object.entries(stateNames).map(([id,label])=><option key={id} value={id}>{label}</option>)}</HealthRelationPicker></div><button disabled={busy} className="min-h-11 w-full rounded-xl border border-violet-300/25 text-xs text-violet-300" onClick={()=>void addUpdate(item.id,false)}>Registrar novo estado</button><div className="space-y-2 rounded-xl bg-surface p-2"><p className="text-xs font-semibold">Registrar resultado real</p><input className={B} placeholder="Valor ou texto exatamente como recebido" value={draft(item.id).resultValue} onFocus={()=>setExpanded(item.id)} onChange={e=>{setExpanded(item.id);changeDraft(item.id,{resultValue:e.target.value})}}/><div className="grid grid-cols-2 gap-2"><input className={B} placeholder="Unidade, se houver" value={draft(item.id).unit} onFocus={()=>setExpanded(item.id)} onChange={e=>{setExpanded(item.id);changeDraft(item.id,{unit:e.target.value})}}/><CustomDatePicker label="Data do resultado" value={draft(item.id).date} onChange={value=>changeDraft(item.id,{date:value})} maxDate={getLocalTodayISO()}/></div><input className={B} placeholder="Método do laboratório (opcional)" value={draft(item.id).method} onFocus={()=>setExpanded(item.id)} onChange={e=>{setExpanded(item.id);changeDraft(item.id,{method:e.target.value})}}/><input className={B} placeholder="Referência do laboratório (opcional)" value={draft(item.id).reference} onFocus={()=>setExpanded(item.id)} onChange={e=>{setExpanded(item.id);changeDraft(item.id,{reference:e.target.value})}}/><button disabled={busy||!draft(item.id).resultValue.trim()} onClick={()=>void addUpdate(item.id,true)} className="min-h-11 w-full rounded-xl bg-violet-300 text-xs font-bold text-void disabled:opacity-40">Guardar resultado sem interpretação</button></div></div></details>)}</div>)}</section>}
    {status&&<p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-xs text-amber-200">{status}</p>}
  </div></main></PageTransition>;
}
