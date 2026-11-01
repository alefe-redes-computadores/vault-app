/** Conservative read-only classification audit: category counts are not diagnoses or dose facts. */
export function medicationPortfolioCoherence(input: { active:number; continuous:number; temporary:number; asNeeded:number }): {
  unknownType:number; hasUnknownType:boolean; explanation:string;
} {
  const safe = (x:number) => Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
  const active=safe(input.active);
  const classified=safe(input.continuous)+safe(input.temporary)+safe(input.asNeeded);
  const unknownType=Math.max(0,active-classified);
  return {
    unknownType,
    hasUnknownType:unknownType>0,
    explanation: unknownType>0
      ? `${unknownType} medicamento(s) ativo(s) sem tipo de uso classificado. Confira o cadastro; nenhum estado clínico foi inferido.`
      : "Os tipos de uso registrados não indicam lacuna de classificação neste resumo."
  };
}
