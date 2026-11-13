/**
 * Brain V7 Universal — projections of documented events only.
 * Does not diagnose, recommend a medicine/dose or suppress regulatory warnings.
 * No medication-specific hardcoding, network reads or writes.
 */
import type { Medicamento, Renovacao, DoseLog, RegistroSaude } from '@/lib/types';

export type BrainV7Input = {
  userId: string; personId: string; todayISO: string; nowISO: string;
  medications: readonly Medicamento[]; acquisitions: readonly Renovacao[];
  doseLogs: readonly DoseLog[]; records: readonly RegistroSaude[];
  anchorMedicationIds: readonly string[];
};
export type BrainV7Scope = { userId: string; personId: string; todayISO: string };
export type BrainV7Anchor = {
  medicationId: string; medicationName: string; documentedDays: number;
  taken: number; explicitlyIgnored: number; confirmedOutOfStock: number;
  lastTakenDay: string | null; lastIgnoredDay: string | null;
  returnDay: string | null; recoveryObservationDays: number | null;
  warnings: readonly string[];
};
export type BrainV7Transition = {
  medicationId: string; medicationName: string; stoppedOn: string | null;
  reason: string | null; replacementId: string | null; replacementName: string | null;
  label: 'descontinuado' | 'substituição documentada';
};
export type BrainV7Axis = { kind: 'somatico'|'volitivo'|'afetivo'|'autonomico'; label: string; value: number | null; day: string | null; observedDays: number };
export type BrainV7Lifestyle = { label: string; day: string; source: string };
export type BrainV7Result = {
  referenceDay: string; authorized: boolean; medicationCount: number;
  anchors: readonly BrainV7Anchor[];
  transitions: readonly BrainV7Transition[];
  axes: readonly BrainV7Axis[];
  sleep: { observedDays: number; lastWakeAt: string | null; lastSleepDay: string | null };
  lifestyle: readonly BrainV7Lifestyle[];
  rescue: { takenIn24h: number; byMedication: readonly { medicationId: string; medicationName: string; count: number }[]; checkedAt: string };
  supply: { purchasedEvents: number; paidTotal: number; freeOrSusEvents: number; amountUnreportedEvents: number };
  documentation: { doseDays14: number; healthDays14: number; ignoredWithoutReason14: number };
  history: readonly {medicationId: string; medicationName: string; dosageChanges: number; reason: string | null; notes: string | null}[];
  limitations: readonly string[];
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function validBrainDayV7(s: unknown): s is string {
  if (typeof s !== 'string' || !DAY.test(s)) return false;
  const x = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(x.getTime()) && x.toISOString().slice(0,10) === s;
}
export function shiftBrainDayV7(day: string, offset: number): string {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+offset);
  return d.toISOString().slice(0,10);
}
function distinctById<T extends {id?: string}>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((x,i)=> { const id=x.id || `no-id-${i}`;if(seen.has(id))return false;seen.add(id);return true; });
}
function limited(s: unknown,n=300): string | null { const v=String(s ?? '').trim();return v ? v.slice(0,n) : null; }
function validTimestamp(s: unknown): number | null {
  if(typeof s!=='string'||!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s))return null;
  const n=Date.parse(s);return Number.isFinite(n)?n:null;
}
function safeNumber(x: unknown): x is number { return typeof x==='number'&&Number.isFinite(x); }
export function projectBrainUniversalV7(input: BrainV7Input): BrainV7Result {
  const empty: BrainV7Result={referenceDay:input.todayISO,authorized:false,medicationCount:0,anchors:[],transitions:[],
    axes:['somatico','volitivo','afetivo','autonomico'].map((kind,i)=>({kind:kind as BrainV7Axis['kind'],label:['Dor e corpo','Energia e iniciativa','Humor e afeto','Apetite e autonomia'][i],value:null,day:null,observedDays:0})),
    sleep:{observedDays:0,lastWakeAt:null,lastSleepDay:null},lifestyle:[],rescue:{takenIn24h:0,byMedication:[],checkedAt:input.nowISO},
    supply:{purchasedEvents:0,paidTotal:0,freeOrSusEvents:0,amountUnreportedEvents:0},documentation:{doseDays14:0,healthDays14:0,ignoredWithoutReason14:0},history:[],limitations:['Nenhum dado autorizado ou data de referência inválida.']};
  if(!input.userId||!input.personId||!validBrainDayV7(input.todayISO)||validTimestamp(input.nowISO)===null)return empty;
  const uid=input.userId,pid=input.personId,today=input.todayISO;
  const meds=distinctById(input.medications.filter(m=>m.id&&m.user_id===uid&&m.person_id===pid));
  const medMap=new Map(meds.map(m=>[m.id!,m] as const));
  const past14=shiftBrainDayV7(today,-13);
  const logs=distinctById(input.doseLogs.filter(x=>x.user_id===uid&&x.person_id===pid&&medMap.has(x.medicamento_id)&&validBrainDayV7(x.data)&&x.data<=today));
  const records=distinctById(input.records.filter(x=>x.user_id===uid&&x.person_id===pid&&validBrainDayV7(x.data)&&x.data<=today));
  const acquisitions=distinctById(input.acquisitions.filter(x=>x.user_id===uid&&x.person_id===pid&&medMap.has(x.medicamento_id)));
  const current14=logs.filter(x=>x.data>=past14);
  const rec14=records.filter(x=>x.data>=past14);
  const anchors=Array.from(new Set(input.anchorMedicationIds)).filter(id=>medMap.get(id)?.tipo_uso==='continuo'&&medMap.get(id)?.status!=='descontinuado').slice(0,5).map(id=>{
    const med=medMap.get(id)!;
    const own=current14.filter(x=>x.medicamento_id===id);
    const taken=own.filter(x=>Boolean(x.tomado_em));
    const ignored=own.filter(x=>!x.tomado_em&&Boolean(x.ignorado_em));
    const confirmed=ignored.filter(x=>x.motivo==='sem_estoque');
    const earlierTaken=logs.filter(x=>x.medicamento_id===id&&x.tomado_em);
    const earlierIgnored=logs.filter(x=>x.medicamento_id===id&&x.ignorado_em&&!x.tomado_em);
    const lastTakenDay=earlierTaken.map(x=>x.data).sort().at(-1)||null;
    const lastIgnoredDay=earlierIgnored.map(x=>x.data).sort().at(-1)||null;
    const lastGap=earlierIgnored.filter(x=>x.motivo==='sem_estoque').sort((a,b)=>b.data.localeCompare(a.data))[0];
    const laterReturn=lastGap?earlierTaken.filter(x=>x.data>lastGap.data).sort((a,b)=>a.data.localeCompare(b.data))[0]:null;
    const returnDay=laterReturn?.data||null;
    const recoveryObservationDays=returnDay?Math.max(0,Math.floor((Date.parse(`${today}T12:00:00Z`)-Date.parse(`${returnDay}T12:00:00Z`))/86400000)):null;
    const warnings=[];
    if(confirmed.length)warnings.push('Há falta de estoque declarada em registros de doses; confirme a situação atual com a equipe responsável.');
    if(!own.length)warnings.push('Sem registros de doses nos últimos 14 dias: isso não comprova interrupção.');
    if(returnDay&&recoveryObservationDays!==null&&recoveryObservationDays<=5)warnings.push('Retomada documentada recentemente: período apenas observacional; não indica equilíbrio farmacocinético.');
    return {medicationId:id,medicationName:med.nome,documentedDays:new Set(own.map(x=>x.data)).size,taken:taken.length,explicitlyIgnored:ignored.length,
      confirmedOutOfStock:confirmed.length,lastTakenDay,lastIgnoredDay,returnDay,recoveryObservationDays,warnings};
  });
  const transitions=meds.filter(m=>m.status==='descontinuado'||m.substituido_por_id).map(m=>({
    medicationId:m.id!,medicationName:m.nome,stoppedOn:validBrainDayV7(m.data_descontinuacao)?m.data_descontinuacao:null,
    reason:limited(m.motivo_descontinuacao),replacementId:medMap.has(m.substituido_por_id||'')?m.substituido_por_id!:null,
    replacementName:medMap.get(m.substituido_por_id||'')?.nome||null,
    label:(m.status==='descontinuado'?'descontinuado':'substituição documentada') as BrainV7Transition['label'],
  })).sort((a,b)=>(b.stoppedOn||'').localeCompare(a.stoppedOn||''));
  const axisSpecs=[['somatico','Dor e corpo','eixo_somatico_dor'],['volitivo','Energia e iniciativa','eixo_volitivo_energia'],['afetivo','Humor e afeto','eixo_afetivo_humor'],['autonomico','Apetite e autonomia','eixo_autonomico_apetite']] as const;
  const axes=axisSpecs.map(([kind,label,type])=>{
    const candidates=rec14.filter(r=>r.tipo===type&&safeNumber(r.intensidade)&&r.intensidade>=0&&r.intensidade<=10)
      .sort((a,b)=>b.data.localeCompare(a.data)||b.horario.localeCompare(a.horario));
    return {kind,label,value:candidates[0]?.intensidade??null,day:candidates[0]?.data??null,observedDays:new Set(candidates.map(x=>x.data)).size};
  });
  const sleepRecords=rec14.filter(r=>r.tipo==='sono'||r.registro_chave==='sono').filter(r=>validTimestamp(r.inicio_em)!==null&&validTimestamp(r.fim_em)!==null&&validTimestamp(r.fim_em)!>validTimestamp(r.inicio_em)!);
  const lastSleep=[...sleepRecords].sort((a,b)=>Date.parse(b.fim_em!)-Date.parse(a.fim_em!))[0];
  const markers=[['treino_forca','Treino de força'],['cafeina','Cafeína / energético'],['plantao_noturno','Plantão noturno'],['viagem_reabilitacao','Viagem ou reabilitação']] as const;
  const lifestyle=rec14.flatMap(r=>markers.filter(([key,label])=>r.tipo===key||r.registro_chave===key||r.contexto===label).map(([,label])=>({label,day:r.data,source:r.source||'manual'}))).slice(0,40);
  const currentMs=validTimestamp(input.nowISO)!;
  const rescueLogs=logs.filter(x=>(x.dose_kind==='sos'||x.dose_kind==='extra')&&x.tomado_em&&validTimestamp(x.tomado_em)!==null&&validTimestamp(x.tomado_em)!<=currentMs&&validTimestamp(x.tomado_em)!>=currentMs-86400000);
  const rescueMap=new Map<string,number>();for(const x of rescueLogs)rescueMap.set(x.medicamento_id,(rescueMap.get(x.medicamento_id)||0)+1);
  const byMedication=[...rescueMap].map(([id,count])=>({medicationId:id,medicationName:medMap.get(id)?.nome||'Medicamento cadastrado',count}));
  let paidTotal=0,purchasedEvents=0,freeOrSusEvents=0,amountUnreportedEvents=0;
  for(const x of acquisitions){
    const purchaseDay=x.data_aquisicao||x.data;
    if(!validBrainDayV7(purchaseDay)||purchaseDay>today||(!x.tipo_aquisicao&&x.quantidade==null&&x.preco==null))continue;
    if(x.tipo_aquisicao==='sus'||x.tipo_aquisicao==='gratuito'){freeOrSusEvents++;continue;}
    if(x.tipo_aquisicao==='comprado'){
      purchasedEvents++;
      if(safeNumber(x.preco)&&x.preco>=0)paidTotal+=x.preco;else amountUnreportedEvents++;
    }
  }
  const history=meds.filter(m=>m.status==='descontinuado'||Boolean(m.historico_dosagens?.length)||Boolean(m.motivo_descontinuacao)).map(m=>({
    medicationId:m.id!,medicationName:m.nome,dosageChanges:m.historico_dosagens?.length||0,
    reason:limited(m.motivo_descontinuacao),notes:limited(m.observacoes,160),
  }));
  return {referenceDay:today,authorized:true,medicationCount:meds.length,anchors,transitions,axes,
    sleep:{observedDays:new Set(sleepRecords.map(r=>r.data)).size,lastWakeAt:lastSleep?.fim_em||null,lastSleepDay:lastSleep?.data||null},
    lifestyle,rescue:{takenIn24h:rescueLogs.length,byMedication,checkedAt:input.nowISO},
    supply:{purchasedEvents,paidTotal,freeOrSusEvents,amountUnreportedEvents},
    documentation:{doseDays14:new Set(current14.map(x=>x.data)).size,healthDays14:new Set(rec14.map(x=>x.data)).size,
      ignoredWithoutReason14:current14.filter(x=>x.ignorado_em&&!x.tomado_em&&!x.motivo).length},
    history,
    limitations:[
      'Ausência de registro não prova dose perdida; estoque atual não reconstitui o estoque histórico.',
      'O histórico é declarado e não comprova supervisão médica ou equivalência entre medicamentos.',
      'Sono e sinais vitais são informações observadas; não determinam toxicidade nem segurança de doses.',
      'A tolerância não remove riscos de overdose, interações, sedação e alteração da condução cardíaca.',
      'Datas de trocas não permitem deduzir lavagem farmacológica, meia-vida ou equilíbrio plasmático.',
    ]};
}
