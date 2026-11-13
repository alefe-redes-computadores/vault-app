/** VAULT V8.1: deterministic, bounded owner/person-scoped projection.
 * Never infers safety, pharmacokinetic recovery, toxicity or effectiveness.
 */
import type { Medicamento, RegistroSaude } from '@/lib/types';
import type { HealthDevice } from '@/lib/health-profile/types';
import type { BrainV7Result } from './brain-v7-universal';
import { validBrainDayV7, shiftBrainDayV7 } from './brain-v7-universal';

export const AXES_V8 = [
  { kind:'somatico', tipo:'eixo_somatico_dor', title:'Dor e corpo', low:'Sem dor percebida', high:'Dor intensa', direction:'menor_melhor', categoria:'sintoma' },
  { kind:'volitivo', tipo:'eixo_volitivo_energia', title:'Energia e iniciativa', low:'Energia muito baixa', high:'Energia preservada', direction:'maior_melhor', categoria:'habito' },
  { kind:'afetivo', tipo:'eixo_afetivo_humor', title:'Humor e afeto', low:'Humor muito baixo', high:'Humor positivo', direction:'maior_melhor', categoria:'humor' },
  { kind:'autonomico', tipo:'eixo_autonomico_apetite', title:'Apetite', low:'Sem apetite', high:'Apetite preservado', direction:'maior_melhor', categoria:'habito' },
] as const;
export type AxisSpecV8 = typeof AXES_V8[number];
export type AxisPointV8 = { day:string; value:number; time:string; source:'manual'|'samsung_manual'|'health_connect'|'nao_identificada' };
export type AxisSeriesV8 = { kind: AxisSpecV8['kind']; tipo:string; label:string; points:AxisPointV8[]; latest:AxisPointV8|null; documentedDays:number; observedRangeDays:number };
export type VitalWitnessV8 = { tipo:'frequencia_cardiaca'|'hrv_rmssd'|'sono'; value:string; day:string; source:string; deviceName:string|null };
export type StudioSnapshotV8 = { authorized:boolean; day:string; axes:AxisSeriesV8[]; vitals:VitalWitnessV8[]; activeDevices:Pick<HealthDevice,'kind'|'name'|'side'|'color'>[]; observedDays:number; caveat:string };
const units:Record<VitalWitnessV8['tipo'],string>={frequencia_cardiaca:'bpm',hrv_rmssd:'ms',sono:'min'};
export function isAxisValueV8(value:unknown): value is number {return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=10;}
export function safeColorV8(value:unknown,fallback='#94a3b8'):string {return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;}
export function normalizedPillV8(med:Pick<Medicamento,'formato'|'forma_farmaceutica'|'cores'|'cor_principal'|'cor_secundaria'>){
  const raw=(med.formato||med.forma_farmaceutica||'comprimido').trim().toLowerCase();
  const kind=(['comprimido','partido','oblongo','oblongo_sulcado','capsula','gota','adesivo','injecao'].includes(raw)?raw:'comprimido') as 'comprimido'|'partido'|'oblongo'|'oblongo_sulcado'|'capsula'|'gota'|'adesivo'|'injecao';
  const first=safeColorV8(med.cores?.[0]||med.cor_principal,'#e5e7eb');
  const second=safeColorV8(med.cores?.[1]||med.cor_secundaria,first);
  return {kind,first,second,twoColors:Boolean((med.cores?.[1]||med.cor_secundaria)&&second!==first),isIllustration:true};
}
const isOwned=(r:{user_id:string;person_id?:string},uid:string,pid:string)=>r.user_id===uid&&r.person_id===pid;
export function projectVisualStudioV8(args:{userId:string;personId:string;todayISO:string;records:readonly RegistroSaude[];devices:readonly HealthDevice[];rangeDays?:7|14|30}):StudioSnapshotV8{
  const {userId,personId,todayISO}=args;const span=args.rangeDays||30;
  const blank:StudioSnapshotV8={authorized:false,day:todayISO,axes:AXES_V8.map(a=>({kind:a.kind,tipo:a.tipo,label:a.title,points:[],latest:null,documentedDays:0,observedRangeDays:span})),vitals:[],activeDevices:[],observedDays:0,caveat:'Sem dados autorizados.'};
  if(!userId||!personId||!validBrainDayV7(todayISO))return blank;
  const start=shiftBrainDayV7(todayISO,-(span-1));
  const records=args.records.filter(r=>isOwned(r,userId,personId)&&validBrainDayV7(r.data)&&r.data>=start&&r.data<=todayISO);
  const ownedDevices=args.devices.filter(d=>isOwned(d,userId,personId)&&d.active===true);
  const ownedDeviceIds=new Map(ownedDevices.map(d=>[d.id,d] as const));
  const axes=AXES_V8.map(spec=>{
    const seen=new Set<string>();const points:AxisPointV8[]=[];
    for(const r of [...records].filter(x=>x.tipo===spec.tipo&&isAxisValueV8(x.intensidade)).sort((a,b)=>`${b.data}T${b.horario||'00:00'}${b.id||''}`.localeCompare(`${a.data}T${a.horario||'00:00'}${a.id||''}`))){
      if(seen.has(r.data))continue;seen.add(r.data);
      points.push({day:r.data,value:r.intensidade!,time:r.horario||'',source:r.source||'nao_identificada'});
    }
    points.reverse();return {kind:spec.kind,tipo:spec.tipo,label:spec.title,points,latest:points.at(-1)||null,documentedDays:points.length,observedRangeDays:span};
  });
  const vitals:VitalWitnessV8[]=[];
  for(const tipo of ['frequencia_cardiaca','hrv_rmssd','sono'] as const){
    const ordered=records.filter(r=>r.tipo===tipo).sort((a,b)=>`${b.data}T${b.horario||''}`.localeCompare(`${a.data}T${a.horario||''}`));
    for(const r of ordered){
      const number=tipo==='sono'?r.duracao_minutos:r.valor_numerico;
      if(typeof number!=='number'||!Number.isFinite(number)||number<0||r.unidade_medida!==units[tipo])continue;
      // Device identity is never inferred from the manufacturer of the phone.
      const device=r.device_id?ownedDeviceIds.get(r.device_id):undefined;
      const source=r.source==='health_connect'?'Health Connect':r.source==='samsung_manual'?'Registro Samsung manual':r.source==='manual'?'Registro manual':'Fonte não declarada';
      vitals.push({tipo,value:`${Number(number.toFixed(1)).toLocaleString('pt-BR')} ${units[tipo]}`,day:r.data,source,deviceName:device?.name||null});break;
    }
  }
  return {authorized:true,day:todayISO,axes,vitals,activeDevices:ownedDevices.map(d=>({kind:d.kind,name:d.name,side:d.side,color:d.color})),observedDays:new Set(records.map(r=>r.data)).size,
    caveat:'Relatos e sinais vitais são observações, não diagnóstico ou prova de causalidade. Dias ausentes permanecem sem dados; dispositivos exibidos são apenas os cadastrados e ativos.'};
}
export function buildDossierOnePageV8(args:{brain:BrainV7Result;studio:StudioSnapshotV8;medications:readonly Medicamento[];userId:string;personId:string; generatedISO:string;}):string[]{
  const {brain,studio,medications,userId,personId}=args;
  if(!brain.authorized||!studio.authorized||!userId||!personId||!validBrainDayV7(studio.day)||brain.referenceDay!==studio.day) return ['VAULT — dados autorizados indisponíveis'];
  const meds=medications.filter(m=>isOwned(m,userId,personId)&&m.status!=='descontinuado');
  const lines=[
    'VAULT | SÍNTESE OBSERVACIONAL DE CONSULTA',
    `Referência: ${studio.day.split('-').reverse().join('/')} | Emissão local: ${args.generatedISO.slice(0,10)}`,
    'Documento do paciente; conferir com profissional. Não é prescrição, laudo ou avaliação de dose segura.',
    '',`ESQUEMA CADASTRADO — ${meds.length} medicação(ões) ativa(s)`,
    ...meds.slice(0,8).map(m=>`• ${m.nome.slice(0,35)} ${String(m.dosagem||'').slice(0,25)} · ${m.tipo_uso||'uso não informado'}`),
    ...(meds.length>8?[`• +${meds.length-8} medicamento(s) no cadastro; consultar VAULT.`]:[]),
    '',`BASE DECLARADA — ${brain.anchors.length} âncora(s) voluntária(s)`,
    ...brain.anchors.slice(0,4).map(a=>`• ${a.medicationName.slice(0,30)}: ${a.documentedDays}/14 dia(s) com logs; ${a.confirmedOutOfStock} falta(s) de estoque declarada(s)`),
    ...(brain.anchors.length===0?['• Nenhuma âncora voluntária selecionada.']:[]),
    '',`QUATRO EIXOS — últimos ${studio.axes[0]?.observedRangeDays||30} dias`,
    ...studio.axes.map(x=>`• ${x.label}: ${x.latest?`${x.latest.value}/10 em ${x.latest.day}`:'sem registro'}; ${x.documentedDays} dia(s) registrados`),
    'Escalas têm direções diferentes: dor 10 = mais dor; demais 10 = mais energia/humor/apetite.',
    '', 'SONO / VITAIS — última leitura declarada',
    ...studio.vitals.map(v=>`• ${v.tipo}: ${v.value} em ${v.day} [${v.source}${v.deviceName?` / ${v.deviceName}`:''}]`.slice(0,104)),
    ...(studio.vitals.length===0?['• Sem leituras adequadas com unidade e fonte verificável.']:[]),
    '', 'SOS / HISTÓRICO / AQUISIÇÕES',
    `• Doses SOS/extra tomadas registradas nas últimas 24h: ${brain.rescue.takenIn24h}.`,
    `• Tratamentos interrompidos ou substituídos registrados: ${brain.transitions.length}.`,
    `• Compras: ${brain.supply.purchasedEvents}, valor informado total R$ ${brain.supply.paidTotal.toFixed(2).replace('.',',')}; SUS/gratuito: ${brain.supply.freeOrSusEvents}.`,
    '',`COBERTURA — ${brain.documentation.doseDays14} dia(s) com dose e ${brain.documentation.healthDays14} com registro de saúde / 14`,
    'Ausência de registro não prova ausência de tomada. Estoque de hoje não comprova falta passada.',
    'Tolerância e intervalos entre doses não eliminam risco de sedação, overdose ou interação.',
    'Não modificar doses com base neste documento; levar receitas e dúvidas à equipe assistente.',
  ];
  return lines.map(l=>l.slice(0,180));
}
