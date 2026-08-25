// app/saude/medicos/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Pill,
  Activity,
  Calendar,
  FileText,
  Building2,
  Phone,
  Edit3,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Hospital as HospitalIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useMedicos } from "@/hooks/useMedicos";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useConsultas } from "@/hooks/useConsultas";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { sugerirRenovacao } from "@/lib/health-insights";
import {
  ListPageHeader,
  ListSearch,
  ListSort,
  ListFilters,
  ListCard,
} from "@/components/list";
import type {
  Medico,
  Medicamento,
  Tratamento,
  Document,
  Consulta,
  Cirurgia,
  Hospital,
  LocalSaude,
} from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

type MedicoComMetadados = Medico & {
  medicamentosCount: number;
  consultasCount: number;
  cirurgiasCount: number;
  documentosCount: number;
  tratamentos: Array<Tratamento & { color: string }>;
  hospitais: Hospital[];
  locais: LocalSaude[];
  ultimaConsulta: Consulta | null;
  ultimoHospital: Hospital | null;
  temAlertaUrgente: boolean;
};

/* ============================================================
   CONFIGURAÇÕES DE ORDENAÇÃO
   ============================================================ */

type SortOption = "name" | "recent";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Nome" },
  { value: "recent", label: "Última consulta" },
];

/* ============================================================
   PÁGINA
   ============================================================ */

export default function MedicosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  const [filtroTratamento, setFiltroTratamento] = useState<string | null>(null);
  const [filtroHospital, setFiltroHospital] = useState<string | null>(null);
  const [filtroLocal, setFiltroLocal] = useState<string | null>(null);

  const { medicos = [] } = useMedicos();
  const { medicamentos = [] } = useMedicamentos();
  const { tratamentos = [] } = useTratamentos();
  const { consultas = [] } = useConsultas();
  const { cirurgias = [] } = useCirurgias();
  const { hospitais = [] } = useHospitais();
  const { locais = [] } = useLocais();
  const documentos = useLiveQuery(() => db.documents.toArray(), []) || [];

  const tratamentoMap = useMemo(() => new Map((tratamentos || []).map((t) => [t.id, t])), [tratamentos]);
  const hospitalMap = useMemo(() => new Map((hospitais || []).map((h) => [h.id, h])), [hospitais]);
  const localMap = useMemo(() => new Map((locais || []).map((l) => [l.id, l])), [locais]);

  /* ============================================================
     ENRIQUECIMENTO DOS MÉDICOS
     ============================================================ */

  const medicosComMetadados = useMemo<MedicoComMetadados[]>(() => {
    return (medicos || []).map((medico) => {
      const medsDoMedico = (medicamentos || []).filter(
        (m) => m?.medico_id === medico.id || m?.medico === medico.nome
      );

      const temAlertaUrgente = medsDoMedico.some((m) => {
        const statusRenovacao = sugerirRenovacao(m);
        return statusRenovacao.urgencia === "alta";
      });

      const tratamentoIdsSet = new Set<string>();
      medsDoMedico.forEach((m) => {
        if (m?.tratamento_ids && Array.isArray(m.tratamento_ids)) {
          m.tratamento_ids.forEach((id) => tratamentoIdsSet.add(id));
        }
      });

      const consultasDoMedico = (consultas || []).filter((c) => c?.medico_id === medico.id);
      const cirurgiasDoMedico = (cirurgias || []).filter((c) => c?.medico_id === medico.id);

      const docsDoMedico = (documentos || []).filter(
        (d) =>
          d?.metadata?.doctor_id === medico.id ||
          String(d?.metadata?.doctor || "").toLowerCase() === medico.nome.toLowerCase()
      );

      const hospitaisDiretos = (medico.hospital_ids || [])
        .map((hid) => hospitalMap.get(hid))
        .filter((h): h is Hospital => h !== undefined);

      const locaisDiretos = (medico.local_ids || [])
        .map((lid) => localMap.get(lid))
        .filter((l): l is LocalSaude => l !== undefined);

      const ultimaConsulta = consultasDoMedico.length > 0
        ? consultasDoMedico.reduce((a, b) => (a.data > b.data ? a : b))
        : null;

      const ultimoHospital = ultimaConsulta?.hospital_id
        ? hospitalMap.get(ultimaConsulta.hospital_id) || null
        : null;

      const tratamentosRelacionados = Array.from(tratamentoIdsSet)
        .map((id) => tratamentoMap.get(id))
        .filter((t): t is Tratamento => t !== undefined)
        .map((t) => ({
          ...t,
          color: t.cor || "#38BDF8",
        }));

      return {
        ...medico,
        medicamentosCount: medsDoMedico.length,
        consultasCount: consultasDoMedico.length,
        cirurgiasCount: cirurgiasDoMedico.length,
        documentosCount: docsDoMedico.length,
        tratamentos: tratamentosRelacionados,
        hospitais: hospitaisDiretos,
        locais: locaisDiretos,
        ultimaConsulta,
        ultimoHospital,
        temAlertaUrgente,
      };
    });
  }, [medicos, medicamentos, documentos, consultas, cirurgias, tratamentoMap, hospitalMap, localMap]);

  /* ============================================================
     FILTRAGEM E ORDENAÇÃO
     ============================================================ */

  const filteredMedicos = useMemo(() => {
    let result = medicosComMetadados || [];

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (med) =>
          med.nome.toLowerCase().includes(term) ||
          (med.especialidade && med.especialidade.toLowerCase().includes(term))
      );
    }

    if (filtroTratamento) {
      result = result.filter((med) =>
        med.tratamentos.some((t) => t.id === filtroTratamento)
      );
    }

    if (filtroHospital) {
      result = result.filter((med) =>
        med.hospitais.some((h) => h.id === filtroHospital)
      );
    }

    if (filtroLocal) {
      result = result.filter((med) =>
        med.locais.some((l) => l.id === filtroLocal)
      );
    }

    return result.sort((a, b) => {
      if (sortBy === "name") {
        return a.nome.localeCompare(b.nome);
      }
      const aDate = a.ultimaConsulta?.data || "";
      const bDate = b.ultimaConsulta?.data || "";
      return bDate.localeCompare(aDate);
    });
  }, [medicosComMetadados, search, filtroTratamento, filtroHospital, filtroLocal, sortBy]);

  /* ============================================================
     FILTROS PARA O HEADER
     ============================================================ */

  const tratamentosUnicos = useMemo(() => {
    const map = new Map<string, Tratamento & { color: string }>();
    (medicosComMetadados || []).forEach((med) => {
      (med.tratamentos || []).forEach((t) => map.set(t.id!, t));
    });
    return Array.from(map.values());
  }, [medicosComMetadados]);

  const hospitaisUnicos = useMemo(() => {
    const map = new Map<string, Hospital>();
    (medicosComMetadados || []).forEach((med) => {
      (med.hospitais || []).forEach((h) => map.set(h.id!, h));
    });
    return Array.from(map.values());
  }, [medicosComMetadados]);

  const locaisUnicos = useMemo(() => {
    const map = new Map<string, LocalSaude>();
    (medicosComMetadados || []).forEach((med) => {
      (med.locais || []).forEach((l) => map.set(l.id!, l));
    });
    return Array.from(map.values());
  }, [medicosComMetadados]);

  const handleSortChange = (value: string) => {
    trigger("vibrate");
    setSortBy(value as SortOption);
  };

  const handleClearFilters = () => {
    trigger("vibrate");
    setFiltroTratamento(null);
    setFiltroHospital(null);
    setFiltroLocal(null);
  };

  /* ============================================================
     LOADING
     ============================================================ */

  if (!medicos) return <CardListSkeleton />;

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="Médicos Prescritores"
          subtitle={`${filteredMedicos.length} profissionais`}
          badgeLabel="Rede de Apoio"
          badgeColor="text-ice"
          icon={<Stethoscope size={14} />}
          iconColor="text-ice"
        >
          <div className="flex items-center gap-2">
            <ListSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome ou especialidade..."
            />
            <ListSort
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={handleSortChange}
            />
          </div>

          <ListFilters onClear={handleClearFilters}>
            {tratamentosUnicos.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setFiltroTratamento(filtroTratamento === t.id ? null : t.id!);
                }}
                className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                  filtroTratamento === t.id
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
                style={{
                  borderColor: filtroTratamento === t.id ? t.color : undefined,
                  color: filtroTratamento === t.id ? t.color : undefined,
                }}
              >
                <Activity size={10} className="inline mr-1" />
                {t.nome}
              </button>
            ))}

            {hospitaisUnicos.slice(0, 2).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setFiltroHospital(filtroHospital === h.id ? null : h.id!);
                }}
                className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                  filtroHospital === h.id
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <HospitalIcon size={10} className="inline mr-1" />
                <span className="truncate max-w-[80px]">{h.nome}</span>
              </button>
            ))}

            {locaisUnicos.slice(0, 2).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  setFiltroLocal(filtroLocal === l.id ? null : l.id!);
                }}
                className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                  filtroLocal === l.id
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <MapPin size={10} className="inline mr-1" />
                <span className="truncate max-w-[80px]">{l.nome}</span>
              </button>
            ))}
          </ListFilters>
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredMedicos.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title={
                search || filtroTratamento || filtroHospital || filtroLocal
                  ? "Nenhum médico encontrado"
                  : "Nenhum médico cadastrado"
              }
              description={
                search || filtroTratamento || filtroHospital || filtroLocal
                  ? "Tente ajustar os filtros ou a busca."
                  : "Cadastre profissionais para gerenciar suas prescrições."
              }
            />
          ) : (
            filteredMedicos.map((medico, index) => {
              const primaryColor =
                medico.tratamentos.length > 0
                  ? medico.tratamentos[0].color
                  : "#38BDF8";

              return (
                <ListCard
                  key={medico.id}
                  id={medico.id!}
                  color={primaryColor}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/medicos/detalhes?id=${medico.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<Stethoscope size={22} />}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("vibrate");
                          router.push(`/saude/consultas/nova?medico_id=${medico.id}`);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-ice/20 bg-ice/5 px-3 py-1.5 text-[10px] font-semibold text-ice transition-all hover:bg-ice/10 active:scale-95"
                      >
                        <Calendar size={13} /> Agendar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("vibrate");
                          router.push(`/saude/medicos/editar?id=${medico.id}`);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-surface-border/40 bg-surface-raised px-3 py-1.5 text-[10px] font-medium text-ink-muted transition-all hover:bg-surface-border/30 active:scale-95"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("vibrate");
                          router.push(`/saude/medicos/detalhes?id=${medico.id}`);
                        }}
                        className="ml-auto flex items-center gap-1 rounded-xl bg-ice/10 px-3 py-1.5 text-[10px] font-semibold text-ink-primary transition-all hover:bg-ice/20 active:scale-95"
                      >
                        Ver Perfil <ChevronRight size={13} />
                      </button>
                    </>
                  }
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                      Dr(a). {medico.nome}
                    </h3>
                    {medico.especialidade && (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-ice/20 bg-ice/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ice">
                        {medico.especialidade}
                      </span>
                    )}
                    {medico.temAlertaUrgente && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-[9px] font-bold text-coral">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />
                        Alerta
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    {medico.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="text-ink-faint" />
                        {medico.telefone}
                      </span>
                    )}
                    {medico.crm && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-ink-faint">
                        CRM: {medico.crm}
                      </span>
                    )}
                    {medico.ultimoHospital && (
                      <span className="flex items-center gap-1 rounded-full bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                        <Building2 size={11} />
                        <span className="truncate max-w-[120px]">{medico.ultimoHospital.nome}</span>
                      </span>
                    )}
                    {medico.ultimaConsulta && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-ice" />
                        Última: {formatDateDisplay(medico.ultimaConsulta.data)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {medico.tratamentos.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 truncate rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase max-w-[100px]"
                        style={{
                          backgroundColor: `${t.color}15`,
                          borderColor: `${t.color}40`,
                          color: t.color,
                        }}
                      >
                        <Activity size={10} /> {t.nome}
                      </span>
                    ))}
                    {medico.tratamentos.length > 3 && (
                      <span className="text-[9px] text-ink-faint">+{medico.tratamentos.length - 3}</span>
                    )}

                    {medico.hospitais.length > 0 && (
                      <span className="inline-flex items-center gap-1 truncate rounded-md border px-2 py-0.5 text-[9px] font-medium text-ink-muted bg-surface-raised max-w-[120px]">
                        <Building2 size={10} /> {medico.hospitais.map(h => h.nome).join(', ')}
                      </span>
                    )}

                    {medico.locais.length > 0 && (
                      <span className="inline-flex items-center gap-1 truncate rounded-md border px-2 py-0.5 text-[9px] font-medium text-ink-muted bg-surface-raised max-w-[120px]">
                        <MapPin size={10} /> {medico.locais.map(l => l.nome).join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {medico.consultasCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ice/10 px-2 py-0.5 text-[10px] font-medium text-ice">
                        <Calendar size={12} /> {medico.consultasCount}
                      </span>
                    )}
                    {medico.cirurgiasCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-2 py-0.5 text-[10px] font-medium text-coral">
                        <Activity size={12} /> {medico.cirurgiasCount}
                      </span>
                    )}
                    {medico.medicamentosCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        <Pill size={12} /> {medico.medicamentosCount}
                      </span>
                    )}
                  </div>
                </ListCard>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}