"use client";

import { DollarSign, LineChart } from "lucide-react";
import { StatCard } from "@/components/detail/DetailComponents";

type Props = {
  paidCount: number;
  paidTotal: number;
  paidAverage: number;
  referencePrice?: number | null;
};

/** Read-only: somente compras realizadas alimentam as médias. Planejamentos ficam fora. */
export function MedicationPaidCostCards({ paidCount, paidTotal, paidAverage, referencePrice }: Props) {
  if (paidCount > 0) {
    return (
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 min-[400px]:gap-3" aria-label="Resumo de aquisições realizadas">
        <StatCard icon={<LineChart size={14} />} label="Compras registradas"
          value={`R$ ${paidTotal.toFixed(2)}`} description={`${paidCount} aquisição(ões) pagas`} />
        <StatCard icon={<DollarSign size={14} />} label="Preço médio"
          value={`R$ ${paidAverage.toFixed(2)}`} description="Média das aquisições registradas" />
      </div>
    );
  }
  const referenceKnown = typeof referencePrice === "number" && Number.isFinite(referencePrice) && referencePrice >= 0;
  return (
    <StatCard icon={<DollarSign size={14} />} label="Valor informado"
      value={referenceKnown ? `R$ ${referencePrice.toFixed(2)}` : "Não informado"}
      description={referenceKnown ? "Valor de referência salvo no medicamento" : "Nenhuma aquisição paga com valor registrado"} />
  );
}
