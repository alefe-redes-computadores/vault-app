/** A11: descrição não invasiva de capacidade; não cria renderer, permissão ou notificação. */
export type A11AndroidObservation={
 runtime:'android'|'ios'|'web';cssWidth:number|null;cssHeight:number|null;
 reducedMotion:boolean|null;visible:boolean|null;online:boolean|null;
};
export function assessA11AndroidObservation(input:A11AndroidObservation){
 const width=input.cssWidth;
 const viewportCategory=width===null||!Number.isFinite(width)||width<=0?'unknown':
  width>=320&&width<=430?'target_320_430':width<320?'below_target':'above_target';
 return {viewportCategory,requiresVisualProof:true,requiresBatteryProof:input.runtime==='android',
  canClaimNativeTest:false,
  notes:[
   viewportCategory==='target_320_430'?'Largura no intervalo de teste; conferir recortes manualmente':'Largura não comprova 320–430 dp',
   input.reducedMotion===true?'Preferência de movimento reduzido ativa; verificar Fênix':'Não foi comprovado o modo movimento reduzido',
   input.visible===false?'Tela em segundo plano; não medir FPS como se estivesse visível':'FPS/bateria precisam de aparelho físico',
  ]};
}
