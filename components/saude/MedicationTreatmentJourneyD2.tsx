"use client";

/**
 * P6 P3-D2 — projeção conservadora, somente leitura.
 * Ausência de documento ou DoseLog é "não comprovado no VAULT", não ausência no mundo real.
 */
export function MedicationTreatmentJourneyD2({
  prescriptionDate, acquisitionDate, firstRecordedDose, temporary,
}: {
  prescriptionDate?: string | null;
  acquisitionDate?: string | null;
  firstRecordedDose?: string | null;
  temporary: boolean;
}) {
  const format = (value?: string | null) => {
    if (!value) return null;
    const found = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!found) return "Data no registro: " + value.slice(0, 30);
    return `${found[3]}/${found[2]}/${found[1]}`;
  };
  const stages = [
    { title: "Prescrição", date: format(prescriptionDate), unknown: "Data não registrada" },
    { title: "Aquisição", date: format(acquisitionDate), unknown: "Sem aquisição documental localizada" },
    { title: "Primeira dose registrada", date: format(firstRecordedDose), unknown: "Sem tomada confirmada localizada" },
  ];
  return (
    <section aria-label="Jornada documental do tratamento" className="rounded-[20px] border border-sky-300/15 bg-surface p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-primary">Jornada do tratamento</h2>
        <span className="rounded-lg border border-sky-300/20 bg-sky-300/[0.05] px-2 py-1 text-[10px] font-semibold text-sky-200">{temporary ? "Curso temporário" : "Linha documental"}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">Etapas distintas. Prescrever não significa comprar; comprar não significa começar; planejar não significa tomar.</p>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
        {stages.map((stage, i) => <div key={stage.title} className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-200">{i + 1} · {stage.title}</p>
          <p className={`mt-1 break-words text-xs ${stage.date ? "font-semibold text-ink-primary" : "text-ink-muted"}`}>{stage.date || stage.unknown}</p>
        </div>)}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Datas extraídas somente de registros existentes. O primeiro DoseLog encontrado não prova que tenha sido a primeira tomada da vida. Não alteramos automaticamente dose, estoque ou receita.</p>
    </section>
  );
}
