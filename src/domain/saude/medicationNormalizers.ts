/** M144: semântica ortogonal, apresentação pura; NÃO altera esquema ou registros. */
export type RegimeM144='continuo'|'ciclo_curto'|'contingencia_pontual'|'sos'|'nao_informado';
export type AcquisitionOriginM144='sus'|'particular'|'contingencia_particular'|'nao_informada';
export type MedicationLikeM144={tipo_uso?:string|null;regime_uso?:string|null;status?:string|null;forma_farmaceutica?:string|null;formato?:string|null;estoque_unidade_medida?:string|null};
export function medicationRegimeM144(m:MedicationLikeM144):RegimeM144 {
  const value=String(m.regime_uso||m.tipo_uso||'').trim().toLowerCase();
  if(['sos','esporadico','conforme_necessidade'].includes(value))return 'sos';
  if(['temporario','ciclo_curto'].includes(value))return 'ciclo_curto';
  if(value==='contingencia_pontual')return 'contingencia_pontual';
  if(value==='continuo')return 'continuo';return 'nao_informado';
}
export const isUsoSOSM144=(m:MedicationLikeM144)=>medicationRegimeM144(m)==='sos';
export const createsAutomaticDoseM144=(m:MedicationLikeM144)=>m.status!=='descontinuado'&&medicationRegimeM144(m)!=='sos'&&medicationRegimeM144(m)!=='contingencia_pontual';
export function classifyAcquisitionOriginM144(event:{origem?:string|null;origem_aquisicao?:string|null;tipo_aquisicao?:string|null}|null|undefined):AcquisitionOriginM144 {
  const value=String(event?.origem_aquisicao||event?.origem||event?.tipo_aquisicao||'').trim().toLowerCase();
  if(value==='contingencia_particular')return 'contingencia_particular';
  if(['particular','comprado','compra','pago','farmacia','farmácia'].includes(value))return 'particular';
  if(['sus','gratuito','publico','público'].includes(value))return 'sus';return 'nao_informada';
}
const singular:Record<string,[string,string]>={
 'comprimido':['comprimido','comprimidos'],'comprimidos':['comprimido','comprimidos'],
 'capsula':['cápsula','cápsulas'],'cápsula':['cápsula','cápsulas'],'capsulas':['cápsula','cápsulas'],'cápsulas':['cápsula','cápsulas'],
 'gota':['gota','gotas'],'gotas':['gota','gotas'],'ml':['mL','mL'],
 'unidade':['unidade','unidades'],'unidades':['unidade','unidades'],
 'ampola':['ampola','ampolas'],'ampolas':['ampola','ampolas'],
 'adesivo':['adesivo','adesivos'],'adesivos':['adesivo','adesivos'],
 'dose':['dose','doses'],'doses':['dose','doses'],
 'frasco':['frasco','frascos'],'frascos':['frasco','frascos']};
export function formatUnidadeFarmaceuticaM144(qtd:number|null|undefined, unidade:string|null|undefined):string {
 if(qtd==null||!Number.isFinite(qtd))return 'Quantidade não informada';
 const n=Number(qtd);const key=(unidade||'unidade').trim().toLowerCase();
 const names=singular[key]||[unidade?.trim()||'unidade',unidade?.trim()||'unidades'];
 const num=n.toLocaleString('pt-BR',{maximumFractionDigits:3});return `${num} ${Math.abs(n)===1?names[0]:names[1]}`;
}
export function formatDiasRelativosM144(days:number|null|undefined):string {
 if(days==null||!Number.isInteger(days))return 'Data não informada';
 if(days===0)return 'hoje';if(days===1)return 'amanhã';if(days===-1)return 'ontem';
 return days>0?`em ${days} dias`:`há ${Math.abs(days)} dias`;
}
