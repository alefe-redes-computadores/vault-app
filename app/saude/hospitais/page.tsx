// app/saude/hospitais/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Search,
  ChevronRight,
  MapPin,
  Phone,
  Edit3,
  Filter,
  X,
  Calendar,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { useHospitais } from "@/hooks/useHospitais";
import { useConsultas } from "@/hooks/useConsultas";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useExames } from "@/hooks/useExames";
import { useMedicos } from "@/hooks/useMedicos";
import type { Hospital, Consulta, Cirurgia, Exame, Medico } from "@/lib/types";

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

type HospitalComCruzamento = Hospital & {
  cirurgiasCount: number;
  consultasCount: number;
  examesCount: number;
  medicosCount: number;
  ultimoAtendimento: Consulta | null;
};

export default function HospitaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "hospital" | "clinica">("todos");

  const { hospitais = [] } = useHospitais();
  const { consultas = [] } = useConsultas();
  const { cirurgias = [] } = useCirurgias();
  const { exames = [] } = useExames();
  const { medicos = [] } = useMedicos();

  const hospitaisComCruzamento = useMemo<HospitalComCruzamento[]>(() => {
    return hospitais.map((hospital) => {
      const cirurgiasDoHospital = cirurgias.filter(
        (c: Cirurgia) => c.hospital_id === hospital.id
      );

      const consultasDoHospital = consultas.filter(
        (c: Consulta) => c.hospital_id === hospital.id
      );

      const examesDoHospital = exames.filter(
        (e: Exame) => e.hospital_id === hospital.id || e.laboratorio_id === hospital.id
      );

      const medicoIds = new Set(
        consultasDoHospital.map((c) => c.medico_id).filter((id): id is string => Boolean(id))
      );
      const medicosDoHospital = medicos.filter((m: Medico) => m.id && medicoIds.has(m.id));

      const ultimoAtendimento = consultasDoHospital.length > 0
        ? [...consultasDoHospital].sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0]
        : null;

      return {
        ...hospital,
        cirurgiasCount: cirurgiasDoHospital.length,
        consultasCount: consultasDoHospital.length,
        examesCount: examesDoHospital.length,
        medicosCount: medicosDoHospital.length,
        ultimoAtendimento,
      };
    });
  }, [hospitais, cirurgias, consultas, exames, medicos]);

  const filteredHospitais = useMemo(() => {
    let result = hospitaisComCruzamento;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.nome.toLowerCase().includes(term) ||
          (h.endereco && h.endereco.toLowerCase().includes(term))
      );
    }

    if (filtroTipo !== "todos") {
      result = result.filter((h) => h.tipo === filtroTipo);
    }

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hospitaisComCruzamento, search, filtroTipo]);

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised active:scale-95"
              aria-label="Voltar"
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

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />

            <button
              onClick={() => { trigger("vibrate"); setFiltroTipo(filtroTipo === "hospital" ? "todos" : "hospital"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroTipo === "hospital"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Hospitais
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroTipo(filtroTipo === "clinica" ? "todos" : "clinica"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroTipo === "clinica"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Clínicas
            </button>

            {filtroTipo !== "todos" && (
              <button
                onClick={() => { trigger("vibrate"); setFiltroTipo("todos"); }}
                className="text-[10px] font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3.5">
          {filteredHospitais.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhum hospital encontrado"
              description={
                search || filtroTipo !== "todos"
                  ? "Tente ajustar os filtros aplicados."
                  : "Cadastre unidades para centralizar cirurgias, exames e prontuários."
              }
              actionLabel="Novo Hospital"
              onAction={() => router.push("/saude/hospitais/novo")}
            />
          ) : (
            filteredHospitais.map((hospital) => {
              const cor = hospital.tipo === "clinica" ? "#34D399" : "#38BDF8";
              return (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/hospitais/detalhes?id=${hospital.id}`); }}
                  className="flex w-full flex-col gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                  style={{ borderLeft: `6px solid ${cor}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold text-ink-primary">{hospital.nome}</p>
                          {hospital.tipo && (
                            <span className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              hospital.tipo === "clinica"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                : "border-ice/30 bg-ice/10 text-ice"
                            }`}>
                              {hospital.tipo === "clinica" ? "Clínica" : "Hospital"}
                            </span>
                          )}
                        </div>
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
                    <div className="flex items-center gap-2 self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("vibrate");
                          router.push(`/saude/hospitais/editar?id=${hospital.id}`);
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted hover:text-ice transition-colors"
                        aria-label="Editar hospital"
                      >
                        <Edit3 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-ink-faint" />
                    </div>
                  </div>

                  {hospital.ultimoAtendimento && (
                    <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                      <Calendar size={12} className="text-ice" />
                      Último atendimento: {formatDateDisplay(hospital.ultimoAtendimento.data)}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-surface-border/40 text-center">
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
                    <div className="rounded-xl bg-surface-raised/60 p-2">
                      <p className="text-[10px] uppercase font-mono text-ink-muted">Médicos</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.medicosCount}</p>
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