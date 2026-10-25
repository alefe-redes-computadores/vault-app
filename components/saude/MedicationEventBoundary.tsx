import { CalendarClock, FileText, PackageCheck } from "lucide-react";

export function MedicationEventBoundary({ mode }: { mode: "prescription" | "prescription_plan" | "acquisition" }) {
  const content = mode === "prescription_plan"
    ? { icon: CalendarClock, label: "Planejamento", title: "Uma data, sem criar receita", text: "Cria somente um lembrete de solicitação. Não gera documento, compra, retirada, gasto ou estoque." }
    : mode === "prescription"
      ? { icon: FileText, label: "Receita", title: "Documento recebido", text: "Registra a prescrição e seu anexo em Documentos de saúde. Não confirma aquisição ou recebimento." }
      : { icon: PackageCheck, label: "Aquisição", title: "Recebimento ou compra", text: "Registra o que realmente foi adquirido. Data futura permanece planejamento e não entra em gasto ou estoque." };
  const Icon = content.icon;
  return <aside aria-label={`Limites do evento: ${content.label}`} className="rounded-2xl border border-surface-border/60 bg-surface-raised/45 p-3">
    <div className="flex items-start gap-2.5"><Icon size={15} className="mt-0.5 shrink-0 text-violet-300"/><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300">{content.label} · autoridade do registro</p><p className="mt-1 text-xs font-semibold text-ink-primary">{content.title}</p><p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{content.text}</p></div></div>
  </aside>;
}
