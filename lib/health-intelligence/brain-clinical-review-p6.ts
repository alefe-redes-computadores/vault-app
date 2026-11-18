/** CI360 P6/P6 MACRO3 — projeção factual na autoridade do Brain V7.
 * Consome APENAS os eventos canônicos da pessoa; nenhuma escrita, dose,
 * prescrição, diagnóstico, causalidade, notificação ou movimentação de estoque.
 */
import type { Consulta, DoseLog, Medicamento, RegistroSaude, Retirada } from '@/lib/types';
import { getClinicalStockSnapshot } from '@/lib/health-intelligence/clinical-stock';

export type BrainTherapyAxisP6 = {
  key: string; name: string; scope: 'linked' | 'person_context';
  beforeDays: number; afterDays: number;
  beforeAverage: number | null; afterAverage: number | null;
  descriptiveDelta: number | null;
};
export type BrainTherapyChangeP6 = {
  key: string; medicationId: string; medicationName: string; on: string;
  previousDose: string; recordedClinician: string | null;
  axes: readonly BrainTherapyAxisP6[];
  evidenceState: 'comparable_observations' | 'insufficient_observations';
};
export type BrainStockReadingP6 = {
  medicationId: string; medicationName: string; state: 'unknown'|'empty'|'available'|'negative';
  quantity: number | null; estimatedDays: number | null;
  isAsNeeded: boolean; attention: boolean; href: string;
};
export type BrainConsultationContextP6 = {
  id: string; on: string; specialty: string;
  guidance: string | null; followUp: string | null;
  linkedMedicationNames: string[]; href: string;
};
export type BrainClinicalReviewP6 = {
  state: 'ready'|'unavailable'; reason: string | null;
  owner: {userId:string;personId:string}; on: string;
  medicationCount: number;
  changes: readonly BrainTherapyChangeP6[];
  stock: readonly BrainStockReadingP6[];
  consultations: readonly BrainConsultationContextP6[];
  documented: {
    confirmedTaken30d: number; explicitlyIgnored30d: number;
    rescueTaken30d: number; conflictLogsExcluded: number;
    missingClockExcluded: number; plannedExcluded: number;
    recordDays30d: number; doseDays30d: number;
  };
  dataQuality: 'partial'|'limited';
  limitations: readonly string[];
};
export type BrainClinicalInputP6 = {
  userId: string; personId: string; todayISO: string; nowISO: string;
  medications: readonly Medicamento[]; consultations: readonly Consulta[];
  withdrawals: readonly Retirada[];
  records: readonly RegistroSaude[]; doseLogs: readonly DoseLog[];
};
const DAY_MS = 86_400_000;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/;
function validDay(s:unknown): s is string {
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
}
function plusDays(day:string,offset:number):string{
  return new Date(Date.parse(`${day}T12:00:00Z`)+offset*DAY_MS).toISOString().slice(0,10);
}
function validActualTime(s:unknown):boolean{
  return typeof s==='string'&&ISO_TIME.test(s)&&Number.isFinite(Date.parse(s));
}
function limited(s:unknown,length=240):string|null {
  if(typeof s!=='string')return null;
  const t=s.trim().replace(/\s+/g,' ');return t?t.slice(0,length):null;
}
function clinicalName(s:string):string{return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim()}
function empty(input:BrainClinicalInputP6,reason:string):BrainClinicalReviewP6{
  return {state:'unavailable',reason,owner:{userId:input.userId,personId:input.personId},on:input.todayISO,
    medicationCount:0,changes:[],stock:[],consultations:[],
    documented:{confirmedTaken30d:0,explicitlyIgnored30d:0,rescueTaken30d:0,conflictLogsExcluded:0,missingClockExcluded:0,plannedExcluded:0,recordDays30d:0,doseDays30d:0},
    dataQuality:'limited',limitations:[reason]};
}
function mean(items:readonly number[]):number|null{
  if(!items.length)return null;
  return Math.round(items.reduce((a,b)=>a+b,0)/items.length*10)/10;
}
function observedAxes(records:readonly RegistroSaude[],medicationId:string,day:string):BrainTherapyAxisP6[]{
  const beforeStart=plusDays(day,-7), beforeEnd=plusDays(day,-1);
  const afterStart=plusDays(day,1), afterEnd=plusDays(day,7);
  const relevant=records.filter(r=>validDay(r.data)&&r.data>=beforeStart&&r.data<=afterEnd&&r.data!==day&&
    (r.categoria==='sintoma'||r.categoria==='humor')&&typeof r.intensidade==='number'&&Number.isFinite(r.intensidade)&&r.intensidade>=0&&r.intensidade<=10);
  const exact=relevant.filter(r=>r.medicamento_id===medicationId);
  // Sintoma sem vínculo é contexto da pessoa, jamais um "efeito do medicamento".
  const items=exact.length?exact:relevant.filter(r=>!r.medicamento_id);
  const scope:BrainTherapyAxisP6['scope']=exact.length?'linked':'person_context';
  const groups=new Map<string,RegistroSaude[]>();
  for(const r of items){const k=clinicalName(r.registro_chave||r.nome||r.tipo);if(!k)continue;
    const list=groups.get(k)||[];list.push(r);groups.set(k,list);}
  const out:BrainTherapyAxisP6[]=[];
  for(const [key,group] of groups){
    const before=new Map<string,number>();const after=new Map<string,number>();
    for(const r of group){const value=r.intensidade!;
      if(r.data>=beforeStart&&r.data<=beforeEnd&&!before.has(r.data))before.set(r.data,value);
      if(r.data>=afterStart&&r.data<=afterEnd&&!after.has(r.data))after.set(r.data,value);}
    if(!before.size&&!after.size)continue;
    const sufficient=before.size>=3&&after.size>=3;
    const a=sufficient?mean([...before.values()]):null;
    const b=sufficient?mean([...after.values()]):null;
    out.push({key,name:group[0].nome||group[0].tipo||key,scope,beforeDays:before.size,afterDays:after.size,
      beforeAverage:a,afterAverage:b,descriptiveDelta:a!==null&&b!==null?Math.round((b-a)*10)/10:null});
  }
  return out.sort((a,b)=>Math.max(b.beforeDays,b.afterDays)-Math.max(a.beforeDays,a.afterDays)||a.key.localeCompare(b.key)).slice(0,4);
}

/** "Última consulta" não equivale a validação do prescritor: notas são autorrelatadas. */
export function buildBrainClinicalReviewP6(input:BrainClinicalInputP6):BrainClinicalReviewP6{
  const {userId,personId,todayISO}=input;
  if(!userId||!personId||!validDay(todayISO)||!validActualTime(input.nowISO))return empty(input,'Conta, pessoa, data ou instante de referência não confirmados.');
  const now=Date.parse(input.nowISO);
  const scoped=<T extends {id?:string;user_id:string;person_id?:string}>(list:readonly T[]):T[]=>{
    const seen=new Set<string>();return list.filter(x=>{
      if(!x.id||seen.has(x.id)||x.user_id!==userId||x.person_id!==personId)return false;
      seen.add(x.id);return true;});
  };
  const meds=scoped(input.medications).filter(m=>m.status!=='descontinuado');
  const byId=new Map(meds.map(m=>[m.id!,m]));
  const recs=scoped(input.records).filter(r=>validDay(r.data)&&r.data<=todayISO&&r.data>=plusDays(todayISO,-70));
  const logs=scoped(input.doseLogs).filter(l=>byId.has(l.medicamento_id)&&validDay(l.data)&&l.data<=todayISO&&l.data>=plusDays(todayISO,-29));
  const counts={confirmedTaken30d:0,explicitlyIgnored30d:0,rescueTaken30d:0,conflictLogsExcluded:0,
    missingClockExcluded:0,plannedExcluded:0,recordDays30d:0,doseDays30d:0};
  const confirmedDays=new Set<string>();
  for(const log of logs){
    if(log.dose_kind==='planned'){counts.plannedExcluded++;continue;}
    if(log.tomado_em&&log.ignorado_em){counts.conflictLogsExcluded++;continue;}
    if(log.ignorado_em){counts.explicitlyIgnored30d++;confirmedDays.add(log.data);continue;}
    if(!log.tomado_em)continue;
    if(!validActualTime(log.tomado_em)){counts.missingClockExcluded++;continue;}
    const takenDay=new Date(Date.parse(log.tomado_em)).toISOString().slice(0,10);
    if(takenDay>todayISO||Date.parse(log.tomado_em)>now)continue;
    counts.confirmedTaken30d++;confirmedDays.add(log.data);
    if(log.dose_kind==='sos'||log.dose_kind==='extra')counts.rescueTaken30d++;
  }
  counts.doseDays30d=confirmedDays.size;
  counts.recordDays30d=new Set(recs.filter(r=>r.data>=plusDays(todayISO,-29)).map(r=>r.data)).size;
  const changes:BrainTherapyChangeP6[]=[];
  for(const med of meds){
    for(const [index,change] of (med.historico_dosagens||[]).entries()){
      if(!validDay(change.data_mudanca)||change.data_mudanca>todayISO||change.data_mudanca<plusDays(todayISO,-60))continue;
      const axes=observedAxes(recs,med.id!,change.data_mudanca);
      changes.push({key:`${med.id}:${change.data_mudanca}:${index}`,medicationId:med.id!,medicationName:med.nome,on:change.data_mudanca,
        previousDose:limited(change.dosagem_antiga,100)||'não informada',recordedClinician:limited(change.medico_responsavel,100),
        axes,evidenceState:axes.some(a=>a.descriptiveDelta!==null)?'comparable_observations':'insufficient_observations'});
    }
  }
  changes.sort((a,b)=>b.on.localeCompare(a.on)||a.key.localeCompare(b.key));
  const stock:BrainStockReadingP6[]=meds.map(m=>{
    const s=getClinicalStockSnapshot(m);
    const asNeeded=m.tipo_uso==='sos'||m.tipo_uso==='esporadico';
    const reliable=s.hasReliableDoseEstimate&&s.daysRemaining!==null&&Number.isFinite(s.daysRemaining)&&s.daysRemaining>=0;
    // Fonte exclusiva do cálculo é clinical-stock. Para SOS, previsão diária é inválida.
    const estimatedDays=!asNeeded&&reliable?s.daysRemaining:null;
    const attention=s.state==='negative'||s.state==='empty'||(!asNeeded&&estimatedDays!==null&&estimatedDays<=7);
    return {medicationId:m.id!,medicationName:m.nome,state:s.state,quantity:s.registeredQuantity,
      estimatedDays,isAsNeeded:asNeeded,attention,href:`/saude/medicamentos/detalhes?id=${encodeURIComponent(m.id!)}`};
  }).sort((a,b)=>Number(b.attention)-Number(a.attention)||a.medicationName.localeCompare(b.medicationName,'pt-BR'));
  const consultations:BrainConsultationContextP6[]=scoped(input.consultations)
    .filter(c=>c.status==='realizada'&&validDay(c.data)&&c.data<=todayISO&&
      Array.isArray(c.medicamento_ids)&&c.medicamento_ids.some(id=>byId.has(id))&&
      (limited(c.orientacao_profissional)||limited(c.proximos_passos)))
    .sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5).map(c=>({
      id:c.id!,on:c.data,specialty:limited(c.especialidade,75)||'Consulta',
      guidance:limited(c.orientacao_profissional,300),followUp:limited(c.proximos_passos,300),
      linkedMedicationNames:(c.medicamento_ids||[]).filter(id=>byId.has(id)).map(id=>byId.get(id)!.nome).slice(0,8),
      href:`/saude/consultas/detalhes?id=${encodeURIComponent(c.id!)}`,
    }));
  // Não usar retiradas concluídas para mover estoque ou reviver ações pendentes.
  const withdrawals=scoped(input.withdrawals).filter(w=>byId.has(w.medicamento_id));
  const validCompleted=withdrawals.filter(w=>w.status==='realizada'&&validDay(w.data)&&w.data<=todayISO).length;
  const limitations=[
    'Comparações temporais não demonstram causalidade, eficácia ou reação adversa.',
    'Sem denominador prescrito comprovado, registros de doses não medem adesão percentual.',
    'Planos registrados em consultas são relatos, não validação automática do prescritor nem autorização de dose SOS.',
    'O Brain V5 permanece a autoridade dos alertas: esta revisão não cria notificações nem altera estados.',
  ];
  if(validCompleted)limitations.push(`${validCompleted} retirada(s) concluída(s) no histórico; nenhuma foi aplicada ao estoque nesta análise.`);
  if(stock.some(s=>s.state==='unknown'))limitations.push('Alguns medicamentos não têm saldo confiável; ausência de número não significa estoque zero.');
  const observed=counts.recordDays30d>=3&&counts.doseDays30d>=3;
  return {state:'ready',reason:null,owner:{userId,personId},on:todayISO,medicationCount:meds.length,
    changes:changes.slice(0,12),stock:stock.slice(0,40),consultations,documented:counts,
    dataQuality:observed?'partial':'limited',limitations};
}

/** Seção factual e concisa acoplada ao DOSSIÊ V7 existente, nunca uma receita nova. */
export function brainClinicalReturnBriefP6(review:BrainClinicalReviewP6):string{
 if(review.state!=='ready')return 'REVISÃO CLÍNICA CONTEXTUAL\nDados autorizados insuficientes.';
 const d=review.documented;
 const lines=['REVISÃO CLÍNICA CONTEXTUAL — BRAIN P6',
  `Data: ${review.on.split('-').reverse().join('/')}; medicamentos ativos documentados: ${review.medicationCount}.`,
  `Doses efetivamente registradas (30d): ${d.confirmedTaken30d}; SOS/extra confirmadas: ${d.rescueTaken30d}; explicitamente ignoradas: ${d.explicitlyIgnored30d}.`,
  `Cobertura de registros: ${d.recordDays30d} dia(s) de saúde; ${d.doseDays30d} dia(s) de eventos de dose. Não representa aderência percentual.`,
  'ALTERAÇÕES TERAPÊUTICAS E OBSERVAÇÕES (SEM CAUSALIDADE)'];
 if(!review.changes.length)lines.push('• Nenhuma mudança de dose datada registrada nos 60 dias considerados.');
 for(const c of review.changes.slice(0,8)){
  lines.push(`• ${c.medicationName}: mudança registrada em ${c.on}, dose anterior ${c.previousDose}; ${c.evidenceState==='comparable_observations'?'observações comparáveis existentes':'observações insuficientes'}.`);
  for(const a of c.axes.filter(a=>a.descriptiveDelta!==null).slice(0,2))lines.push(`  ${a.name} (${a.scope==='linked'?'vínculo explícito':'contexto da pessoa'}): antes ${a.beforeAverage}/10 (${a.beforeDays} dias), depois ${a.afterAverage}/10 (${a.afterDays} dias).`);
 }
 lines.push('ESTOQUE E CONTINUIDADE (PROJEÇÃO CANÔNICA)');
 const alertStock=review.stock.filter(s=>s.attention||s.state==='unknown').slice(0,12);
 if(!alertStock.length)lines.push('• Nenhuma atenção de saldo ou lacuna identificada nesta projeção; isso não garante abastecimento.');
 for(const s of alertStock)lines.push(`• ${s.medicationName}: ${s.state==='unknown'?'saldo desconhecido':`saldo registrado ${s.quantity}`}${s.estimatedDays!==null?`; estimativa ~${s.estimatedDays} dias`:''}${s.isAsNeeded?'; SOS sem previsão em dias':''}.`);
 lines.push('ORIENTAÇÕES RELATADAS E CONSULTAS VINCULADAS');
 if(!review.consultations.length)lines.push('• Nenhuma orientação relatada, vinculada por ID a medicamento ativo, nesta revisão.');
 for(const c of review.consultations.slice(0,4))lines.push(`• ${c.on} ${c.specialty}: ${c.guidance||c.followUp||'ver documento'} (relato registrado; confirmar com profissional).`.slice(0,350));
 lines.push('LIMITAÇÕES: nenhuma conclusão de eficácia, interação, reação causal ou autorização de SOS; rever sempre com profissional.');
 return lines.join('\n');
}
