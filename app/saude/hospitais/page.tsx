// app/saude/hospitais/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Hospital as HospitalIcon,
  Search,
  ChevronRight,
  MapPin,
  Phone,
  Edit3,
  Calendar,
  Activity,
  Stethoscope,
  Syringe,
  FlaskConical,
  FileText,
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
        (e: Exame) => e.local_id === hospital.id // Mantido local_id por segurança; ajustar se houver hospital_id
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
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hospitaisComCruzamento, search]);

  const cor = "#38BDF8";

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">REDE DE APOIO</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Hospitais</h1>
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
            <EmptyState
              icon={HospitalIcon}
              title="Nenhum hospital encontrado"
              description={search ? "Tente ajustar a busca." : "Cadastre hospitais para centralizar cirurgias, consultas e exames."}
            />
          ) : (
            filteredHospitais.map((hospital) => (
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
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                      style={{ backgroundColor: `${cor}15`, color: cor, borderColor: `${cor}30` }}
                    >
                      <HospitalIcon size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-lg font-bold text-ink-primary uppercase">{hospital.nome}</p>
                        <span className="shrink-0 rounded-full border border-ice/30 bg-ice/10 px-2 py-0.5 text-[9px] font-bold uppercase text-ice">Hospital</span>
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
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/40 text-center sm:grid-cols-4">
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center justify-center gap-1">
                      <Syringe size={10} className="text-coral" /> Cirurgias
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.cirurgiasCount}</p>
                  </div>
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center justify-center gap-1">
                      <FlaskConical size={10} className="text-violet-400" /> Exames
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.examesCount}</p>
                  </div>
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center justify-center gap-1">
                      <Stethoscope size={10} className="text-ice" /> Consultas
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.consultasCount}</p>
                  </div>
                  <div className="rounded-xl bg-surface-raised/60 p-2">
                    <p className="text-[10px] uppercase font-mono text-ink-muted flex items-center justify-center gap-1">
                      <Activity size={10} className="text-emerald-400" /> Médicos
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">{hospital.medicosCount}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}