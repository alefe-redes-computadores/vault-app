/** Presentation-only. No name inference, no authority promotion, no clinical write. */
export type RegulatoryUX360Profile = {verified?:boolean;label?:string;sourceLabel?:string;detail?:string}|null|undefined;
export type RegulatoryUX360Summary = {declaredType?:string|null;hasDocumentEvidence?:boolean;directDocumentCount?:number;sourceDocumentCount?:number;hasRegulatoryConflict?:boolean}|null|undefined;
const DECLARED:Readonly<Record<string,string>>=Object.freeze({comum:'Receita comum',branca:'Controle especial',azul:'Notificação azul',amarela:'Notificação amarela'});
export function regulatoryCopyUX360(profile:RegulatoryUX360Profile,needsReview=false,summary?:RegulatoryUX360Summary,identityState?:string|null){
 const review=needsReview||identityState==='possible_divergence'||profile?.label==='Classificação em revisão';
 const official=profile?.verified===true&&!review;
 const declarationConflict=summary?.hasRegulatoryConflict===true;
 const label=review?'Classificação regulatória em revisão':official?(profile?.label||'Classificação regulatória confirmada'):'Classificação regulatória não confirmada';
 const rail=review?'REG. REVISÃO':official?'REG. OFICIAL':'REG. PENDENTE';
 const declared=summary?.declaredType&&Object.prototype.hasOwnProperty.call(DECLARED,summary.declaredType)?DECLARED[summary.declaredType]:null;
 const document=summary?.hasDocumentEvidence===true?'Documento de receita vinculado':'Documento de receita não localizado nos vínculos';
 const identity=identityState==='confirmed'?'Identidade confirmada no catálogo':identityState==='compatible'?'Referência farmacêutica compatível':identityState==='possible_divergence'?'Identidade em conferência':'Identidade ainda não confirmada';
 return {label,rail,official,review,declarationConflict,declared,document,identity,source:profile?.sourceLabel||(official?'Catálogo regulatório':null),validity:'Vínculo documental não comprova validade atual.'};
}
