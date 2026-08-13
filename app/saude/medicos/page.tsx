"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Stethoscope, Search, Plus, ChevronRight, 
  Building2, Pill, Activity, CalendarClock, FileText 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function MedicosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // 1. Buscas relacionais em tempo real via Dexie
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const documentos = useLiveQuery(() => db.table("documents").toArray(), []) || [];

  // 2. Mapeamentos relacionais cruzados
  const tratamentoMap = useMemo(() => new Map(tratamentos.map(t => [t.id, t])), [tratamentos]);

  const medicosComMetadados = useMemo(() => {
    return medicos.map((medico) => {
      // Medicamentos prescritos por este médico
      const medsDoMedico = medicamentos.filter((m) => m.medico_id === medico.id || m.medico === medico.nome);
      
      // Identificar tratamentos associados através dos medicamentos ou documentos
      const tratamentoIdsSet = new Set<string>();
      medsDoMedico.forEach(m => {
        if (m.tratamento_id) tratamentoIdsSet.add(m.tratamento_id);
      });

      // Documentos/Consultas associadas a este médico
      const docsDoMedico = documentos.filter((d: any) => 
        d.metadata?.doctor_id === medico.id || 
        d.metadata?.doctor?.toLowerCase() === medico.nome.toLowerCase()
      );

      const tratamentosRelacionados = Array.from(tratamentoIdsSet)
        .map(id => tratamentoMap.get(id))
        .filter(Boolean);

      return {
        ...medico,
        medicamentosCount: medsDoMedico.length,
        documentosCount: docsDoMedico.length,
        tratamentos: tratamentosRelacionados,
      };
    });
  }, [medicos, medicamentos, documentos, tratamentoMap]);

  const filteredMedicos = medicosComMetadados.filter((med) =>
    med.nome.toLowerCase().includes(search.toLowerCase()) ||
    (med.especialidade && med.especialidade.toLowerCase().includes(search.toLowerCase()))
  );

  if (!medicos) return <LoadingSkeleton />;

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Rede de Apoio</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Médicos Prescritores</h1>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredMedicos.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ice/10 text-ice">
                <Stethoscope size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhum médico encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastre profissionais para gerenciar suas prescrições.</p>
            </div>
          ) : (
            filteredMedicos.map((medico) => {
              // Pega a cor do primeiro tratamento associado para estilizar a borda lateral do card
              const primeiraCorTratamento = medico.tratamentos[0]?.cor || "#38BDF8";

              return (
                <motion.button
                  key={medico.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/editar?id=${medico.id}`); }}
                  className="flex w-full items-start gap-3.5 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden"
                  style={{ borderLeft: `6px solid ${primeiraCorTratamento}` }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                    <Stethoscope size={22} className="text-ice" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-semibold text-ink-primary">{medico.nome}</p>
                      {medico.especialidade && (
                        <span className="shrink-0 rounded-full border border-ice/20 bg-ice/10 px-2.5 py-0.5 text-[10px] font-semibold text-ice uppercase tracking-wide">
                          {medico.especialidade}
                        </span>
                      )}
                    </div>

                    {/* Contatos Básicos */}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      {medico.telefone && <span>📞 {medico.telefone}</span>}
                    </div>

                    {/* Tags de Cruzamento Relacional (Tratamentos e Prescrições) */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {medico.tratamentos.map((t: any) => (
                        <span 
                          key={t.id} 
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border"
                          style={{ backgroundColor: `${t.cor || '#8B5CF6'}15`, borderColor: `${t.cor || '#8B5CF6'}30`, color: t.cor || '#8B5CF6' }}
                        >
                          <Activity size={10} /> {t.nome}
                        </span>
                      ))}

                      {medico.medicamentosCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted">
                          <Pill size={11} className="text-ice" /> {medico.medicamentosCount} med(s)
                        </span>
                      )}

                      {medico.documentosCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted">
                          <FileText size={11} className="text-amber-400" /> {medico.documentosCount} doc(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
                </motion.button>
              );
            })
          )}

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => { trigger("vibrate"); router.push("/saude/medicos/novo"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
            >
              <Plus size={16} /> Cadastrar Novo Médico
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
