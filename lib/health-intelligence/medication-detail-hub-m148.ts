import type { MedicationJourneySnapshot } from "@/lib/health-intelligence/medication-workspace";

/**
 * M148 P2: present facts already on the user's clinical timeline.
 * This is a read-only, per-medication view model. It NEVER computes stock,
 * substitutes a prescription, equates a planned withdrawal with a receipt,
 * or infers a manufacturer's presence inside the current package.
 */
export type MedicationDetailHubInputM148 = {
  snapshot: MedicationJourneySnapshot;
  suspended: boolean;
  sos: boolean;
  temporary: boolean;
  treatmentCount: number;
  hasKnownStock: boolean;
  labelManufacturer?: string | null;
  latestAcquisitionManufacturer?: string | null;
};

const count = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

const declared = (value?: string | null) => value?.trim() || null;

export function buildMedicationDetailHubM148(input: MedicationDetailHubInputM148) {
  const s = input.snapshot;
  const regimen = input.suspended ? "Tratamento suspenso"
    : input.sos ? "Uso SOS / conforme necessidade"
    : input.temporary ? "Uso por período"
    : "Uso contínuo";
  const treatment = input.treatmentCount > 0
    ? count(input.treatmentCount, "tratamento vinculado", "tratamentos vinculados")
    : "Sem tratamento vinculado";
  const withdrawals = s.pendingWithdrawals > 0
    ? count(s.pendingWithdrawals, "retirada agendada em aberto", "retiradas agendadas em aberto")
    : "Nenhuma retirada agendada em aberto";
  const plans = s.plannedAcquisitions > 0
    ? `${count(s.plannedAcquisitions, "aquisição planejada", "aquisições planejadas")} · não realizada${s.plannedAcquisitions === 1 ? "" : "s"}`
    : "Nenhuma aquisição futura registrada";
  const dated = s.overdueWithdrawals > 0
    ? count(s.overdueWithdrawals, "retirada com data vencida", "retiradas com data vencida")
    : null;
  const prescriptions = count(s.prescriptions, "receita registrada", "receitas registradas");
  const acquisitions = count(s.completedAcquisitions, "aquisição realizada", "aquisições realizadas");
  return {
    treatment: { title: "Tratamento", summary: regimen, detail: treatment },
    supply: {
      title: "Fornecimento",
      summary: dated || withdrawals,
      detail: `${plans} · ${input.hasKnownStock ? "Saldo cadastrado; conferir posição atual" : "Saldo não informado"}`,
      pendingWithdrawals: s.pendingWithdrawals,
      overdueWithdrawals: s.overdueWithdrawals,
      plannedAcquisitions: s.plannedAcquisitions,
    },
    documents: {
      title: "Receitas e contexto",
      summary: prescriptions,
      detail: acquisitions,
    },
    manufacturer: {
      label: declared(input.labelManufacturer),
      latestAcquisition: declared(input.latestAcquisitionManufacturer),
      latestAcquisitionDate: s.latestAcquisitionDate,
      hasCompletedAcquisition: s.completedAcquisitions > 0,
    },
    note: "Receita, compra, retirada agendada e saldo são fatos diferentes. Uma etapa planejada não comprova recebimento ou entrada no estoque.",
  };
}

export type MedicationDetailHubViewM148 = ReturnType<typeof buildMedicationDetailHubM148>;
