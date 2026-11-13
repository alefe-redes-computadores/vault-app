/** M144 — relato de contingência, não é plano de substituição nem prescrição. */
export type ContingencyEventM144={id:string;ownerId:string;personId:string;anchorId:string;bridgeId:string;startDay:string;endDay:string;reason:'ruptura_estoque_ancora'|'outro_relato';notes:string};
export type BenefitCostM144={observedPain?:number|null;observedEnergy?:number|null;observedMood?:number|null;reportedEffects:string[];reportedWarnings:string[];disclaimer:string};
export const isDayM144=(value:string)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;};
export function classifyBridgeM144(event:ContingencyEventM144,today:string):'agendada'|'ativa'|'historica'|'invalida'{
 if(!event.anchorId||!event.bridgeId||event.anchorId===event.bridgeId||!isDayM144(event.startDay)||!isDayM144(event.endDay)||event.endDay<event.startDay)return 'invalida';
 if(today<event.startDay)return 'agendada';if(today>event.endDay)return 'historica';return 'ativa';
}
export function riskBenefitSnapshotM144(args:{pain?:number|null;energy?:number|null;mood?:number|null;observations?:readonly string[];warnings?:readonly string[]}):BenefitCostM144{
 const valid=(n:number|null|undefined)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=10?n:null;
 return {observedPain:valid(args.pain),observedEnergy:valid(args.energy),observedMood:valid(args.mood),reportedEffects:(args.observations||[]).filter(Boolean).slice(0,10),reportedWarnings:(args.warnings||[]).filter(Boolean).slice(0,10),disclaimer:'Observações não demonstram causalidade nem segurança. Riscos de interação e retomada exigem avaliação profissional; não calcular janela segura por meia-vida isolada.'};
}
export function returnMonitoringM144(endDay:string,today:string){return {ended:isDayM144(endDay)&&endDay<today,canRecommendRestart:false,notice:'Registre o encerramento e procure orientação sobre a retomada. Este aplicativo não calcula horário seguro de reinício de tratamentos.'};}
