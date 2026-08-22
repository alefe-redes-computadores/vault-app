// app/saude/medicos/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Stethoscope,
  Search,
  ChevronRight,
  Pill,
  Activity,
  Calendar,
  FileText,
  Building2,
  X,
  Filter,
  Phone,
  Edit3,
  Clock,
  User,
  MapPin,
} from "lucide-react";
import { Hospital as HospitalIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { useMedicos } from "@/hooks/useMedicos";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useConsultas } from "@/hooks/useConsultas";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { sugerirRenovacao } from "@/lib/health-insights";
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

export default function MedicosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

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

  const medicoMap = useMemo(() => new Map(medicos.map((m) => [m.id, m])), [medicos]);

  const medicosFiltrados = useMemo<Medico[]>(() => {
    return medicos || [];
  }, [medicos]);

  const tratamentoMap = useMemo(() => new Map((tratamentos || []).map((t) => [t.id, t])), [tratamentos]);
  const hospitalMap = useMemo(() => new Map((hospitais || []).map((h) => [h.id, h])), [hospitais]);
  const localMap = useMemo(() => new Map((locais || []).map((l) => [l.id, l])), [locais]);

  const medicosComMetadados = useMemo<MedicoComMetadados[]>(() => {
    return (medicosFiltrados || []).map((medico) => {
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
  }, [medicosFiltrados, medicamentos, documentos, consultas, cirurgias, tratamentoMap, hospitalMap, localMap]);

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

    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [medicosComMetadados, search, filtroTratamento, filtroHospital, filtroLocal]);

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

  if (!medicos) return <CardListSkeleton />;

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
              className="border-surface-border/50 bg-surface-raised pl-9 text-sm"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />

            {tratamentosUnicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tratamentosUnicos.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      trigger("vibrate");
                      setFiltroTratamento(filtroTratamento === t.id ? null : t.id!);
                    }}
                    className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all ${
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
              </div>
            )}

            {hospitaisUnicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-1">
                {hospitaisUnicos.slice(0, 2).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      trigger("vibrate");
                      setFiltroHospital(filtroHospital === h.id ? null : h.id!);
                    }}
                    className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all ${
                      filtroHospital === h.id
                        ? "border-ice bg-ice/20 text-ice"
                        : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                    }`}
                  >
                    <HospitalIcon size={10} className="inline mr-1" />
                    {h.nome.length > 12 ? h.nome.slice(0, 12) + "…" : h.nome}
                  </button>
                ))}
              </div>
            )}

            {locaisUnicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-1">
                {locaisUnicos.slice(0, 2).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      trigger("vibrate");
                      setFiltroLocal(filtroLocal === l.id ? null : l.id!);
                    }}
                    className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all ${
                      filtroLocal === l.id
                        ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                        : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                    }`}
                  >
                    <MapPin size={10} className="inline mr-1" />
                    {l.nome.length > 12 ? l.nome.slice(0, 12) + "…" : l.nome}
                  </button>
                ))}
              </div>
            )}

            {(filtroTratamento || filtroHospital || filtroLocal) && (
              <button
                onClick={() => {
                  trigger("vibrate");
                  setFiltroTratamento(null);
                  setFiltroHospital(null);
                  setFiltroLocal(null);
                }}
                className="text-[9px] font-medium text-coral bg-coral/10 px-2 py-1 rounded-full flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredMedicos.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title={search || filtroTratamento || filtroHospital || filtroLocal ? "Nenhum médico encontrado" : "Nenhum médico cadastrado"}
              description={search || filtroTratamento || filtroHospital || filtroLocal ? "Tente ajustar os filtros ou a busca." : "Cadastre profissionais para gerenciar suas prescrições."}
            />
          ) : (
            filteredMedicos.map((medico) => {
              const primaryColor =
                medico.tratamentos.length > 0
                  ? medico.tratamentos[0].color
                  : "#38BDF8";

              return (
                <motion.div
                  key={medico.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-[24px] border border-surface-border/50 bg-surface p-5 shadow-sm transition-all hover:border-surface-border/80 hover:bg-surface-raised/30 active:scale-[0.99] relative overflow-hidden"
                  style={{ borderLeft: `6px solid ${primaryColor}` }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      {/* ÍCONE SVG DINÂMICO UNIFICADO */}
                      <div 
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ml-0.5"
                        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}
                      >
                        <Stethoscope size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="truncate text-lg font-bold text-ink-primary">
                            Dr(a). {medico.nome}
                          </h2>
                          {medico.especialidade && (
                            <span className="shrink-0 rounded-full border border-ice/20 bg-ice/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ice">
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
                              {medico.ultimoHospital.nome}
                            </span>
                          )}
                          {medico.ultimaConsulta && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-ice" />
                              Última: {formatDateDisplay(medico.ultimaConsulta.data)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-surface-border/30 pt-3">
                      {medico.tratamentos.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase"
                          style={{
                            backgroundColor: `${t.color}15`,
                            borderColor: `${t.color}40`,
                            color: t.color,
                          }}
                        >
                          <Activity size={10} /> {t.nome}
                        </span>
                      ))}

                      {medico.hospitais.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-medium text-ink-muted bg-surface-raised">
                          <Building2 size={10} /> {medico.hospitais.map(h => h.nome).join(', ')}
                        </span>
                      )}

                      {medico.locais.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-medium text-ink-muted bg-surface-raised">
                          <MapPin size={10} /> {medico.locais.map(l => l.nome).join(', ')}
                        </span>
                      )}

                      <div className="ml-auto flex flex-wrap items-center gap-2">
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
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
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
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("vibrate");
                          router.push(`/saude/medicos/detalhes?id=${medico.id}`);
                        }}
                        className="ml-auto flex items-center gap-1 rounded-xl bg-ice/10 px-3 py-1.5 text-[10px] font-semibold text-ink-primary transition-all hover:bg-ice/20 active:scale-95"
                      >
                        Ver Perfil <ChevronRight size={13} />
                      </button>
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
