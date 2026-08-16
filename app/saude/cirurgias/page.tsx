"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Plus, 
  Calendar as CalendarIcon, 
  Building2, 
  ChevronRight,
  Activity
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Cirurgia } from "@/lib/types";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function CirurgiasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  
  const [abaAtiva, setAbaAtiva] = useState<"proximas" | "historico">("proximas");

  // ✅ JÁ ESTÁ CORRETO (usa db.cirurgias, db.medicos, db.hospitais)
  const cirurgias = useLiveQuery(() => db.cirurgias.toArray(), []) || [];
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const hojeISO = new Date().toISOString().slice(0, 10);

  const { proximas, historico } = useMemo(() => {
    const prox: Cirurgia[] = [];
    const hist: Cirurgia[] = [];

    cirurgias.forEach((c) => {
      const isPassada = c.data < hojeISO || c.status === "realizada" || c.status === "cancelada";
      if (isPassada) {
        hist.push(c);
      } else {
        prox.push(c);
      }
    });

    prox.sort((a, b) => a.data.localeCompare(b.data));
    hist.sort((a, b) => b.data.localeCompare(a.data));

    return { proximas: prox, historico: hist };
  }, [cirurgias, hojeISO]);

  const listaExibida = abaAtiva === "proximas" ? proximas : historico;

  const getMedicoNome = (id?: string) => {
    if (!id) return "Equipe não especificada";
    const med = medicos.find((m) => m.id === id);
    return med ? `Dr(a). ${med.nome}` : "Médico não encontrado";
  };

  const getHospitalNome = (id?: string) => {
    if (!id) return null;
    const hosp = hospitais.find((h) => h.id === id);
    return hosp ? hosp.nome : null;
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-coral" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral/90">Clínico</p>
                </div>
                <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">Cirurgias</h1>
              </div>
            </div>

            <button
              onClick={() => { trigger("vibrate"); router.push("/saude/cirurgias/nova"); }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral text-void transition-all active:scale-95 shadow-md shadow-coral/20"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-raised p-1 border border-surface-border/40">
            <button
              onClick={() => { trigger("vibrate"); setAbaAtiva("proximas"); }}
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                abaAtiva === "proximas"
                  ? "bg-surface text-ink-primary shadow-sm border border-surface-border/50"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              Agendadas ({proximas.length})
            </button>
            <button
              onClick={() => { trigger("vibrate"); setAbaAtiva("historico"); }}
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                abaAtiva === "historico"
                  ? "bg-surface text-ink-primary shadow-sm border border-surface-border/50"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              Histórico ({historico.length})
            </button>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          {listaExibida.length === 0 ? (
            <motion.div 
              variants={fadeUp} 
              initial="initial" 
              animate="animate" 
              className="rounded-[28px] border border-surface-border/50 bg-surface p-8 text-center shadow-sm"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/10 text-coral border border-coral/10 mb-3">
                <Activity size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">Nenhum registro encontrado</h3>
              <p className="mt-1 text-xs text-ink-muted max-w-xs mx-auto">
                {abaAtiva === "proximas" 
                  ? "Você não possui cirurgias ou procedimentos agendados. Toque no botão (+) acima para adicionar." 
                  : "Não há registros de procedimentos passados no histórico."}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {listaExibida.map((cir, index) => {
                const hospitalNome = getHospitalNome(cir.hospital_id);
                return (
                  <motion.div
                    key={cir.id}
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.04 }}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/detalhes?id=${cir.id}`); }}
                    className="group cursor-pointer rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98] hover:border-coral/30 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral/10 text-coral border border-coral/10">
                          <Activity size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-coral">
                              {formatDateDisplay(cir.data)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              cir.status === "agendada" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                              cir.status === "realizada" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                              "bg-coral/10 text-coral border border-coral/20"
                            }`}>
                              {cir.status}
                            </span>
                          </div>

                          <h3 className="truncate font-semibold text-ink-primary text-base mt-1">
                            {cir.procedimento}
                          </h3>

                          {hospitalNome && (
                            <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-1">
                              <Building2 size={13} className="text-ink-faint shrink-0" />
                              <span className="truncate">{hospitalNome}</span>
                            </div>
                          )}

                          <p className="text-xs text-ink-faint mt-1.5 line-clamp-1">
                            {getMedicoNome(cir.medico_id)}
                          </p>
                        </div>
                      </div>

                      <div className="self-center flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted group-hover:text-coral transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}