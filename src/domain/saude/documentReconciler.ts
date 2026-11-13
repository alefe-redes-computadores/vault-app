/** Identidade documental: deduplicar projeção, nunca apagar/fundir linhas persistidas. */
export type DocumentReferenceM144={id?:string|null;document_id?:string|null;medicamento_id?:string|null;renovacao_id?:string|null;user_id?:string|null;person_id?:string|null;kind?:string|null;validade_confirmada?:boolean;validade_ate?:string|null};
export type DocumentProjectionM144={key:string;entries:DocumentReferenceM144[];state:'validade_confirmada'|'historico_ou_revisar';documentId:string};
export function reconcileDocumentsM144(args:{references:readonly DocumentReferenceM144[];userId:string;personId:string;todayISO:string}):DocumentProjectionM144[]{
 const {userId,personId}=args;if(!userId||!personId)return [];
 const groups=new Map<string,DocumentReferenceM144[]>();
 for(const ref of args.references){
  if(ref.user_id!==userId||ref.person_id!==personId||!ref.document_id?.trim())continue;
  const key=[ref.document_id,ref.medicamento_id||'',ref.renovacao_id||''].map(v=>encodeURIComponent(v||'')).join('|');
  groups.set(key,[...(groups.get(key)||[]),ref]);
 }
 return [...groups.entries()].map(([key,entries])=>({key,entries,
  state:entries.some(e=>e.validade_confirmada===true&&typeof e.validade_ate==='string'&&e.validade_ate>=args.todayISO)?'validade_confirmada':'historico_ou_revisar',
  documentId:entries[0].document_id!}));
}
