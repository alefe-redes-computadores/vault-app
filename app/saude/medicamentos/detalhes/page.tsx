"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pill, Calendar, Plus, FileText, Clock } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useEffect, useState } from "react";

export default function MedicamentoDetailPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const [isLoading, setIsLoading] = useState(true);

  const medicamento = useLiveQuery(
    () => db.medicamentos.get(id),
    [id],
    null
  );

  const renovacoes = useLiveQuery(
    () => db.renovacoes.where('medicamento_id').equals(id).reverse().sortBy('data'),
    [id],
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!medicamento) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-void flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink-muted">Medicamento não encontrado</p>
            <Button variant="primary" onClick={() => router.push("/saude/medicamentos")} className="mt-4">
              Voltar
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const dataReceita = new Date(medicamento.data_receita);
  const dataRenovacao = new Date(medicamento.proxima_renovacao);
  const diasRestantes = Math.ceil((dataRenovacao.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = diasRestantes < 7;

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
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isUrgent ? "bg-coral/20" : "bg-surface-raised"}`}>
                <Pill size={20} className={isUrgent ? "text-coral" : "text-ink-muted"} />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-primary truncate max-w-[200px]">
                  {medicamento.nome}
                </h1>
                <p className="text-sm text-ink-muted">{medicamento.dosagem}</p>
              </div>
            </div>
            {isUrgent && (
              <span className="ml-auto text-xs px-3 py-1 rounded-full bg-coral/20 text-coral border border-coral/30">
                {diasRestantes} dias
              </span>
            )}
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* Card do medicamento */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-surface-border/50 bg-surface p-6 shadow-sm"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl ${isUrgent ? "bg-coral/20" : "bg-surface-raised"}`}>
                <Pill size={24} className={isUrgent ? "text-coral" : "text-ink-muted"} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {medicamento.nome}
                </h2>
                <p className="text-sm text-ink-muted">{medicamento.dosagem}</p>
              </div>
            </div>

            <div className="border-t border-surface-border/50 pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-muted">Médico</span>
                <span className="text-sm text-ink-primary font-medium">Dr(a). {medicamento.medico}</span>
              </div>
              {medicamento.farmacia && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-muted">Farmácia</span>
                  <span className="text-sm text-ink-primary font-medium">{medicamento.farmacia}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-muted">Data da receita</span>
                <span className="text-sm text-ink-primary font-medium">
                  {format(dataReceita, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-muted">Próxima renovação</span>
                <span className={`text-sm font-medium ${isUrgent ? "text-coral" : "text-ink-primary"}`}>
                  {format(dataRenovacao, "dd/MM/yyyy", { locale: ptBR })}
                  {!isUrgent && diasRestantes > 0 && (
                    <span className="ml-2 text-xs text-ink-muted font-normal">
                      ({diasRestantes} dias)
                    </span>
                  )}
                </span>
              </div>
              {medicamento.observacoes && (
                <div className="border-t border-surface-border/50 pt-4 mt-2">
                  <p className="text-sm text-ink-muted mb-1">Observações</p>
                  <p className="text-sm text-ink-primary">{medicamento.observacoes}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Histórico de renovações */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-medium text-ink-primary flex items-center gap-2">
                <Clock size={16} className="text-ink-muted" />
                Histórico de renovações
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/saude/medicamentos/renovacao/novo?medicamento_id=${id}`);
                }}
                className="flex items-center gap-1"
              >
                <Plus size={14} />
                Nova
              </Button>
            </div>

            {renovacoes.length === 0 ? (
              <div className="text-center py-8 text-ink-muted text-sm border border-dashed border-surface-border/50 rounded-xl">
                Nenhuma renovação registrada ainda
              </div>
            ) : (
              <div className="space-y-2">
                {renovacoes.map((ren, index) => (
                  <motion.div
                    key={ren.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-surface-border/50 hover:bg-surface-border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-border/50 flex items-center justify-center">
                        <Calendar size={14} className="text-ink-muted" />
                      </div>
                      <span className="text-sm text-ink-primary">
                        {format(new Date(ren.data), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {ren.anexo_url && (
                      <FileText size={16} className="text-steel-light" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}