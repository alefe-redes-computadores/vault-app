"use client";


import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pill, Calendar, Plus, FileText } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageTransition } from "@/components/PageTransition";

export default function MedicamentoDetailPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

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

  return (
    <PageTransition>
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
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate max-w-[200px]">
                {medicamento.nome}
              </h1>
            </div>
          </div>
        </header>

        <section className="px-5 pt-6 space-y-6">
          {/* Card do medicamento */}
          <div className="rounded-card border border-surface-border bg-surface p-6 shadow-vault">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-steel-dark/40">
                <Pill size={24} className="text-steel-light" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-primary">
                  {medicamento.nome}
                </h2>
                <p className="text-sm text-ink-muted">{medicamento.dosagem}</p>
              </div>
            </div>

            <div className="border-t border-surface-border pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-ink-muted">Médico</span>
                <span className="text-sm text-ink-primary font-medium">Dr(a). {medicamento.medico}</span>
              </div>
              {medicamento.farmacia && (
                <div className="flex justify-between">
                  <span className="text-sm text-ink-muted">Farmácia</span>
                  <span className="text-sm text-ink-primary font-medium">{medicamento.farmacia}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-ink-muted">Data da receita</span>
                <span className="text-sm text-ink-primary font-medium">
                  {format(new Date(medicamento.data_receita), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ink-muted">Próxima renovação</span>
                <span className="text-sm text-ink-primary font-medium">
                  {format(new Date(medicamento.proxima_renovacao), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              {medicamento.observacoes && (
                <div className="border-t border-surface-border pt-4 mt-2">
                  <p className="text-sm text-ink-muted mb-1">Observações</p>
                  <p className="text-sm text-ink-primary">{medicamento.observacoes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de renovações */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-medium text-ink-primary">
                Histórico de renovações
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/saude/medicamentos/${id}/renovacao/novo`);
                }}
              >
                <Plus size={14} className="mr-1" />
                Nova
              </Button>
            </div>

            {renovacoes.length === 0 ? (
              <div className="text-center py-8 text-ink-muted text-sm">
                Nenhuma renovação registrada ainda
              </div>
            ) : (
              <div className="space-y-2">
                {renovacoes.map((ren) => (
                  <div
                    key={ren.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-surface-border"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-ink-muted" />
                      <span className="text-sm text-ink-primary">
                        {format(new Date(ren.data), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {ren.anexo_url && (
                      <FileText size={16} className="text-steel-light" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}