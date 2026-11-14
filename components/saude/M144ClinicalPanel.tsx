'use client';
import Link from 'next/link';
import { useEffect,useMemo,useRef,useState } from 'react';
import { Activity, CalendarDays, ClipboardList, HeartPulse, Pill, ShieldAlert, ShieldCheck, Syringe, Check, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalDay } from '@/hooks/useLocalDay';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useMedicamentos } from '@/hooks/useMedicamentos';
import { useRegistrosSaude } from '@/hooks/useRegistrosSaude';
import { useRenovacoes } from '@/hooks/useRenovacoes';
import { latestRecordedAcquisitionM144 } from '@/src/domain/saude/acquisitionTruth';
import { episodeProgressM144 } from '@/src/domain/saude/careEpisodes';
import { isDayM144, classifyBridgeM144, returnMonitoringM144 } from '@/src/domain/saude/contingency';
import { medicationRegimeM144 } from '@/src/domain/saude/medicationNormalizers';
import { diaryDayForEventM147, displayedEventDayM147 } from '@/src/domain/saude/m147-event-provenance';

type EntryM144={tag:'bridge'|'course'|'immunization'|'procedure'|'risk_benefit';id:string;start?:string;end?:string;anchorId?:string;bridgeId?:string;next?:string;title?:string;lot?:string;note?:string;benefit?:string;cost?:string;pain?:number;energy?:number;recordedAt?:string;hourMeaning?:'registration'};
const tagLabel:Record<EntryM144['tag'],string>={bridge:'Ponte de contingência',course:'Ciclo curto declarado',immunization:'Imunização informada',procedure:'Procedimento informado',risk_benefit:'Risco–benefício relatado'};
function readEvent(context:string|null|undefined):EntryM144|null{
 if(!context?.startsWith('VAULT_M144|'))return null;
 try{const r=JSON.parse(context.slice(11)) as EntryM144;return r&&['bridge','course','immunization','procedure','risk_benefit'].includes(r.tag)?r:null;}catch{return null;}
}
function medLabel(name:string){return name.length>42?name.slice(0,39)+'…':name;}
// V112: máscara textual não nativa — digitar 8 algarismos produz AAAA-MM-DD.
// A validação de dia real continua em isDayM144/episodeProgressM144.
function maskDayInputM144(value:string):string{
 const digits=value.replace(/\D/g,'').slice(0,8);
 if(digits.length<=4)return digits;
 if(digits.length<=6)return `${digits.slice(0,4)}-${digits.slice(4)}`;
 return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6)}`;
}
export function M144ClinicalPanel(){
 const {user,loading:authLoading}=useAuth();const {activePersonId}=useActivePersonId();const today=useLocalDay();
 const {medicamentosIncluindoDescontinuados=[]}=useMedicamentos();
 const {renovacoes=[]}=useRenovacoes();const {registros,isLoading,createRegistro}=useRegistrosSaude();
 const uid=user?.id||'',pid=activePersonId||'';
 const meds=useMemo(()=>(medicamentosIncluindoDescontinuados||[]).filter(m=>m.user_id===uid&&m.person_id===pid&&Boolean(m.id)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')),[medicamentosIncluindoDescontinuados,uid,pid]);
 const acquisitions=useMemo(()=>meds.map(m=>({med:m,result:latestRecordedAcquisitionM144(renovacoes,uid,pid,m.id||'',today)})).filter(x=>Boolean(x.result)).slice(0,25),[meds,renovacoes,uid,pid,today]);
 const entries=useMemo(()=>(registros||[]).filter(r=>r.user_id===uid&&r.person_id===pid).map(r=>({record:r,event:readEvent(r.contexto)})).filter((item):item is typeof item & {event:EntryM144}=>Boolean(item.event)).sort((a,b)=>displayedEventDayM147(b.event,b.record.data).localeCompare(displayedEventDayM147(a.event,a.record.data))).slice(0,100),[registros,uid,pid]);
 const [anchor,setAnchor]=useState(''),[bridge,setBridge]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState('');
 const [note,setNote]=useState(''),[title,setTitle]=useState(''),[lot,setLot]=useState(''),[next,setNext]=useState('');
 const [eventKind,setEventKind]=useState<'immunization'|'procedure'>('immunization');
 const [eventDate,setEventDate]=useState(''),[proofNote,setProofNote]=useState('');
 const [courseMed,setCourseMed]=useState(''),[courseFrom,setCourseFrom]=useState(''),[courseUntil,setCourseUntil]=useState(''),[courseNote,setCourseNote]=useState('');
 const [benefit,setBenefit]=useState(''),[cost,setCost]=useState('');
 const [pain,setPain]=useState(''),[energy,setEnergy]=useState('');
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 const saving=useRef(false);
 const [activeArea,setActiveArea]=useState<'historico'|'contingencias'|'ciclos'|'imunizacoes'|'relatos'>('historico');
 const [historyLimit,setHistoryLimit]=useState(15);
 useEffect(()=>{setAnchor('');setBridge('');setFeedback('');setFrom('');setUntil('');setNote('');setTitle('');setLot('');setNext('');setBenefit('');setCost('');setPain('');setEnergy('');setCourseMed('');setCourseFrom('');setCourseUntil('');setCourseNote('');setEventDate('');setProofNote('');},[uid,pid]);
 const enabled=Boolean(uid&&pid&&!authLoading&&!isLoading);
 async function save(event:EntryM144){
  if(!enabled||saving.current)return;
  saving.current=true;setBusy(true);setFeedback('');
  try{
   const now=new Date(),clock=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
   // A data informada governa o Diário; horario é sempre o horário do lançamento,
   // não confirma o horário da ocorrência (que não foi coletado pelo formulário).
   const eventDayM147 = diaryDayForEventM147(event,today);
   await createRegistro({categoria:'habito',tipo:`vault_m144_${event.tag}`,nome:tagLabel[event.tag],data:eventDayM147,horario:clock,source:'manual',contexto:'VAULT_M144|'+JSON.stringify({...event,recordedAt:now.toISOString(),hourMeaning:'registration'}),medicamento_id:event.tag==='bridge'||event.tag==='course'?event.bridgeId:undefined,observacoes:(event.note||event.benefit||event.cost||'').slice(0,350)});
   setFeedback('Registro criado no Diário da pessoa ativa. O esquema terapêutico não foi alterado.');
   setNote('');setTitle('');setLot('');setNext('');setBenefit('');setCost('');setPain('');setEnergy('');setCourseNote('');setProofNote('');if(event.tag==='bridge'){setFrom('');setUntil('');}if(event.tag==='course'){setCourseFrom('');setCourseUntil('');}if(event.tag==='immunization'||event.tag==='procedure'){setEventDate('');}
  }catch(error){setFeedback(error instanceof Error?error.message:'Não foi possível registrar. Nenhum tratamento foi alterado.');}
  finally{saving.current=false;setBusy(false);}
 }
 const buttonBase='min-h-11 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300';
 const input='mt-1 min-h-11 w-full min-w-0 rounded-xl border border-surface-border bg-void/60 px-3 text-sm text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300';
 return <div className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
  <section className="rounded-[24px] border border-emerald-400/20 bg-surface/80 p-4">
   <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-300"/><h2 className="text-sm font-bold text-ink-primary">Ocorrências e contexto de saúde</h2></div>
   <p className="mt-2 text-xs leading-relaxed text-ink-muted">Esta central registra fatos declarados em seu Diário, sem mudar medicamentos, receita, dose, regime, estoque ou fabricante. A data informada organiza eventos anteriores; o horário do lançamento não confirma o horário da ocorrência. A ausência de informação nunca é tratada como zero ou como comprovação de segurança.</p>
   <div className="mt-3 flex flex-wrap gap-2"><Link href="/saude/visual-studio" className={buttonBase+' inline-flex items-center text-emerald-200'}>Quatro eixos + Fênix</Link><Link href="/saude/supply-shield" className={buttonBase+' inline-flex items-center text-sky-200'}>Estoque e embalagens SS7</Link><Link href="/saude/medicamentos" className={buttonBase+' inline-flex items-center text-ink-primary'}>Medicamentos</Link><Link href="/saude/plano-seguranca" className={buttonBase+' inline-flex items-center gap-1.5 border-rose-300/30 text-rose-200'}><ShieldAlert size={14}/>Plano SOS</Link></div>
  </section>
  {!enabled?<p role="status" className="rounded-xl border border-surface-border p-3 text-xs text-ink-muted">{authLoading||isLoading?'Lendo dados da pessoa…':'Entre na sua conta e selecione uma pessoa para registrar.'}</p>:null}
  {/* M148 P3: somente a area selecionada monta formularios, evitando dezenas de controles simultaneos no Android. */}
  <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Áreas da Central de Saúde">
   {([
    ['historico','Histórico',History],
    ['contingencias','Contingências',ShieldAlert],
    ['ciclos','Ciclos',CalendarDays],
    ['imunizacoes','Vacinas e procedimentos',Syringe],
    ['relatos','Percepções',HeartPulse],
   ] as const).map(([area,label,Icon])=><button key={area} type="button" aria-pressed={activeArea===area}
     onClick={()=>{setActiveArea(area);setFeedback('');}}
     className={`${buttonBase} flex min-h-14 min-w-0 items-center justify-center gap-1.5 px-2 text-center ${activeArea===area?'border-emerald-300/45 bg-emerald-300/[.11] text-emerald-200':'border-surface-border/60 bg-surface/55 text-ink-muted'}`}>
      <Icon size={16} className="shrink-0" aria-hidden="true"/><span className="min-w-0 break-words">{label}</span>
    </button>)}
  </nav>
  {activeArea==='historico' && (
    <>
  {/* VAULT_M144_ACQUISITION_TRUTH: a origem da aquisição é do evento, não do processo SUS. */}
  <details className="rounded-[24px] border border-surface-border bg-surface/70 p-3" aria-label="Origem real de aquisições registradas">
   <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-ink-primary"><ClipboardList size={16} className="text-sky-300"/>Últimas aquisições registradas · {acquisitions.length}</summary>
   <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Apenas registros com data real de aquisição. Um processo SUS não transforma uma compra particular em retirada SUS. Data da receita não prova compra ou retirada.</p>
   {acquisitions.length?<div className="mt-2 space-y-1.5">{acquisitions.map(({med,result})=><div key={med.id} className="rounded-xl border border-surface-border/60 bg-void/40 p-2 text-xs"><strong className="text-ink-primary">{med.nome}</strong><p className="mt-0.5 text-ink-muted">{result?.label} · {result?.date}</p></div>)}</div>:<p className="mt-2 text-xs text-ink-muted">Nenhuma aquisição com data efetiva registrada nesta pessoa.</p>}
  </details>
    </>
  )}
  {activeArea==='contingencias' && (
    <>
  <section className="rounded-[24px] border border-surface-border bg-surface/80 p-4" aria-labelledby="m144-bridge-title">
   <h2 id="m144-bridge-title" className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Pill size={17} className="text-amber-300"/>Ponte de contingência — relato, não prescrição</h2>
   <p className="mt-2 text-xs leading-relaxed text-ink-muted">Registre uma ocorrência passada ou comunicada ao profissional. Isto não recomenda substituir, iniciar ou retomar medicamentos, nem considera uma interação segura.</p>
   <p className="mt-3 text-xs font-semibold text-ink-secondary">1. Medicação-base relacionada</p>
   <div className="mt-1 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Medicação-base">{meds.map(m=><button key={m.id} type="button" disabled={!enabled||busy} aria-pressed={anchor===m.id} onClick={()=>setAnchor(m.id||'')} className={`${buttonBase} shrink-0 ${anchor===m.id?'border-amber-300/60 bg-amber-300/10 text-amber-200':'border-surface-border text-ink-muted'}`}>{medLabel(m.nome)}</button>)}</div>
   <p className="mt-2 text-xs font-semibold text-ink-secondary">2. Medicação pontual já cadastrada</p>
   <div className="mt-1 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Medicação da ocorrência">{meds.filter(m=>m.id!==anchor).map(m=><button key={m.id} type="button" disabled={!enabled||busy} aria-pressed={bridge===m.id} onClick={()=>setBridge(m.id||'')} className={`${buttonBase} shrink-0 ${bridge===m.id?'border-amber-300/60 bg-amber-300/10 text-amber-200':'border-surface-border text-ink-muted'}`}>{medLabel(m.nome)}</button>)}</div>
   <div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-ink-muted">Início informado<input type="text" inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD" maxLength={10} value={from} onChange={e=>setFrom(maskDayInputM144(e.target.value))} className={input}/></label><label className="text-xs text-ink-muted">Fim informado<input type="text" inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD" maxLength={10} value={until} onChange={e=>setUntil(maskDayInputM144(e.target.value))} className={input}/></label></div>
   <p className="mt-1 text-[11px] text-ink-faint">Datas: digite 8 números (AAAAMMDD). O VAULT adiciona os hífens.</p>
   <label className="mt-3 block text-xs text-ink-muted">Contexto (opcional)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={350} rows={2} className={input+' resize-y py-3'} placeholder="O que aconteceu? O que foi relatado ao profissional?"/></label>
   <button type="button" disabled={!enabled||busy||!anchor||!bridge||anchor===bridge||!isDayM144(from)||!isDayM144(until)||until<from} onClick={()=>void save({tag:'bridge',id:'v1',anchorId:anchor,bridgeId:bridge,start:from,end:until,note})} className={buttonBase+' mt-3 w-full border-amber-300/30 bg-amber-300/10 text-amber-200 disabled:opacity-40'}>Registrar ocorrência no Diário</button>
   <p className="mt-2 text-[11px] leading-relaxed text-amber-200">Uma ponte pode apresentar riscos sérios de interação e sedação. Não existe cálculo automático de intervalo seguro de retomada.</p>
  </section>
    </>
  )}
  {activeArea==='ciclos' && (
    <>
  {/* VAULT_M144_COURSE_LEDGER: datas declaradas; nunca inventar dose automática. */}
  <section className="rounded-[24px] border border-violet-400/20 bg-surface/80 p-4" aria-labelledby="m144-course-title">
   <h2 id="m144-course-title" className="flex items-center gap-2 text-sm font-bold text-ink-primary"><CalendarDays size={17} className="text-violet-300"/>Ciclos curtos · episódios</h2>
   <p className="mt-2 text-xs leading-relaxed text-ink-muted">Documente o período informado de um ciclo, inclusive já encerrado. Dia X/Y é apenas calendário. Este registro não cria doses, reativa medicamento nem altera o tratamento.</p>
   <p className="mt-3 text-xs font-semibold text-ink-secondary">Medicamento do episódio</p>
   <div className="mt-1 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Medicamento do ciclo">{meds.map(m=><button key={m.id} type="button" disabled={!enabled||busy} aria-pressed={courseMed===m.id} onClick={()=>setCourseMed(m.id||'')} className={`${buttonBase} shrink-0 ${courseMed===m.id?'border-violet-300/60 bg-violet-300/10 text-violet-200':'border-surface-border text-ink-muted'}`}>{medLabel(m.nome)}</button>)}</div>
   <div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-ink-muted">Início declarado<input type="text" inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD" maxLength={10} value={courseFrom} onChange={e=>setCourseFrom(maskDayInputM144(e.target.value))} className={input}/></label><label className="text-xs text-ink-muted">Fim declarado<input type="text" inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD" maxLength={10} value={courseUntil} onChange={e=>setCourseUntil(maskDayInputM144(e.target.value))} className={input}/></label></div>
   <p className="mt-1 text-[11px] text-ink-faint">Datas: digite 8 números (AAAAMMDD). O VAULT adiciona os hífens.</p>
   {episodeProgressM144(courseFrom,courseUntil,today)?<p role="status" className="mt-2 rounded-lg border border-violet-300/15 bg-violet-300/[.045] p-2 text-xs text-violet-200">{(()=>{const x=episodeProgressM144(courseFrom,courseUntil,today)!;return x.state==='ativo'?`Dia ${x.elapsed} de ${x.total} · período em andamento`:x.state==='historico'?`Histórico · ${x.total} dias declarados`:`Agendado · ${x.total} dias declarados`;})()}</p>:null}
   <label className="mt-2 block text-xs text-ink-muted">Contexto declarado (opcional)<textarea value={courseNote} onChange={e=>setCourseNote(e.target.value)} maxLength={350} rows={2} className={input+' resize-y py-3'}/></label>
   <button type="button" disabled={!enabled||busy||!courseMed||!episodeProgressM144(courseFrom,courseUntil,today)} onClick={()=>void save({tag:'course',id:'v1',bridgeId:courseMed,start:courseFrom,end:courseUntil,note:courseNote})} className={buttonBase+' mt-3 w-full border-violet-300/30 bg-violet-300/10 text-violet-200 disabled:opacity-40'}>Documentar episódio no Diário</button>
  </section>
    </>
  )}
  {activeArea==='relatos' && (
    <>
  <section className="rounded-[24px] border border-sky-400/20 bg-surface/80 p-4" aria-labelledby="m144-risk-title">
   <h2 id="m144-risk-title" className="flex items-center gap-2 text-sm font-bold text-ink-primary"><HeartPulse size={17} className="text-sky-300"/>Benefício observado × custo ou risco relatado</h2>
   <p className="mt-2 text-xs text-ink-muted">Anote separadamente o que percebeu e sinais preocupantes, sem atribuir causalidade. Consulte os quatro eixos para registrar dor, energia, humor e apetite em escala consistente.</p>
   <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-ink-muted">Dor observada, 0–10 (opcional)<input inputMode="numeric" type="number" min={0} max={10} step={1} value={pain} onChange={e=>setPain(e.target.value)} className={input} placeholder="Sem registro"/></label><label className="text-xs text-ink-muted">Energia/iniciativa, 0–10 (opcional)<input inputMode="numeric" type="number" min={0} max={10} step={1} value={energy} onChange={e=>setEnergy(e.target.value)} className={input} placeholder="Sem registro"/></label></div>
   <p className="mt-1 text-[11px] text-ink-muted">Dor alta = mais dor; energia alta = maior energia. Valores não preenchidos permanecem ausentes. Use os quatro eixos para acompanhamento longitudinal.</p>
   <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-ink-muted">Benefício observado<textarea rows={3} maxLength={350} value={benefit} onChange={e=>setBenefit(e.target.value)} className={input+' resize-y py-3'} placeholder="O que percebeu? Em qual momento?"/></label><label className="text-xs text-ink-muted">Efeitos ou preocupações relatados<textarea rows={3} maxLength={350} value={cost} onChange={e=>setCost(e.target.value)} className={input+' resize-y py-3'} placeholder="Sinais percebidos, dúvidas para consulta…"/></label></div>
   <button type="button" disabled={!enabled||busy||(!benefit.trim()&&!cost.trim()&&pain===''&&energy==='')||Boolean((pain!==''&&(!Number.isInteger(Number(pain))||Number(pain)<0||Number(pain)>10))||(energy!==''&&(!Number.isInteger(Number(energy))||Number(energy)<0||Number(energy)>10)))} onClick={()=>void save({tag:'risk_benefit',id:'v1',benefit:benefit.trim(),cost:cost.trim(),pain:pain===''?undefined:Number(pain),energy:energy===''?undefined:Number(energy)})} className={buttonBase+' mt-3 w-full border-sky-300/30 bg-sky-300/10 text-sky-200 disabled:opacity-40'}>Salvar relato sem conclusão clínica</button>
   <p className="mt-2 flex items-start gap-2 text-[11px] text-ink-muted"><ShieldAlert size={15} className="shrink-0 text-amber-300"/>Risco serotoninérgico, convulsivo, sedativo, renal e gastrointestinal exige revisão profissional conforme os produtos reais. Histórico de tolerância não anula alertas regulatórios.</p>
  </section>
    </>
  )}
  {activeArea==='imunizacoes' && (
    <>
  <section className="rounded-[24px] border border-violet-400/20 bg-surface/80 p-4" aria-labelledby="m144-periodic-title">
   <h2 id="m144-periodic-title" className="flex items-center gap-2 text-sm font-bold text-ink-primary"><Syringe size={17} className="text-violet-300"/>Imunizações e procedimentos periódicos</h2>
   <p className="mt-2 text-xs text-ink-muted">Registro voluntário fora da lista de comprimidos. A data de reforço é a que você declarar; o VAULT não calcula esquema vacinal.</p>
   <div className="mt-3 flex gap-2" role="group" aria-label="Tipo de ocorrência"><button type="button" aria-pressed={eventKind==='immunization'} onClick={()=>setEventKind('immunization')} className={buttonBase+(eventKind==='immunization'?' border-violet-300/60 text-violet-200':' border-surface-border text-ink-muted')}>Vacina</button><button type="button" aria-pressed={eventKind==='procedure'} onClick={()=>setEventKind('procedure')} className={buttonBase+(eventKind==='procedure'?' border-violet-300/60 text-violet-200':' border-surface-border text-ink-muted')}>Procedimento</button></div>
   <label className="mt-3 block text-xs text-ink-muted">Descrição<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} className={input} placeholder="Nome ou descrição fornecida"/></label>
   <label className="mt-3 block text-xs text-ink-muted">Data da aplicação ou do procedimento<input type="text" inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD" maxLength={10} value={eventDate} onChange={e=>setEventDate(maskDayInputM144(e.target.value))} className={input}/></label>
   <p className="mt-1 text-[11px] text-ink-faint">Datas: digite 8 números (AAAAMMDD). O VAULT adiciona os hífens.</p>
   <p className="mt-1 text-[11px] text-ink-muted">Vacinas: somente datas efetivamente aplicadas; reforços futuros são datas declaradas, nunca aplicação confirmada.</p>
   <div className="mt-2 grid grid-cols-2 gap-3"><label className="text-xs text-ink-muted">Lote (se conhecido)<input value={lot} onChange={e=>setLot(e.target.value)} maxLength={70} className={input}/></label><label className="text-xs text-ink-muted">Próxima data declarada<input type="text" inputMode="numeric" autoComplete="off" placeholder="AAAA-MM-DD" maxLength={10} value={next} onChange={e=>setNext(maskDayInputM144(e.target.value))} className={input}/></label></div>
   <label className="mt-2 block text-xs text-ink-muted">Comprovante / observação (opcional)<textarea rows={2} maxLength={350} value={proofNote} onChange={e=>setProofNote(e.target.value)} className={input+' resize-y py-3'} placeholder="Referência descritiva; anexe o arquivo original em Documentos"/></label>
   <Link href="/documentos" className="mt-1 inline-flex min-h-10 items-center text-xs font-semibold text-violet-200 underline underline-offset-4">Abrir Documentos para anexar o comprovante</Link>
   <button type="button" disabled={!enabled||busy||!title.trim()||!isDayM144(eventDate)||Boolean(eventKind==='immunization'&&eventDate>today)||Boolean(next&&!isDayM144(next))} onClick={()=>void save({tag:eventKind,id:'v1',title:title.trim(),lot:lot.trim(),next:next||undefined,start:eventDate,note:proofNote.trim()})} className={buttonBase+' mt-3 w-full border-violet-300/30 bg-violet-300/10 text-violet-200 disabled:opacity-40'}>Registrar no Diário</button>
  </section>
    </>
  )}
  {activeArea==='historico' && (
    <>
  <section className="rounded-[24px] border border-surface-border bg-surface/80 p-4" aria-labelledby="m144-ledger-title">
   <h2 id="m144-ledger-title" className="flex items-center gap-2 text-sm font-bold text-ink-primary"><History size={17} className="text-emerald-300"/>Episódios e registros anteriores</h2>
   <p className="mt-2 text-xs text-ink-muted">Itens encerrados passam à apresentação histórica automaticamente, sem excluir seu registro ou modificar o esquema de medicamentos.</p>
   {entries.length? <div className="mt-3 space-y-2">{entries.slice(0,historyLimit).map(({record,event})=>{
     const anchorName=meds.find(m=>m.id===event.anchorId)?.nome||'Medicação-base não identificada';
     const bridgeName=meds.find(m=>m.id===event.bridgeId)?.nome||'Medicação pontual não identificada';
     const state=event.tag==='bridge'?classifyBridgeM144({id:record.id||'',ownerId:uid,personId:pid,anchorId:event.anchorId||'',bridgeId:event.bridgeId||'',startDay:event.start||'',endDay:event.end||'',reason:'ruptura_estoque_ancora',notes:event.note||''},today):null;
     const cycleStatus=event.tag==='course'?episodeProgressM144(event.start||'',event.end||'',today):null;
     const warning=state==='historica'?returnMonitoringM144(event.end||'',today):null;
     return <article key={record.id} className="rounded-xl border border-surface-border/70 bg-void/40 p-3 text-xs text-ink-secondary"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-ink-primary">{tagLabel[event.tag]}</strong><span>{displayedEventDayM147(event,record.data)} {state?' · '+(state==='historica'?'Histórico':state==='ativa'?'Em período declarado':state==='agendada'?'Planejada':'Revisar datas'):''}{cycleStatus?' · '+(cycleStatus.state==='ativo'?`Dia ${cycleStatus.elapsed} de ${cycleStatus.total}`:cycleStatus.state==='historico'?'Histórico':'Planejado'):''}</span></div>{event.tag==='bridge'?<p className="mt-1">{anchorName} · {bridgeName} · {event.start} a {event.end}</p>:event.tag==='course'?<p className="mt-1">{bridgeName} · {event.start} a {event.end}</p>:event.tag==='risk_benefit'?<p className="mt-1">Benefício: {event.benefit||'sem relato'} · Preocupações: {event.cost||'sem relato'}{typeof event.pain==='number'?` · Dor ${event.pain}/10`:''}{typeof event.energy==='number'?` · Energia ${event.energy}/10`:''}</p>:<p className="mt-1">{event.title} · {event.start||'Data não informada'}{event.lot?` · Lote ${event.lot}`:''}{event.next?` · Próxima data declarada: ${event.next}`:''}</p>}{event.note&&<p className="mt-1 break-words text-ink-muted">{event.note}</p>}{warning&&<p className="mt-1 text-amber-200">{warning.notice}</p>}</article>;
    })}{entries.length>historyLimit&&<button type="button" onClick={()=>setHistoryLimit(limit=>Math.min(entries.length,limit+15))} className={buttonBase+' mt-3 w-full border-emerald-300/25 text-emerald-200'}>Mostrar mais {Math.min(15,entries.length-historyLimit)} registros</button>}</div>:<p className="mt-3 text-xs text-ink-muted">Nenhuma ocorrência registrada nesta central para esta pessoa.</p>}
  </section>
    </>
  )}
  {feedback&&<p role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs text-ink-secondary">{feedback}</p>}
  <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted"><Link href="/saude/registros" className={buttonBase+' inline-flex items-center gap-2 text-ink-primary'}><ClipboardList size={15}/>Abrir Diário original</Link><Link href="/saude/visual-studio" className={buttonBase+' inline-flex items-center gap-2 text-sky-200'}><Activity size={15}/>Evolução de quatro eixos</Link><Link href="/hoje" className={buttonBase+' inline-flex items-center gap-2 text-ink-primary'}><CalendarDays size={15}/>Voltar ao Hoje</Link></div>
 </div>;
}
