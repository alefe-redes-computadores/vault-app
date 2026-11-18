/** Guarde no momento da ação e valide novamente após cada await. Sem storage. */
export type MedicalScopeP3={userId:string;personId:string;signature:string};
export function assertMedicalScopeP3(intended:MedicalScopeP3,current:MedicalScopeP3):void{
  if(!intended.userId||!intended.personId||intended.userId!==current.userId||intended.personId!==current.personId||intended.signature!==current.signature)
    throw new Error('Conta, pessoa ou seleção mudou durante a geração. Resultado descartado.');
}
