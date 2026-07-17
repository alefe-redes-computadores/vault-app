"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Pill, Plus, AlertCircle } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MedicamentosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []);

  const getProximaRenovacao = (data: string) => {
    const hoje = new Date();
    const renovacao = new Date(data);
    const diff = Math.ceil((renovacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <main className="min-h-screen bg-void pb-28">
      <header className="glass-header sticky top-0 z-10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              trigger("vibrate");
              router.back();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised active:scale-[0.98]"
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center mb-4">
              <Pill size={32} className="text-ink-muted" />
            </div>
            <h3 className="font-display text-lg text-ink-primary">Nenhum medicamento</h3>
            <p className="text-sm text-ink-muted mt-1">
              Comece cadastrando suas receitas e medicamentos
            </p>
          </div>
        ) : (
          medicamentos?.map((med) => {
            const dias = getProximaRenovacao(med.proxima_renovacao);
            const isUrgent = dias < 7;

            return (
              <div
                key={med.id}
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/saude/medicamentos/${med.id}`);
                }}
                className={`rounded-card border p-4 bg-surface shadow-vault active:scale-[0.98] transition-all cursor-pointer ${
                  isUrgent ? "border-coral/40" : "border-surface-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      isUrgent ? "bg-coral/20" : "bg-steel-dark/40"
                    }`}>
                      <Pill size={18} className={isUrgent ? "text-coral" : "text-steel-light"} />
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
                      {isUrgent ? `${dias} dias` : `${dias} dias`}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      Renova: {format(new Date(med.proxima_renovacao), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}