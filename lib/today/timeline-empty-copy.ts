/** Empty UI is presentation only; it must not create or mutate a clinical event. */
export function todayTimelineEmptyCopy(input: {
  hasFilters: boolean;
  retroReview: boolean;
  isToday: boolean;
  isPast: boolean;
  selectedDateDescription: string;
}) {
  const {hasFilters,retroReview,isToday,isPast,selectedDateDescription}=input;
  const title=hasFilters ? "Nada com esses filtros" : retroReview ? "Nenhum slot para revisar neste dia" :
    isToday ? "Nenhum registro hoje" : `Nenhum registro em ${selectedDateDescription}`;
  const description=hasFilters ? "Tente ajustar os filtros para ver mais itens." :
    isToday ? "Registre uma dose avulsa ou adicione um sintoma para preencher sua linha do tempo." :
    isPast ? "Não há registros confirmados ou previsões conhecidas para este dia." : "Não há eventos previstos para este dia.";
  return {title,description};
}
