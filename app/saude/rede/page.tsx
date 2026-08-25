// app/saude/rede/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Stethoscope,
  Pill,
  Building2,
  Phone,
  MapPin,
  ChevronRight,
  User,
  Activity,
  Calendar,
  FlaskConical,
  Syringe,
  FolderHeart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useTratamentos } from "@/hooks/useTratamentos";
import { useConsultas } from "@/hooks/useConsultas";
import { useExames } from "@/hooks/useExames";
import { useCirurgias } from "@/hooks/useCirurgias";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { usePersons } from "@/hooks/usePersons";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { Input } from "@/components/ui/Input";
import { sugerirRenovacao, isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";
import type { 
  Medico, 
  Farmacia, 
  Hospital, 
  Medicamento, 
  Tratamento, 
  Consulta, 
  Exame, 
  Cirurgia, 
  Renovacao,
  Person
} from "@/lib/types";

type TabType = "visao-geral" | "medicos" | "farmacias" | "hospitais" | "tratamentos";

type AlertaRede = {
  tipo: 'estoque' | 'receita' | 'consulta' | 'exame' | 'cirurgia';
  mensagem: string;
  urgencia: 'alta' | 'media' | 'baixa';
  link: string;
};

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function RedeSaudePage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activePersonId } = useActivePersonId();
  
  const { medicos = [] } = useMedicos();
  const { farmacias = [] } = useFarmacias();
  const { hospitais = [] } = useHospitais();
  const { medicamentos = [] } = useMedicamentos();
  const { tratamentos = [] } = useTratamentos();
  const { consultas = [] } = useConsultas();
  const { exames = [] } = useExames();
  const { cirurgias = [] } = useCirurgias();
  const { renovacoes = [] } = useRenovacoes();
  const persons = usePersons() as Person[];

  const [search, setSearch] = useState("");

  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || "visao-geral");

  const selectedPersonId = activePersonId || "";

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    trigger("vibrate");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/saude/rede?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const filteredMedicamentos = useMemo(() => {
    return (medicamentos || []).filter((m: Medicamento) => !selectedPersonId || !m.person_id || m.person_id === selectedPersonId);
  }, [medicamentos, selectedPersonId]);

  const filteredTratamentos = useMemo(() => {
    return (tratamentos || []).filter((t: Tratamento) => !selectedPersonId || !t.person_id || t.person_id === selectedPersonId);
  }, [tratamentos, selectedPersonId]);

  const filteredConsultas = useMemo(() => {
    return (consultas || []).filter((c: Consulta) => !selectedPersonId || !c.person_id || c.person_id === selectedPersonId);
  }, [consultas, selectedPersonId]);

  const filteredExames = useMemo(() => {
    return (exames || []).filter((e: Exame) => !selectedPersonId || !e.person_id || e.person_id === selectedPersonId);
  }, [exames, selectedPersonId]);

  const filteredCirurgias = useMemo(() => {
    return (cirurgias || []).filter((c: Cirurgia) => !selectedPersonId || !c.person_id || c.person_id === selectedPersonId);
  }, [cirurgias, selectedPersonId]);

  const filteredRenovacoes = useMemo(() => {
    const medsIds = new Set(filteredMedicamentos.map(m => m.id).filter((id): id is string => Boolean(id)));
    return (renovacoes || []).filter((r: Renovacao) => !selectedPersonId || !r.person_id || r.person_id === selectedPersonId || (r.medicamento_id && medsIds.has(r.medicamento_id)));
  }, [renovacoes, selectedPersonId, filteredMedicamentos]);

  const filteredMedicos = useMemo(() => {
    const linked = new Set([
      ...filteredConsultas.map(c => c.medico_id),
      ...filteredCirurgias.map(c => c.medico_id),
      ...filteredMedicamentos.map(m => m.medico_id)
    ].filter((id): id is string => Boolean(id)));

    return (medicos || []).filter((m: Medico) => m.id && linked.has(m.id));
  }, [medicos, filteredConsultas, filteredCirurgias, filteredMedicamentos]);

  const filteredFarmacias = useMemo(() => {
    const linked = new Set([
      ...filteredMedicamentos.map(m => m.farmacia_id),
      ...filteredRenovacoes.map(r => r.farmacia_id)
    ].filter((id): id is string => Boolean(id)));

    return (farmacias || []).filter((f: Farmacia) => f.id && linked.has(f.id));
  }, [farmacias, filteredMedicamentos, filteredRenovacoes]);

  const filteredHospitais = useMemo(() => {
    const linked = new Set([
      ...filteredConsultas.map(c => c.hospital_id),
      ...filteredCirurgias.map(c => c.hospital_id),
      ...filteredMedicamentos.map(m => m.local_id)
    ].filter((id): id is string => Boolean(id)));

    return (hospitais || []).filter((h: Hospital) => h.id && linked.has(h.id));
  }, [hospitais, filteredConsultas, filteredCirurgias, filteredMedicamentos]);

  const alertas = useMemo(() => {
    const alerts: AlertaRede[] = [];

    filteredMedicamentos.forEach((med: Medicamento) => {
      const insight = sugerirRenovacao(med);
      if (insight.deveRenovar && med.id) {
        alerts.push({
          tipo: 'estoque',
          mensagem: insight.mensagem,
          urgencia: insight.urgencia === 'nenhuma' ? 'baixa' : insight.urgencia,
          link: `/saude/medicamentos/detalhes?id=${med.id}`,
        });
      }

      if (med.proxima_renovacao && isReceitaVencidaSegura(med.proxima_renovacao) && med.id) {
        alerts.push({
          tipo: 'receita',
          mensagem: `Receita de ${med.nome} venceu em ${formatDateDisplay(med.proxima_renovacao)}`,
          urgencia: 'alta',
          link: `/saude/medicamentos/detalhes?id=${med.id}`,
        });
      }
    });

    const hoje = new Date();
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);
    
    filteredConsultas.forEach((con: Consulta) => {
      if (con.status === 'agendada' && con.id) {
        const dataCon = new Date(con.data);
        if (dataCon >= hoje && dataCon <= seteDias) {
          const dias = Math.ceil((dataCon.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          const nomeMedico = con.medico || 'médico';
          alerts.push({
            tipo: 'consulta',
            mensagem: `Consulta com ${nomeMedico} em ${dias} dia${dias > 1 ? 's' : ''}`,
            urgencia: dias <= 2 ? 'alta' : 'media',
            link: `/saude/consultas/detalhes?id=${con.id}`,
          });
        }
      }
    });

    filteredExames.forEach((exame: Exame) => {
      if (exame.data_retorno && exame.id) {
        const dias = getDaysUntil(exame.data_retorno);
        if (dias !== null) {
          if (dias < 0) {
            alerts.push({
              tipo: 'exame',
              mensagem: `Exame "${exame.nome}" venceu há ${Math.abs(dias)} dia(s)`,
              urgencia: 'alta',
              link: `/saude/exames/detalhes?id=${exame.id}`,
            });
          } else if (dias <= 7) {
            alerts.push({
              tipo: 'exame',
              mensagem: `Apresentação de exame "${exame.nome}" em ${dias} dia(s)`,
              urgencia: dias <= 2 ? 'alta' : 'media',
              link: `/saude/exames/detalhes?id=${exame.id}`,
            });
          }
        }
      }
    });

    return alerts.sort((a, b) => {
      const ordem = { alta: 0, media: 1, baixa: 2 };
      return ordem[a.urgencia] - ordem[b.urgencia];
    });
  }, [filteredMedicamentos, filteredConsultas, filteredExames]);

  const stats = useMemo(() => ({
    medicamentos: filteredMedicamentos.length,
    medicamentosAtivos: filteredMedicamentos.filter(m => m.status === 'ativo').length,
    tratamentos: filteredTratamentos.length,
    tratamentosAtivos: filteredTratamentos.filter(t => t.status === 'ativo').length,
    consultas: filteredConsultas.length,
    consultasProximas: filteredConsultas.filter(c => c.status === 'agendada' && new Date(c.data) >= new Date()).length,
    exames: filteredExames.length,
    cirurgias: filteredCirurgias.length,
    medicos: filteredMedicos.length,
    farmacias: filteredFarmacias.length,
    hospitais: filteredHospitais.length,
  }), [filteredMedicamentos, filteredTratamentos, filteredConsultas, filteredExames, filteredCirurgias, filteredMedicos, filteredFarmacias, filteredHospitais]);

  const filteredMedicosSearch = useMemo(() => {
    if (!search) return filteredMedicos;
    return filteredMedicos.filter(m => m.nome.toLowerCase().includes(search.toLowerCase()));
  }, [filteredMedicos, search]);

  const filteredFarmaciasSearch = useMemo(() => {
    if (!search) return filteredFarmacias;
    return filteredFarmacias.filter(f => f.nome.toLowerCase().includes(search.toLowerCase()));
  }, [filteredFarmacias, search]);

  const filteredHospitaisSearch = useMemo(() => {
    if (!search) return filteredHospitais;
    return filteredHospitais.filter(h => h.nome.toLowerCase().includes(search.toLowerCase()));
  }, [filteredHospitais, search]);

  const filteredTratamentosSearch = useMemo(() => {
    if (!search) return filteredTratamentos;
    return filteredTratamentos.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()));
  }, [filteredTratamentos, search]);

  if (!persons) return <CardListSkeleton />;

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'medicos', label: 'Médicos', icon: Stethoscope },
    { id: 'farmacias', label: 'Farmácias', icon: Pill },
    { id: 'hospitais', label: 'Hospitais', icon: Building2 },
    { id: 'tratamentos', label: 'Tratamentos', icon: FolderHeart },
  ];

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
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">REDE DE APOIO</p>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">
                  Minha Rede de Saúde
                </h1>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              TABS
              ---------------------------------------------------- */}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                    active
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:text-ink-primary"
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ----------------------------------------------------
              BUSCA (para tabs que não são visão geral)
              ---------------------------------------------------- */}

          {activeTab !== 'visao-geral' && (
            <div className="relative mt-4">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder={`Buscar ${activeTab === 'medicos' ? 'médico' : activeTab === 'farmacias' ? 'farmácia' : activeTab === 'hospitais' ? 'hospital' : 'tratamento'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl bg-surface-raised/60 pl-9 text-sm"
              />
            </div>
          )}
        </header>

        {/* ======================================================
            CONTEÚDO
            ====================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'visao-geral' && (
              <motion.div
                key="visao-geral"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {alertas.length > 0 && (
                  <div className="rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-amber-400" />
                      <h3 className="text-sm font-semibold text-ink-primary">Alertas Inteligentes</h3>
                      <span className="text-[10px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">{alertas.length}</span>
                    </div>
                    <div className="space-y-2">
                      {alertas.slice(0, 5).map((alerta, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { trigger("vibrate"); router.push(alerta.link); }}
                          className={`flex items-start gap-2 text-xs w-full text-left p-2 rounded-xl transition-colors hover:bg-surface-raised/50 ${
                            alerta.urgencia === 'alta' ? 'border-l-2 border-coral pl-2' :
                            alerta.urgencia === 'media' ? 'border-l-2 border-amber-400 pl-2' :
                            'border-l-2 border-ice pl-2'
                          }`}
                        >
                          {alerta.urgencia === 'alta' ? (
                            <AlertTriangle size={14} className="text-coral shrink-0 mt-0.5" />
                          ) : alerta.urgencia === 'media' ? (
                            <Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 size={14} className="text-ice shrink-0 mt-0.5" />
                          )}
                          <span className="text-ink-primary">{alerta.mensagem}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ResumoCard
                    icon={Pill}
                    label="Medicamentos"
                    value={stats.medicamentos}
                    sub={`${stats.medicamentosAtivos} ativos`}
                    color="#10B981"
                    onClick={() => router.push(`/saude/medicamentos`)}
                  />
                  <ResumoCard
                    icon={FolderHeart}
                    label="Tratamentos"
                    value={stats.tratamentos}
                    sub={`${stats.tratamentosAtivos} ativos`}
                    color="#8B5CF6"
                    onClick={() => router.push(`/saude/tratamentos`)}
                  />
                  <ResumoCard
                    icon={Calendar}
                    label="Consultas"
                    value={stats.consultas}
                    sub={`${stats.consultasProximas} próximas`}
                    color="#38BDF8"
                    onClick={() => router.push(`/saude/consultas`)}
                  />
                  <ResumoCard
                    icon={FlaskConical}
                    label="Exames"
                    value={stats.exames}
                    sub="Registrados"
                    color="#10B981"
                    onClick={() => router.push(`/saude/exames`)}
                  />
                  <ResumoCard
                    icon={Syringe}
                    label="Cirurgias"
                    value={stats.cirurgias}
                    sub="Histórico"
                    color="#EF4444"
                    onClick={() => router.push(`/saude/cirurgias`)}
                  />
                  <ResumoCard
                    icon={Users}
                    label="Rede de Apoio"
                    value={stats.medicos + stats.farmacias + stats.hospitais}
                    sub={`${stats.medicos} méd., ${stats.farmacias} farm., ${stats.hospitais} hosp.`}
                    color="#38BDF8"
                    onClick={() => setActiveTab('medicos')}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'medicos' && (
              <TabList<Medico>
                key="medicos"
                items={filteredMedicosSearch}
                icon={Stethoscope}
                color="#38BDF8"
                emptyMessage="Nenhum médico vinculado a esta pessoa (adicione uma consulta ou medicamento para vincular)."
                onItemClick={(item) => router.push(`/saude/medicos/detalhes?id=${item.id}`)}
                renderItem={(item) => (
                  <div>
                    <p className="truncate font-display text-sm font-semibold text-ink-primary">{item.nome}</p>
                    {item.especialidade && <p className="mt-0.5 text-xs text-ink-muted">{item.especialidade}</p>}
                    {item.crm && <p className="mt-0.5 text-xs text-ink-faint">CRM {item.crm}</p>}
                    {item.telefone && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                        <Phone size={11} />
                        <span>{item.telefone}</span>
                      </div>
                    )}
                  </div>
                )}
              />
            )}

            {activeTab === 'farmacias' && (
              <TabList<Farmacia>
                key="farmacias"
                items={filteredFarmaciasSearch}
                icon={Pill}
                color="#F59E0B"
                emptyMessage="Nenhuma farmácia vinculada (adicione uma renovação de remédio para vincular)."
                onItemClick={(item) => router.push(`/saude/farmacias/detalhes?id=${item.id}`)}
                renderItem={(item) => (
                  <div>
                    <p className="truncate font-display text-sm font-semibold text-ink-primary">{item.nome}</p>
                    {item.endereco && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin size={11} />
                        <span className="truncate">{item.endereco}</span>
                      </div>
                    )}
                  </div>
                )}
              />
            )}

            {activeTab === 'hospitais' && (
              <TabList<Hospital>
                key="hospitais"
                items={filteredHospitaisSearch}
                icon={Building2}
                color="#8B5CF6"
                emptyMessage="Nenhum hospital vinculado (adicione uma cirurgia ou consulta para vincular)."
                onItemClick={(item) => router.push(`/saude/hospitais/detalhes?id=${item.id}`)}
                renderItem={(item) => (
                  <div>
                    <p className="truncate font-display text-sm font-semibold text-ink-primary">{item.nome}</p>
                    {item.endereco && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                        <MapPin size={11} />
                        <span className="truncate">{item.endereco}</span>
                      </div>
                    )}
                  </div>
                )}
              />
            )}

            {activeTab === 'tratamentos' && (
              <TabList<Tratamento>
                key="tratamentos"
                items={filteredTratamentosSearch}
                icon={FolderHeart}
                color="#8B5CF6"
                emptyMessage="Nenhum tratamento cadastrado para esta pessoa."
                onItemClick={(item) => router.push(`/saude/tratamentos/detalhes?id=${item.id}`)}
                renderItem={(item) => {
                  const cor = item.cor || "#8B5CF6";
                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-2.5 w-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: cor }}
                        />
                        <p className="truncate font-display text-sm font-semibold text-ink-primary">{item.nome}</p>
                      </div>
                      {item.condicao && <p className="mt-0.5 text-xs text-ink-muted">{item.condicao}</p>}
                      <span className={`mt-1 inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.status === "ativo" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                        item.status === "concluido" ? "bg-ice/10 text-ice border border-ice/20" :
                        "bg-coral/10 text-coral border border-coral/20"
                      }`}>
                        {item.status === "ativo" ? "Ativo" : item.status === "concluido" ? "Concluído" : "Suspenso"}
                      </span>
                    </div>
                  );
                }}
              />
            )}
          </AnimatePresence>
        </section>
      </main>
    </PageTransition>
  );
}

/* ============================================================
   COMPONENTES INTERNOS
   ============================================================ */

interface ResumoCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub: string;
  color: string;
  onClick: () => void;
}

function ResumoCard({ icon: Icon, label, value, sub, color, onClick }: ResumoCardProps) {
  const { trigger } = useHapticFeedback();

  return (
    <button
      type="button"
      onClick={() => { trigger("vibrate"); onClick(); }}
      className="flex flex-col items-start justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.98] hover:bg-surface-raised/80"
    >
      <div 
        className="flex h-10 w-10 items-center justify-center rounded-2xl" 
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon size={18} />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-ink-primary">{value}</p>
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="text-[10px] text-ink-faint mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

interface TabListProps<T> {
  items: T[];
  icon: React.ElementType;
  color?: string;
  emptyMessage: string;
  onItemClick: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
}

function TabList<T extends { id?: string }>({ 
  items, 
  icon: Icon, 
  color = "#38BDF8",
  emptyMessage, 
  onItemClick, 
  renderItem 
}: TabListProps<T>) {
  const { trigger } = useHapticFeedback();

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border/50 bg-surface-raised">
          <Icon size={22} className="text-ink-muted" />
        </div>
        <h3 className="font-display text-base font-semibold text-ink-primary">
          {emptyMessage}
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
          Nenhum registro encontrado neste contexto.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.article
          key={item.id || index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
          className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
          style={{
            borderColor: `${color}40`,
            borderLeft: `6px solid ${color}`,
          }}
        >
          <div className="p-4 pl-5">
            <button
              type="button"
              onClick={() => { trigger("vibrate"); onItemClick(item); }}
              className="flex w-full items-start gap-3.5 text-left outline-none"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                style={{
                  backgroundColor: `${color}15`,
                  borderColor: `${color}30`,
                  color: color,
                }}
              >
                <Icon size={22} />
              </div>

              <div className="min-w-0 flex-1">
                {renderItem(item)}
              </div>

              <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
            </button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}