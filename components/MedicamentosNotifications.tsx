"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill,
  FileWarning,
  PackageX,
  ChevronRight,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { sugerirRenovacao } from "@/lib/health-insights";
import { getClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";

export function MedicamentosNotifications() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  // ✅ Agora usa o hook que filtra por activePersonId
  const { medicamentos } = useMedicamentos();

  const { alertas } = useMemo(() => {
    const itensAlerta: any[] = [];

    medicamentos.forEach((med: any) => {
      // 1. Planejamento de renovação
      //
      // proxima_renovacao é uma data operacional. Ela NÃO
      // representa validade clínica da receita.
      //
      // O cérebro decide se existe necessidade real de
      // renovação considerando também estoque e contexto.
      const renovacaoInsight =
        sugerirRenovacao(
          med
        );

      if (
        renovacaoInsight.deveRenovar &&
        renovacaoInsight.motivo ===
          "receita"
      ) {
        const dias =
          renovacaoInsight.diasAteRenovacao;

        const dataPlanejada =
          med.lembrete_receita_modo ===
            "data_personalizada" &&
          med.lembrete_receita_data
            ? med.lembrete_receita_data
            : med.proxima_renovacao ||
              "";

        itensAlerta.push({
          id: med.id,
          tipo: "renovacao",
          urgencia:
            renovacaoInsight.urgencia ===
              "alta"
              ? "pendente"
              : dias === 0
                ? "hoje"
                : "proxima",
          titulo:
            dias === 0
              ? "Planejar Receita Hoje"
              : dias !== null &&
                  dias < 0
                ? "Renovação Pendente"
                : "Planejar Nova Receita",
          descricao:
            renovacaoInsight.mensagem ||
            med.nome,
          data:
            dataPlanejada,
        });
      }

      // 2. Estoque clínico V2 — VAULT_CLINICAL_STOCK_V47
      // Ausência de saldo NÃO significa zero. Quando a estimativa por dose
      // é confiável, priorizamos dias/doses; caso contrário preservamos
      // somente o saldo conhecido, sem inventar conversão clínica.
      const stock = getClinicalStockSnapshot(med);

      if (stock.state === "empty" || stock.state === "negative") {
        itensAlerta.push({
          id: med.id,
          tipo: "estoque",
          urgencia: "pendente",
          titulo: "Sem Estoque",
          descricao:
            stock.state === "negative"
              ? `${med.nome} está com saldo negativo e precisa de conferência`
              : `${med.nome} acabou`,
          data: "Imediato",
        });
      } else if (
        stock.state === "available" &&
        (
          (stock.daysRemaining !== null && stock.daysRemaining <= 3) ||
          (stock.daysRemaining === null &&
            stock.dosesRemaining !== null &&
            stock.dosesRemaining <= 3)
        )
      ) {
        const restante =
          stock.daysRemaining !== null
            ? `${stock.daysRemaining} dia${stock.daysRemaining === 1 ? "" : "s"}`
            : `${stock.dosesRemaining} dose${stock.dosesRemaining === 1 ? "" : "s"}`;

        itensAlerta.push({
          id: med.id,
          tipo: "estoque",
          urgencia: "hoje",
          titulo: "Estoque Baixo",
          descricao: `${med.nome}: cerca de ${restante} restante`,
          data: "Comprar em breve",
        });
      }
    });

    // Ordenar: Pendentes/Zerados primeiro, Hoje em segundo, Próximas em terceiro
    itensAlerta.sort((a, b) => {
      const peso = { pendente: 1, hoje: 2, proxima: 3 };
      const pesoA = peso[a.urgencia as keyof typeof peso] || 99;
      const pesoB = peso[b.urgencia as keyof typeof peso] || 99;

      if (pesoA !== pesoB) return pesoA - pesoB;
      return String(a.data).localeCompare(String(b.data));
    });

    return { alertas: itensAlerta };
  }, [medicamentos]);

  if (alertas.length === 0) return null;

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case "pendente":
        return "bg-coral/10 border-coral/30 text-coral";
      case "hoje":
        return "bg-amber-400/10 border-amber-400/30 text-amber-400";
      case "proxima":
        return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
      default:
        return "bg-surface-raised border-surface-border text-ink-primary";
    }
  };

  const formatDateDisplay = (isoStr: string) => {
    if (isoStr === "Imediato" || isoStr === "Comprar em breve") return isoStr;
    const parts = isoStr.split("-");
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="w-full space-y-3 mb-6">
      <div className="flex items-center gap-2 px-1">
        <Pill size={16} className="text-ink-primary" />
        <h3 className="font-display text-sm font-semibold text-ink-primary">
          Farmácia e Receitas
        </h3>
      </div>

      <div 
        className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 gap-3 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <AnimatePresence>
          {alertas.map((alerta, index) => (
            <motion.div
              key={`${alerta.tipo}-${alerta.id}-${index}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => {
                trigger("vibrate");
                router.push(`/saude/medicamentos/detalhes?id=${alerta.id}`);
              }}
              className={`group w-[85%] max-w-[320px] shrink-0 snap-start flex items-center justify-between gap-3 rounded-[24px] border p-3.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${getUrgencyColor(alerta.urgencia)}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    alerta.urgencia === "pendente"
                      ? "bg-coral/20 border-coral/30"
                      : alerta.urgencia === "hoje"
                      ? "bg-amber-400/20 border-amber-400/30"
                      : "bg-emerald-400/20 border-emerald-400/30"
                  }`}
                >
                  {alerta.tipo === "estoque" ? (
                    <PackageX size={18} />
                  ) : alerta.urgencia === "pendente" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <FileWarning size={18} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {alerta.titulo}
                    </span>
                    <span className="font-mono text-[10px] opacity-70">
                      {formatDateDisplay(alerta.data)}
                    </span>
                  </div>
                  <p className="truncate font-medium text-sm mt-0.5">
                    {alerta.descricao}
                  </p>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="w-2 shrink-0" />
      </div>
    </div>
  );
}
