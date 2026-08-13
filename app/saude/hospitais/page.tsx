"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Building2, Search, Plus, ChevronRight, 
  MapPin, Phone, Activity, FlaskConical, CalendarClock 
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HospitaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];
  const documentos = useLiveQuery(() => db.table("documents").toArray(), []) || [];
  const exames = useLiveQuery(() => db.table("exames").toArray(), []) || [];

  // Cruzamento relacional com documentos (cirurgias, prontuários, consultas) e exames
  const hospitaisComCruzamento = useMemo(() => {
    return hospitais.map((hospital) => {
      // Documentos vinculados a este hospital (via metadata hospital_id)
      const docsDoHospital = documentos.filter((d: any) => 
        d.metadata?.hospital_id === hospital.id
      );

      const cirurgias = docsDoHospital.filter((d: any) => d.type === 'cirurgia');
      const consultas = docsDoHospital.filter((d: any) => d.type === 'consulta' || d.type === 'prontuario');

      // Exames vinculados a este hospital
      const examesDoHospital = exames.filter((e: any) => e.hospital_id === hospital.id || e.laboratorio_id === hospital.id);

      return {
        ...hospital,
        cirurgiasCount: cirurgias.length,
        consultasCount: consultas.length,
        examesCount: examesDoHospital.length,
      };
    });
  }, [hospitais, documentos, exames]);

  const filteredHospitais = hospitaisComCruzamento.filter((h) =>
    h.nome.toLowerCase().includes(search.toLowerCase()) ||
    (h.endereco && h.endereco.toLowerCase().includes(search.toLowerCase()))
  );

  if (!hospitais) return <LoadingSkeleton />;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Vault Saúde</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Hospitais e Clínicas</h1>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por nome ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3.5">
          {filteredHospitais.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ice/10 text-ice">
                <Building2 size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhum hospital encontrado</p>
              <p className="mt-1 text-xs text-ink-muted">Cadastre unidades para centralizar cirurgias, exames e prontuários.</p>
            </div>
          ) : (
            filteredHospitais.map((hospital) => (
              <motion.div
                key={hospital.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/hospitais/editar?id=${hospital.id}`); }}
                className="flex w-full flex-col gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: "6px solid #38BDF8" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-ink-primary">{hospital.nome}</p>
                      <div className="mt-0.5 space-y-0.5 text-xs text-ink-muted">
                        {hospital.endereco && (
                          <p className="flex items-center gap-1 truncate">
                            <MapPin size={11} className="shrink-0 text-ink-faint" /> {hospital.endereco}
                          </p>
                        )}
                        {hospital.telefone && (
                          <p className="flex items-center gap-1">
                            <Phone size={11} className="shrink-0 text-ink-faint" /> {hospital.telefone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-faint self-center" />
                </div>

                {/* Tags de Resumo Relacional */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border/40 text-center">
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted">Cirurgias</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.cirurgiasCount}</p>
                  </div>
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted">Exames</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.examesCount}</p>
                  </div>
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted">Consultas</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.consultasCount}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => { trigger("vibrate"); router.push("/saude/hospitais/novo"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
            >
              <Plus size={16} /> Cadastrar Novo Hospital
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
