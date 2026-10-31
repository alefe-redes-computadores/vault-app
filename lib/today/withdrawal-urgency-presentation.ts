/** P15 R1 — tom visual de prazo, apresentação pura, sem criar ação clínica. */
export function getDiasRestantesEstilo(dias: number | null | undefined) {
  if (dias === null || dias === undefined) return {
    cor: "text-ink-muted", bg: "bg-surface", label: "Indefinido", pulse: false,
  };
  if (dias <= 3) return {cor:"text-coral",bg:"bg-coral/10",label:"Urgente",pulse:true};
  if (dias <= 7) return {cor:"text-amber-400",bg:"bg-amber-400/10",label:"Em breve",pulse:false};
  if (dias <= 14) return {cor:"text-amber-300",bg:"bg-amber-300/5",label:"Atenção",pulse:false};
  return {cor:"text-emerald-400",bg:"bg-emerald-400/10",label:"Tranquilo",pulse:false};
}
