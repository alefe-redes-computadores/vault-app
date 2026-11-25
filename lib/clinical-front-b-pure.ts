/** Pure presentation of recorded clinical facts. No UI, database or writer dependencies. */
export type MetricKindB = 'sono' | 'oxigenacao' | 'frequencia_cardiaca' | 'pressao_arterial' | 'glicemia' | 'temperatura' | 'peso' | 'passos' | 'hrv';
const normalized = (value:unknown) => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[\s-]+/g,'_');
/** Aliases are explicitly declared; there is no fuzzy matching to a different person/medication. */
const ALIASES:Record<string,MetricKindB> = {
  sono:'sono',sleep:'sono',duracao_sono:'sono',sleep_duration:'sono',
  oxigenacao:'oxigenacao',oxigenio:'oxigenacao',saturacao:'oxigenacao',saturacao_oxigenio:'oxigenacao',spo2:'oxigenacao',oxygen_saturation:'oxigenacao',
  frequencia_cardiaca:'frequencia_cardiaca',batimentos:'frequencia_cardiaca',heart_rate:'frequencia_cardiaca',pulso:'frequencia_cardiaca',
  pressao:'pressao_arterial',pressao_arterial:'pressao_arterial',blood_pressure:'pressao_arterial',
  glicemia:'glicemia',glucose:'glicemia',temperatura:'temperatura',temperature:'temperatura',
  peso:'peso',weight:'peso',passos:'passos',steps:'passos',hrv:'hrv',variabilidade_cardiaca:'hrv',
};
export function metricKindB(value:unknown):MetricKindB|null {const key=normalized(value);return Object.prototype.hasOwnProperty.call(ALIASES,key)?ALIASES[key]:null;}
export function formatSleepDurationB(value:unknown):string|null {
  if(typeof value!=='number'||!Number.isInteger(value)||value<0)return null;
  if(value<60)return `${value} min`;
  const hours=Math.floor(value/60),minutes=value%60;
  return `${hours} h${minutes?' '+minutes+' min':''} (${value} min)`;
}
export function originLabelB(source:unknown):string {
  return source==='health_connect'?'Health Connect / dispositivo conectado':
    source==='samsung_manual'?'Samsung Health · registro manual':
    source==='manual'?'Registro manual':'Fonte não informada';
}
/** Only a unit explicitly declared for this quantity can be shown. Never infer historical dose units from current inventory or form. */
const UNIT:Record<string,[string,string]> = {gota:['gota','gotas'],gotas:['gota','gotas'],comprimido:['comprimido','comprimidos'],comprimidos:['comprimido','comprimidos'],capsula:['cápsula','cápsulas'],capsulas:['cápsula','cápsulas'],ml:['mL','mL'],mg:['mg','mg'],unidade:['unidade','unidades'],unidades:['unidade','unidades']};
export function formatDoseQuantityB(quantity:unknown,declaredUnit?:unknown):string {
  if(typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<=0)return 'Quantidade não informada';
  const key=normalized(declaredUnit);
  const unit=Object.prototype.hasOwnProperty.call(UNIT,key)?UNIT[key]:undefined;
  return unit?`${quantity} ${quantity===1?unit[0]:unit[1]}`:`Quantidade registrada: ${quantity} (unidade não informada)`;
}
