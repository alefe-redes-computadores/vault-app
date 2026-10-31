/** P14 R2 — projeção de interface pura. Nunca muda a classificação clínica. */
export type MedicationListPresentation={
  active:boolean;
  title:string;
  countLabel:string;
  emptyDescription:string;
  clearLabel:string;
};
const categories:Record<string,string>={
  todos:"Todos",atencao:"Atenção",continuos:"Contínuos",temporarios:"Por período",
  sos:"SOS",controlados:"Controlados",encerrados:"Encerrados",
};
export function medicationListPresentation(filter:string,query:string,count:number):MedicationListPresentation {
  const searching=Boolean(query.trim());
  const selected=filter!=="todos";
  const safeCount=Number.isFinite(count)?Math.max(0,Math.trunc(count)):0;
  const category=categories[filter]||"Categoria selecionada";
  return {
    active:searching||selected,
    title:searching&&selected?`Busca · ${category}`:searching?"Busca de medicamentos":category,
    countLabel:`${safeCount} medicamento${safeCount===1?"":"s"} encontrado${safeCount===1?"":"s"}`,
    emptyDescription:searching?"Nenhum medicamento corresponde à busca e aos filtros selecionados.":selected?"Não há medicamentos nesta categoria. Os demais continuam disponíveis em Todos.":"Nenhum medicamento cadastrado para esta pessoa.",
    clearLabel:searching||selected?"Ver todos os medicamentos":"",
  };
}
