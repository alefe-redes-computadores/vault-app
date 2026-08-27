"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  Stethoscope,
  Activity,
  ChevronRight,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivePersonId } from "@/hooks/useActivePersonId";

export function HealthNotifications() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();

  const consultas = useLiveQuery(
    () => activePersonId ? db.consultas.where("person_id").equals(activePersonId).toArray() : [],
    [activePersonId]
  ) || [];
  
  const cirurgias = useLiveQuery(
    () => activePersonId ? db.cirurgias.where("person_id").equals(activePersonId).toArray() : [],
    [activePersonId]
  ) || [];

  const { alertas } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeISO = hoje.toISOString().slice(0, 10);

    const limiteFuturo = new Date(hoje);
    limiteFuturo.setDate(limiteFuturo.getDate() + 3);
    const limiteISO = limiteFuturo.toISOString().slice(0, 10);

    const itensAlerta: any[] = [];

    // Processar Consultas
    consultas.forEach((c) => {
      if (c.status === "agendada") {
        if (c.data < hojeISO) {
          itensAlerta.push({ ...c, tipo: "consulta", urgencia: "pendente", titulo: "Consulta Pendente" });
        } else if (c.data === hojeISO) {
          itensAlerta.push({ ...c, tipo: "consulta", urgencia: "hoje", titulo: "Consulta Hoje" });
        } else if (c.data <= limiteISO) {
          itensAlerta.push({ ...c, tipo: "consulta", urgencia: "proxima", titulo: "Consulta Próxima" });
        }
      }
    });

    // Processar Cirurgias
    cirurgias.forEach((cir) => {
      if (cir.status === "agendada") {
        if (cir.data < hojeISO) {
          itensAlerta.push({ ...cir, tipo: "cirurgia", urgencia: "pendente", titulo: "Cirurgia Pendente" });
        } else if (cir.data === hojeISO) {
          itensAlerta.push({ ...cir, tipo: "cirurgia", urgencia: "hoje", titulo: "Cirurgia Hoje" });
        } else if (cir.data <= limiteISO) {
          itensAlerta.push({ ...cir, tipo: "cirurgia", urgencia: "proxima", titulo: "Cirurgia Próxima" });
        }
      }
    });

    // Ordenar
    itensAlerta.sort((a, b) => {
      const peso = { pendente: 1, hoje: 2, proxima: 3 };
      const pesoA = peso[a.urgencia as keyof typeof peso] ?? 99;
      const pesoB = peso[b.urgencia as keyof typeof peso] ?? 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.data.localeCompare(b.data);
    });

    return { alertas: itensAlerta };
  }, [consultas, cirurgias]);

  if (alertas.length === 0) return null;

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case "pendente":
        return "bg-coral/10 border-coral/30 text-coral";
      case "hoje":
        return "bg-amber-400/10 border-amber-400/30 text-amber-400";
      case "proxima":
        return "bg-ice/10 border-ice/30 text-ice";
      default:
        return "bg-surface-raised border-surface-border text-ink-primary";
    }
  };

  const formatDateDisplay = (isoStr: string) => {
    const parts = isoStr.split("-");
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="w-full space-y-3 mb-6">
      <div className="flex items-center gap-2 px-1">
        <BellRing size={16} className="text-ink-primary" />
        <h3 className="font-display text-sm font-semibold text-ink-primary">
          Alertas de Saúde
        </h3>
      </div>

      <div 
        className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 gap-3 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <AnimatePresence>
          {alertas.map((alerta) => (
            <motion.div
              key={`${alerta.tipo}-${alerta.id}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => {
                trigger("vibrate");
                router.push(
                  `/saude/${alerta.tipo === "consulta" ? "consultas" : "cirurgias"}/detalhes?id=${alerta.id}`
                );
              }}
              className={`group w-[85%] max-w-[320px] shrink-0 snap-start flex items-center justify-between gap-3 rounded-[24px] border p-3.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${getUrgencyColor(
                alerta.urgencia
              )}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    alerta.urgencia === "pendente"
                      ? "bg-coral/20 border-coral/30"
                      : alerta.urgencia === "hoje"
                      ? "bg-amber-400/20 border-amber-400/30"
                      : "bg-ice/20 border-ice/30"
                  }`}
                >
                  {alerta.urgencia === "pendente" ? (
                    <AlertCircle size={18} />
                  ) : alerta.urgencia === "hoje" ? (
                    <CalendarClock size={18} />
                  ) : alerta.tipo === "consulta" ? (
                    <Stethoscope size={18} />
                  ) : (
                    <Activity size={18} />
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
                    {alerta.tipo === "consulta"
                      ? alerta.motivo || "Consulta Agendada"
                      : alerta.procedimento}
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
