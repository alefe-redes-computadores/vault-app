/** Presentation-only. No name inference, no authority promotion, no clinical write. */
import {medicationRegulatoryShortLabel, medicationRegulatoryListIdentity, type MedicationRegulatoryVisual} from "../medication-regulatory-visual";
export type RegulatoryUX360Profile = (Partial<Pick<MedicationRegulatoryVisual,"verified"|"label"|"sourceLabel"|"detail"|"classEvidence"|"reviewReasons"|"referenceIdentity"|"identifiedIngredients">>)|null|undefined;
export type RegulatoryUX360Summary = {declaredType?:string|null;hasDocumentEvidence?:boolean;directDocumentCount?:number;sourceDocumentCount?:number;hasRegulatoryConflict?:boolean}|null|undefined;
const DECLARED:Readonly<Record<string,string>>=Object.freeze({comum:'Receita comum',branca:'Controle especial',azul:'Notificação azul',amarela:'Notificação amarela'});
export function regulatoryCopyUX360(profile:RegulatoryUX360Profile,needsReview=false,summary?:RegulatoryUX360Summary,identityState?:string|null){
 const identity=identityState??profile?.referenceIdentity;
 const review=needsReview||Boolean(profile?.reviewReasons?.length)||identity==='possible_divergence'||profile?.label==='Classificação em revisão';
 const official=profile?.verified===true&&!review;
 const declarationConflict=summary?.hasRegulatoryConflict===true;
 const label=review?'Classificação regulatória em revisão':official?(profile?.label||'Classificação regulatória confirmada'):'Classificação regulatória não confirmada';
 const officialShort=official&&profile?.label?medicationRegulatoryShortLabel({verified:true,label:profile.label}):null;
 const rail=review?'REG. REVISÃO':official?(officialShort&&officialShort!=='Receita'?officialShort:'REG. OFICIAL'):'REG. PENDENTE';
 const declared=summary?.declaredType&&Object.prototype.hasOwnProperty.call(DECLARED,summary.declaredType)?DECLARED[summary.declaredType]:null;
 // GUARDIAN H01: list-only identity; a declaration is never official evidence.
 const declaredRail:Readonly<Record<string,string>>={comum:'Comum · cad.',branca:'Especial · cad.',azul:'Azul · cad.',amarela:'Amarela · cad.'};
 const classIdentity=medicationRegulatoryListIdentity(profile?.label ? {...profile,label:profile.label,verified:profile.verified===true}:null);
 // A reviewed profile may only carry catalog knowledge if the canonical resolver
 // established independent class evidence and the identity is not divergent.
 const independentlyKnown=Boolean(profile?.classEvidence)&&identity!=='possible_divergence'&&identity!=='unvalidated';
 const knownIdentity=identity!=='possible_divergence'&&(identity==='confirmed'||identity==='compatible'||Boolean(profile?.identifiedIngredients?.length));
 const listRailOrigin=official&&classIdentity?'official':declared?'declared':independentlyKnown&&classIdentity?'catalog-review':knownIdentity?'catalog-identity':'unknown';
 const listRail=listRailOrigin==='official'?classIdentity!.label:listRailOrigin==='declared'?declaredRail[summary?.declaredType||'']:listRailOrigin==='catalog-review'?`${classIdentity!.label} · cat.`:listRailOrigin==='catalog-identity'?'Cat. · s/ classe':'REG. REVISÃO';
 // GUARDIAN R2: declared pigment is visual identity, never authority. Keep
 // the review wording when applicable, even when the recorded color is shown.
 const declaredColors:Readonly<Record<string,string>>={comum:'#94a3b8',branca:'#cbd5e1',azul:'#60a5fa',amarela:'#facc15'};
 const listRailColor=listRailOrigin==='official'?(profile?.label==='Receita comum'?'#94a3b8':null):listRailOrigin==='declared'?declaredColors[summary?.declaredType||'']:listRailOrigin==='catalog-review'?classIdentity!.color:'#64748b';
 const document=summary?.hasDocumentEvidence===true?'Documento de receita vinculado':'Documento de receita não localizado nos vínculos';
 const identityLabel=identity==='confirmed'?'Identidade confirmada no catálogo':identity==='compatible'?'Referência farmacêutica compatível':identity==='possible_divergence'?'Identidade em conferência':'Identidade ainda não confirmada';
 // Card-only projection; never infer equivalence from labels or mutate declaration/authority.
 const sameDisplayedType=official&&Boolean(declared)&&(
   (summary?.declaredType==='branca'&&profile?.label==='Controle especial')||
   (summary?.declaredType==='comum'&&profile?.label==='Receita comum')||
   (summary?.declaredType==='azul'&&(profile?.label==='Notificação B'||profile?.label==='Notificação B2'))||
   (summary?.declaredType==='amarela'&&profile?.label==='Notificação A')
 );
 const cardDeclaration=declarationConflict?'Cadastro em conferência':!declared||sameDisplayedType?null:official?`Cadastro: ${declared} · conferir`:`Cadastro: ${declared} · sem confirmação oficial`;
 return {label,rail,listRail,listRailColor,listRailOrigin,catalogClass:identity!=='possible_divergence'?profile?.classEvidence:undefined,official,review,declarationConflict,declared,cardDeclaration,document,identity:identityLabel,source:profile?.sourceLabel||(official?'Catálogo regulatório':null),validity:'Vínculo documental não comprova validade atual.'};
}

export function medicationRegulatoryKnowledgeText(profile:RegulatoryUX360Profile,declaredType?:string|null):string {
 const copy=regulatoryCopyUX360(profile,false,{declaredType});
 if(copy.listRailOrigin==='unknown')return '';
 const ingredient=profile?.identifiedIngredients?.length?'Princípio ativo: '+profile.identifiedIngredients.join(' + ')+' · ':'';
 if(copy.listRailOrigin==='catalog-identity')return ingredient+'Identidade farmacêutica conhecida; classificação regulatória não comprovada. Não comprova validade da receita pessoal.';
 const source=copy.listRailOrigin==='declared'?'Cadastro pessoal':profile?.classEvidence?.sourceLabel||copy.source||'Catálogo regulatório';
 const independent=profile?.classEvidence&&profile.referenceIdentity!=='possible_divergence'&&copy.listRailOrigin==='declared'
   ? ' · Referência do catálogo: '+profile.classEvidence.label+' ('+profile.classEvidence.sourceLabel+'); conferir aplicabilidade' : '';
 return ingredient+'Classificação: '+copy.listRail+' · Origem: '+source+independent+(copy.review?' · Conferência técnica pendente':'')+' · Não comprova validade da receita pessoal.';
}
