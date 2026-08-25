// app/saude/hospitais/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Hospital as HospitalIcon,
  MapPin,
  Phone,
  Edit3,
  Calendar,
  Activity,
  Stethoscope,
  Syringe,
  FlaskConical,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useHospitais } from "@/hooks/useHospitais";
import { useConsultas } from "@/hooks/useConsultas";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useExames } from "@/hooks/useExames";
import { useMedicos } from "@/hooks/useMedicos";
import {
  ListPageHeader,
  ListSearch,
  ListCard,
} from "@/components/list";
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

  const COR = "#38BDF8";

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

  if (!hospitais || !consultas || !cirurgias || !exames || !medicos) {
    return <CardListSkeleton />;
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Hospitais"
          badgeLabel="REDE DE APOIO"
          badgeColor="text-ice"
          icon={<HospitalIcon size={14} />}
          iconColor="text-ice"
        >
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou endereço..."
          />
        </ListPageHeader>

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
              <ListCard
                key={hospital.id}
                id={hospital.id!}
                color={COR}
                onClick={() => {
                  trigger("vibrate");
                  router.push(`/saude/hospitais/detalhes?id=${hospital.id}`);
                }}
                delay={index * 0.025}
                icon={<HospitalIcon size={22} />}
                actions={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      trigger("vibrate");
                      router.push(`/saude/hospitais/editar?id=${hospital.id}`);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted transition-colors hover:text-ice active:scale-95"
                    aria-label={`Editar ${hospital.nome}`}
                  >
                    <Edit3 size={14} />
                  </button>
                }
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold uppercase text-ink-primary">
                    {hospital.nome}
                  </h3>
                  <span className="shrink-0 whitespace-nowrap text-[9px] font-bold uppercase rounded-full border border-ice/30 bg-ice/10 px-2 py-0.5 text-ice">
                    Hospital
                  </span>
                </div>

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

                {hospital.ultimoAtendimento && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-muted">
                    <Calendar size={12} className="text-ice" />
                    Último atendimento: {formatDateDisplay(hospital.ultimoAtendimento.data)}
                  </div>
                )}

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
              </ListCard>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}