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
    { title: "Prescrição declarada", date: format(prescriptionDate), raw: prescriptionDate, unknown: "Data não registrada" },
    { title: "Aquisição registrada", date: format(acquisitionDate), raw: acquisitionDate, unknown: "Sem aquisição documental localizada" },
    { title: "Dose mais antiga encontrada", date: format(firstRecordedDose), raw: firstRecordedDose, unknown: "Sem tomada confirmada localizada" },
  ];
  const isDated = (raw?: string | null) => Boolean(raw && /^\d{4}-\d{2}-\d{2}/.test(raw));
  const documented = stages.filter(s => isDated(s.raw)).sort((a,b) => String(a.raw).localeCompare(String(b.raw)));
  const undated = stages.filter(s => !isDated(s.raw));
  const ordered = [...documented, ...undated];
  return (
    <section aria-label="Jornada documental do tratamento" className="rounded-[20px] border border-sky-300/15 bg-surface p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-primary">Datas documentadas</h2>
        <span className="rounded-lg border border-sky-300/20 bg-sky-300/[0.05] px-2 py-1 text-[10px] font-semibold text-sky-200">{temporary ? "Curso temporário" : "Linha documental"}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">Fatos em ordem de data registrada, não etapas obrigatórias. Prescrever não significa comprar; comprar não significa começar; planejar não significa tomar.</p>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
        {ordered.map((stage) => <div key={stage.title} className="min-w-0 rounded-xl border border-surface-border/60 bg-surface-raised p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-200">{stage.title}</p>
          <p className={`mt-1 break-words text-xs ${stage.date ? "font-semibold text-ink-primary" : "text-ink-muted"}`}>{stage.date || stage.unknown}</p>
        </div>)}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Datas informadas nos registros disponíveis. A dose mais antiga encontrada no VAULT não comprova que tenha sido a primeira tomada da vida. Não alteramos dose, estoque nem receita.</p>
    </section>
  );
}
