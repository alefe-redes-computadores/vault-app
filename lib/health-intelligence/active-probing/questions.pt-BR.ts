import type { ActiveProbeEventType, ActiveProbeQuestion } from "./types";

const LIMIT = "Esta pergunta organiza uma percepção registrada por você. Não demonstra causalidade, diagnóstico ou necessidade de alterar tratamento.";

export function activeProbeQuestion(
  type: ActiveProbeEventType,
  context: { medicationName?: string; manufacturer?: string; axisLabel?: string; checkpoint?: "d3" | "d10" },
): ActiveProbeQuestion {
  const medication = context.medicationName?.trim() || "este medicamento";
  if (type === "manufacturer_lot_started") {
    const manufacturer = context.manufacturer?.trim() || "fabricante informado";
    return context.checkpoint === "d10" ? {
      key:"manufacturer-d10", version:1,
      prompt:`Depois de mais alguns dias com ${manufacturer}, sua percepção se manteve?`,
      options:[
        {key:"same",label:"Continua igual"},{key:"difference",label:"Percebi diferença"},
        {key:"changed",label:"Minha percepção mudou"},{key:"unknown",label:"Não consegui comparar"},
      ], optionalNoteLabel:"Quer registrar um detalhe? (opcional)", limitation:LIMIT,
    } : {
      key:"manufacturer-d3", version:1,
      prompt:`Você começou o lote da ${manufacturer} há alguns dias. Percebeu alguma diferença?`,
      options:[
        {key:"same",label:"Igual ao anterior"},{key:"less",label:"Pareceu menor ou durou menos"},
        {key:"more_or_discomfort",label:"Pareceu maior ou trouxe desconforto"},
        {key:"unknown",label:"Ainda não sei"},{key:"not_started",label:"Ainda não comecei este lote"},
      ], optionalNoteLabel:"Quer registrar um detalhe? (opcional)", limitation:LIMIT,
    };
  }
  if (type === "confirmed_sos_use") return {
    key:"confirmed-sos-d1",version:1,prompt:`Sobre o uso pontual de ${medication}: como foi para o motivo registrado?`,
    options:[{key:"helped",label:"Ajudou bem"},{key:"partial",label:"Ajudou parcialmente"},{key:"no_help",label:"Não ajudou"},{key:"discomfort",label:"Notei desconforto"},{key:"skip",label:"Prefiro não responder"}],
    optionalNoteLabel:"Quer registrar um detalhe? (opcional)",limitation:LIMIT,
  };
  if (type === "temporary_course_ended") return {
    key:"temporary-course-ended-d1",version:1,prompt:`O período registrado de ${medication} terminou. Como ficou o objetivo que você acompanhava?`,
    options:[{key:"resolved",label:"Resolvido"},{key:"partial",label:"Melhorou parcialmente"},{key:"persists",label:"Persiste"},{key:"unknown",label:"Não consegui avaliar"}],
    optionalNoteLabel:"Quer registrar um detalhe? (opcional)",limitation:LIMIT,
  };
  return {
    key:"axis-shift-context",version:1,prompt:`Seus registros de ${context.axisLabel?.trim() || "um dos quatro eixos"} mudaram entre dois períodos. Quer registrar algum contexto?`,
    options:[{key:"sleep",label:"Sono diferente"},{key:"routine_stress",label:"Rotina ou estresse"},{key:"stock",label:"Falta de estoque"},{key:"lot",label:"Troca de lote"},{key:"other",label:"Outro contexto"},{key:"unknown",label:"Não sei"}],
    optionalNoteLabel:"Quer registrar um detalhe? (opcional)",limitation:LIMIT,
  };
}
