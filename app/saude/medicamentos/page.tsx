"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pill, Plus, AlertCircle, Loader2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageTransition } from "@/components/PageTransition";

export default function MedicamentosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []);

  const getProximaRenovacao = (data: string) => {
    const hoje = new Date();
    const renovacao = new Date(data);
    const diff = Math.ceil((renovacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-10 bg-void/80 backdrop-blur-xl border-b border-surface-border/30 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                trigger("vibrate");
                router.back();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95 transition-all"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ice">Vault</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary">Medicamentos</h1>
              <p className="text-sm text-ink-muted">Gerencie suas receitas e renovações</p>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => {
              trigger("vibrate");
              router.push("/saude/medicamentos/novo");
            }}
          >
            <Plus size={16} />
            Novo medicamento
          </Button>

          {medicamentos?.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4 border border-surface-border/50">
                <Pill size={32} className="text-ink-muted" />
              </div>
              <h3 className="font-display text-lg text-ink-primary">Nenhum medicamento</h3>
              <p className="text-sm text-ink-muted mt-1">
                Comece cadastrando suas receitas e medicamentos
              </p>
            </motion.div>
          ) : (
            medicamentos?.map((med, index) => {
              const dias = getProximaRenovacao(med.proxima_renovacao);
              const isUrgent = dias < 7;

              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/medicamentos/detalhes?id=${med.id}`);
                  }}
                  className={`rounded-xl border p-4 bg-surface shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95 ${
                    isUrgent ? "border-coral/40" : "border-surface-border/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        isUrgent ? "bg-coral/20" : "bg-surface-raised"
                      }`}>
                        <Pill size={18} className={isUrgent ? "text-coral" : "text-ink-muted"} />
                      </div>
                      <div>
                        <h3 className="font-display text-[15px] font-medium text-ink-primary">
                          {med.nome}
                        </h3>
                        <p className="text-sm text-ink-muted">{med.dosagem}</p>
                        <p className="text-xs text-ink-muted mt-0.5">Dr(a). {med.medico}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        isUrgent ? "text-coral" : "text-ink-muted"
                      }`}>
                        {isUrgent && <AlertCircle size={14} />}
                        {dias} dias
                      </div>
                      <p className="text-xs text-ink-muted mt-1">
                        Renova: {format(new Date(med.proxima_renovacao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}