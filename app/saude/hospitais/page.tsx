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
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { useHospitais } from "@/hooks/useHospitais";
import { useConsultas } from "@/hooks/useConsultas";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useExames } from "@/hooks/useExames";
import { useMedicos } from "@/hooks/useMedicos";
import type { Hospital, Consulta, Cirurgia, Exame, Medico } from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

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

/* ============================================================
   PÁGINA
   ============================================================ */

export default function HospitaisPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { hospitais = [] } = useHospitais();
  const { consultas = [] } = useConsultas();
  const { cirurgias = [] } = useCirurgias();
  const { exames = [] } = useExames();
  const { medicos = [] } = useMedicos();

  const COR = "#38BDF8";

  /* ============================================================
     ENRIQUECIMENTO DOS HOSPITAIS
     ============================================================ */

  const hospitaisComCruzamento = useMemo<HospitalComCruzamento[]>(() => {
    return hospitais.map((hospital) => {
      const cirurgiasDoHospital = cirurgias.filter(
        (c: Cirurgia) => c.hospital_id === hospital.id
      );
      const consultasDoHospital = consultas.filter(
        (c: Consulta) => c.hospital_id === hospital.id
      );
      const examesDoHospital = exames.filter(
        (e: Exame) => e.local_id === hospital.id
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

  /* ============================================================
     FILTRAGEM
     ============================================================ */

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

  /* ============================================================
     LOADING
     ============================================================ */

  if (!hospitais || !consultas || !cirurgias || !exames || !medicos) {
    return <CardListSkeleton />;
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        {/* ======================================================
            HEADER
            ====================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">REDE DE APOIO</p>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">Hospitais</h1>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              BUSCA
              ---------------------------------------------------- */}

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por nome ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-2xl bg-surface-raised/60 pl-9 text-sm"
            />
          </div>
        </header>

        {/* ======================================================
            LISTA
            ====================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          {filteredHospitais.length === 0 ? (
            <EmptyState
              icon={HospitalIcon}
              title="Nenhum hospital encontrado"
              description={
                search
                  ? "Não encontramos hospitais para essa busca."
                  : "Cadastre hospitais para centralizar cirurgias, consultas e exames."
              }
            />
          ) : (
            filteredHospitais.map((hospital, index) => (
              <motion.article
                key={hospital.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
                className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
                style={{
                  borderColor: `${COR}40`,
                  borderLeft: `6px solid ${COR}`,
                }}
              >
                <div className="p-4 pl-5">
                  <button
                    type="button"
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/hospitais/detalhes?id=${hospital.id}`);
                    }}
                    className="flex w-full items-start gap-3.5 text-left outline-none"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                      style={{
                        backgroundColor: `${COR}15`,
                        borderColor: `${COR}30`,
                        color: COR,
                      }}
                    >
                      <HospitalIcon size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                          {hospital.nome}
                        </h3>
                        <span className="shrink-0 whitespace-nowrap text-[9px] font-bold uppercase rounded-full border border-ice/30 bg-ice/10 px-2 py-0.5 text-ice">
                          Hospital
                        </span>
                      </div>

                      {/* Endereço e telefone */}

                      <div className="mt-1 space-y-0.5 text-xs text-ink-muted">
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

                      {/* Último atendimento */}

                      {hospital.ultimoAtendimento && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-muted">
                          <Calendar size={12} className="text-ice" />
                          Último atendimento: {formatDateDisplay(hospital.ultimoAtendimento.data)}
                        </div>
                      )}

                      {/* Métricas em grid */}

                      <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/40 text-center sm:grid-cols-4">
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

                      {/* Botão Editar (acessível) */}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("vibrate");
                          router.push(`/saude/hospitais/editar?id=${hospital.id}`);
                        }}
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-ice"
                        aria-label={`Editar ${hospital.nome}`}
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>

                    <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
                  </button>
                </div>
              </motion.article>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}