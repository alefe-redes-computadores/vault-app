"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Stethoscope, Search, Plus, ChevronRight, 
  Pill, Activity, Calendar, FileText, Building2, X,
  Filter, Hospital
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// 🔧 CORES INLINE (temporário)
function getTreatmentColor(nome: string): string {
  const colors: Record<string, string> = {
    "tdah": "#8B5CF6",
    "ansiedade": "#F59E0B",
    "depressão": "#EF4444",
    "insônia": "#6366F1",
    "enxaqueca": "#8B5CF6",
    "neuropatia": "#EC4899",
    "hipertensão": "#EF4444",
    "colesterol": "#F59E0B",
    "diabetes": "#3B82F6",
    "tireoide": "#8B5CF6",
    "dor crônica": "#EC4899",
    "fibromialgia": "#F472B6",
    "asma": "#06B6D4",
    "dpoc": "#06B6D4",
    "refluxo": "#F59E0B",
    "gastrite": "#F59E0B",
    "transtorno bipolar": "#8B5CF6",
    "esquizofrenia": "#8B5CF6",
    "lúpus": "#EC4899",
    "esclerose múltipla": "#EC4899",
    "artrite reumatoide": "#EC4899",
    "câncer": "#EF4444",
    "obesidade": "#F59E0B",
    "alergia": "#06B6D4",
  };
  const lower = nome.toLowerCase();
  for (const [key, color] of Object.entries(colors)) {
    if (lower.includes(key)) return color;
  }
  return "#38BDF8";
}

export default function MedicosPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");
  
  // 🔧 FILTROS
  const [filtroTratamento, setFiltroTratamento] = useState<string | null>(null);
  const [filtroHospital, setFiltroHospital] = useState<string | null>(null);

  // Buscas relacionais
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const documentos = useLiveQuery(() => db.documents.toArray(), []) || [];
  const consultas = useLiveQuery(() => db.consultas.toArray(), []) || [];
  const cirurgias = useLiveQuery(() => db.cirurgias.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const tratamentoMap = useMemo(() => new Map(tratamentos.map(t => [t.id, t])), [tratamentos]);
  const hospitalMap = useMemo(() => new Map(hospitais.map(h => [h.id, h])), [hospitais]);

  const medicosComMetadados = useMemo(() => {
    return medicos.map((medico) => {
      // Medicamentos prescritos
      const medsDoMedico = medicamentos.filter(
        (m) => m.medico_id === medico.id || m.medico === medico.nome
      );
      
      // Tratamentos via medicamentos
      const tratamentoIdsSet = new Set<string>();
      medsDoMedico.forEach(m => {
        if (m.tratamento_ids && Array.isArray(m.tratamento_ids)) {
          m.tratamento_ids.forEach(id => tratamentoIdsSet.add(id));
        }
      });

      // Consultas e Cirurgias
      const consultasDoMedico = consultas.filter((c) => c.medico_id === medico.id);
      const cirurgiasDoMedico = cirurgias.filter((c) => c.medico_id === medico.id);
      
      // Documentos
      const docsDoMedico = documentos.filter((d: any) => 
        d.metadata?.doctor_id === medico.id || 
        d.metadata?.doctor?.toLowerCase() === medico.nome.toLowerCase()
      );

      // 🔧 COLETAR HOSPITAIS ÚNICOS (via consultas e cirurgias)
      const hospitalIdsSet = new Set<string>();
      consultasDoMedico.forEach(c => {
        if (c.hospital_id) hospitalIdsSet.add(c.hospital_id);
      });
      cirurgiasDoMedico.forEach(c => {
        if (c.hospital_id) hospitalIdsSet.add(c.hospital_id);
      });
      
      const hospitaisRelacionados = Array.from(hospitalIdsSet)
        .map(id => hospitalMap.get(id))
        .filter(Boolean);

      // Última consulta
      const ultimaConsulta = consultasDoMedico.length > 0 
        ? consultasDoMedico.reduce((a, b) => a.data > b.data ? a : b) 
        : null;

      // Último hospital (da última consulta ou cirurgia)
      const ultimoHospital = ultimaConsulta?.hospital_id 
        ? hospitalMap.get(ultimaConsulta.hospital_id) 
        : null;

      const tratamentosRelacionados = Array.from(tratamentoIdsSet)
        .map(id => tratamentoMap.get(id))
        .filter(Boolean)
        .map(t => ({ ...t, color: getTreatmentColor(t.nome) }));

      return {
        ...medico,
        medicamentosCount: medsDoMedico.length,
        consultasCount: consultasDoMedico.length,
        cirurgiasCount: cirurgiasDoMedico.length,
        documentosCount: docsDoMedico.length,
        tratamentos: tratamentosRelacionados,
        hospitais: hospitaisRelacionados,
        ultimaConsulta,
        ultimoHospital,
      };
    });
  }, [medicos, medicamentos, documentos, consultas, cirurgias, tratamentoMap, hospitalMap]);

  // 🔧 FILTROS CRUZADOS
  const filteredMedicos = useMemo(() => {
    let result = medicosComMetadados;

    // Filtro por nome/especialidade
    if (search) {
      result = result.filter((med) =>
        med.nome.toLowerCase().includes(search.toLowerCase()) ||
        (med.especialidade && med.especialidade.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // 🔧 Filtro por tratamento
    if (filtroTratamento) {
      result = result.filter((med) =>
        med.tratamentos.some(t => t.id === filtroTratamento)
      );
    }

    // 🔧 Filtro por hospital
    if (filtroHospital) {
      result = result.filter((med) =>
        med.hospitais.some(h => h.id === filtroHospital)
      );
    }

    // Ordenação alfabética
    return result.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [medicosComMetadados, search, filtroTratamento, filtroHospital]);

  // Listas para os filtros
  const tratamentosUnicos = useMemo(() => {
    const map = new Map();
    medicosComMetadados.forEach(med => {
      med.tratamentos.forEach(t => map.set(t.id, t));
    });
    return Array.from(map.values());
  }, [medicosComMetadados]);

  const hospitaisUnicos = useMemo(() => {
    const map = new Map();
    medicosComMetadados.forEach(med => {
      med.hospitais.forEach(h => map.set(h.id, h));
    });
    return Array.from(map.values());
  }, [medicosComMetadados]);

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

          {/* 🔧 FILTROS RÁPIDOS */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />
            
            {tratamentosUnicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tratamentosUnicos.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      trigger("vibrate");
                      setFiltroTratamento(filtroTratamento === t.id ? null : t.id);
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
                {tratamentosUnicos.length > 4 && (
                  <span className="text-[9px] font-medium text-ink-muted bg-surface-raised px-2 py-1 rounded-full">
                    +{tratamentosUnicos.length - 4}
                  </span>
                )}
              </div>
            )}

            {hospitaisUnicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-1">
                {hospitaisUnicos.slice(0, 2).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      trigger("vibrate");
                      setFiltroHospital(filtroHospital === h.id ? null : h.id);
                    }}
                    className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border transition-all ${
                      filtroHospital === h.id
                        ? "border-ice bg-ice/20 text-ice"
                        : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                    }`}
                  >
                    <Hospital size={10} className="inline mr-1" />
                    {h.nome.length > 12 ? h.nome.slice(0, 12) + "…" : h.nome}
                  </button>
                ))}
                {hospitaisUnicos.length > 2 && (
                  <span className="text-[9px] font-medium text-ink-muted bg-surface-raised px-2 py-1 rounded-full">
                    +{hospitaisUnicos.length - 2}
                  </span>
                )}
              </div>
            )}

            {(filtroTratamento || filtroHospital) && (
              <button
                onClick={() => {
                  trigger("vibrate");
                  setFiltroTratamento(null);
                  setFiltroHospital(null);
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
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ice/10 text-ice">
                <Stethoscope size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">
                {search || filtroTratamento || filtroHospital
                  ? "Nenhum médico encontrado com esses filtros"
                  : "Nenhum médico cadastrado"}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {search || filtroTratamento || filtroHospital
                  ? "Tente ajustar os filtros ou a busca"
                  : "Cadastre profissionais para gerenciar suas prescrições e atendimentos."}
              </p>
            </div>
          ) : (
            filteredMedicos.map((medico) => {
              const primaryColor = medico.tratamentos.length > 0 
                ? medico.tratamentos[0].color 
                : "#38BDF8";

              return (
                <motion.button
                  key={medico.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => { trigger("vibrate"); router.push(`/saude/medicos/detalhes?id=${medico.id}`); }}
                  className="flex w-full items-start gap-3.5 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden"
                  style={{ borderLeft: `6px solid ${primaryColor}` }}
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

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      {medico.telefone && <span>📞 {medico.telefone}</span>}
                      
                      {/* 🔧 ETIQUETA DO HOSPITAL */}
                      {medico.ultimoHospital && (
                        <span className="flex items-center gap-1 text-[10px] font-medium bg-coral/10 text-coral px-2 py-0.5 rounded-full">
                          <Building2 size={11} />
                          {medico.ultimoHospital.nome}
                        </span>
                      )}

                      {medico.ultimaConsulta && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-ice" />
                          Última: {new Date(medico.ultimaConsulta.data).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {medico.tratamentos.map((t: any) => (
                        <span 
                          key={t.id} 
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${t.color}20`,
                            borderColor: `${t.color}40`,
                            color: t.color,
                          }}
                        >
                          <Activity size={10} /> {t.nome}
                        </span>
                      ))}

                      {medico.consultasCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted">
                          <Calendar size={11} className="text-ice" /> {medico.consultasCount} cons.
                        </span>
                      )}

                      {medico.cirurgiasCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted">
                          <Activity size={11} className="text-coral" /> {medico.cirurgiasCount} cirurg.
                        </span>
                      )}

                      {medico.medicamentosCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-raised text-ink-muted">
                          <Pill size={11} className="text-emerald-400" /> {medico.medicamentosCount} med(s)
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