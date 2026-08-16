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
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { getDaysUntil } from "@/lib/health-utils";

export function MedicamentosNotifications() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  const { alertas } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeISO = hoje.toISOString().slice(0, 10);

    const limiteFuturo = new Date(hoje);
    limiteFuturo.setDate(limiteFuturo.getDate() + 7);
    const limiteISO = limiteFuturo.toISOString().slice(0, 10);

    const itensAlerta: any[] = [];

    medicamentos.forEach((med: any) => {
      // 1. Lógica de Renovação de Receita
      if (med.proxima_renovacao) {
        if (med.proxima_renovacao < hojeISO) {
          itensAlerta.push({
            id: med.id,
            tipo: "renovacao",
            urgencia: "pendente",
            titulo: "Receita Vencida",
            descricao: med.nome,
            data: med.proxima_renovacao,
          });
        } else if (med.proxima_renovacao === hojeISO) {
          itensAlerta.push({
            id: med.id,
            tipo: "renovacao",
            urgencia: "hoje",
            titulo: "Renovar Receita Hoje",
            descricao: med.nome,
            data: med.proxima_renovacao,
          });
        } else if (med.proxima_renovacao <= limiteISO) {
          itensAlerta.push({
            id: med.id,
            tipo: "renovacao",
            urgencia: "proxima",
            titulo: "Receita Vencendo",
            descricao: med.nome,
            data: med.proxima_renovacao,
          });
        }
      }

      // 🔧 CORRIGIDO: Usa estoque_quantidade (campo correto)
      if (med.estoque_quantidade !== undefined && med.estoque_quantidade !== null) {
        if (med.estoque_quantidade === 0) {
          itensAlerta.push({
            id: med.id,
            tipo: "estoque",
            urgencia: "pendente",
            titulo: "Sem Estoque",
            descricao: `${med.nome} acabou`,
            data: "Imediato",
          });
        } else if (med.estoque_quantidade <= 3) {
          itensAlerta.push({
            id: med.id,
            tipo: "estoque",
            urgencia: "hoje",
            titulo: "Estoque Baixo",
            descricao: `Restam apenas ${med.estoque_quantidade} de ${med.nome}`,
            data: "Comprar em breve",
          });
        }
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

      <div className="space-y-2.5">
        <AnimatePresence>
          {alertas.slice(0, 4).map((alerta, index) => (
            <motion.div
              key={`${alerta.tipo}-${alerta.id}-${index}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => {
                trigger("vibrate");
                router.push(`/saude/medicamentos/detalhes?id=${alerta.id}`);
              }}
              className={`group flex items-center justify-between gap-3 rounded-[24px] border p-3.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${getUrgencyColor(alerta.urgencia)}`}
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
      </div>
    </div>
  );
}