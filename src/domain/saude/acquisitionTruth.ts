/** M144: a origem de um processo de tratamento não determina a origem da aquisição. */
import {classifyAcquisitionOriginM144,type AcquisitionOriginM144} from './medicationNormalizers';
import {validLocalDayM144} from './careEpisodes';
export type AcquisitionEventM144={id?:string|null;user_id:string;person_id?:string|null;medicamento_id:string;tipo_aquisicao?:string|null;data_aquisicao?:string|null;data?:string|null;created_at?:string|null};
export type LatestAcquisitionM144={id:string;date:string;origin:AcquisitionOriginM144;label:string;isActualAcquisition:true};
/** Apenas eventos com data real da aquisição conhecida. Receita datada não é compra concluída. */
export function latestRecordedAcquisitionM144(events:readonly AcquisitionEventM144[],owner:string,person:string,medicationId:string,today:string):LatestAcquisitionM144|null {
 if(!owner||!person||!medicationId||!validLocalDayM144(today))return null;
 const rows=events.filter(x=>x.user_id===owner&&x.person_id===person&&x.medicamento_id===medicationId&&!!x.id&&
  typeof x.data_aquisicao==='string'&&validLocalDayM144(x.data_aquisicao)&&x.data_aquisicao<=today);
 const sorted=[...rows].sort((a,b)=>(b.data_aquisicao||'').localeCompare(a.data_aquisicao||'')||String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const found=sorted[0];if(!found)return null;
 const origin=classifyAcquisitionOriginM144({tipo_aquisicao:found.tipo_aquisicao});
 const label:Record<AcquisitionOriginM144,string>={particular:'Compra particular registrada',sus:'Aquisição SUS registrada',contingencia_particular:'Compra pontual registrada',nao_informada:'Aquisição registrada · origem não informada'};
 return {id:found.id!,date:found.data_aquisicao!,origin,label:label[origin],isActualAcquisition:true};
}
