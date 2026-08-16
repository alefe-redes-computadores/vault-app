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
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/Input";
// 🧠 Importação da Inteligência centralizada
import { sugerirRenovacao, isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil } from "@/lib/health-utils";

type TabType = "visao-geral" | "medicos" | "farmacias" | "hospitais" | "tratamentos";

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
  
  // Hooks padronizados
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();
  const { medicamentos } = useMedicamentos();
  const { tratamentos } = useTratamentos();
  const { consultas } = useConsultas();
  const { exames } = useExames();
  const { cirurgias } = useCirurgias();
  const { renovacoes } = useRenovacoes();
  const persons = usePersons();

  // Estados locais
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [search, setSearch] = useState("");

  // Sincronização de abas via URL
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || "visao-geral");

  // Selecionar primeira pessoa automaticamente
  useEffect(() => {
    if (persons.length > 0 && !selectedPersonId) {
      setSelectedPersonId(persons[0].id!);
    }
  }, [persons, selectedPersonId]);

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
  }, [tabFromUrl]);

  // ============================================================
  // FILTRAGEM POR PESSOA (ARQUITETURA RELACIONAL)
  // ============================================================
  const filteredMedicos = useMemo(() => {
    if (!selectedPersonId) return [];
    return medicos.filter(m => m.person_id === selectedPersonId);
  }, [medicos, selectedPersonId]);

  const filteredFarmacias = useMemo(() => {
    if (!selectedPersonId) return [];
    return farmacias.filter(f => f.person_id === selectedPersonId);
  }, [farmacias, selectedPersonId]);

  const filteredHospitais = useMemo(() => {
    if (!selectedPersonId) return [];
    return hospitais.filter(h => h.person_id === selectedPersonId);
  }, [hospitais, selectedPersonId]);

  const filteredMedicamentos = useMemo(() => {
    if (!selectedPersonId) return [];
    return medicamentos.filter(m => m.person_id === selectedPersonId);
  }, [medicamentos, selectedPersonId]);

  const filteredTratamentos = useMemo(() => {
    if (!selectedPersonId) return [];
    return tratamentos.filter(t => t.person_id === selectedPersonId);
  }, [tratamentos, selectedPersonId]);

  const filteredConsultas = useMemo(() => {
    if (!selectedPersonId) return [];
    return consultas.filter(c => c.person_id === selectedPersonId);
  }, [consultas, selectedPersonId]);

  const filteredExames = useMemo(() => {
    if (!selectedPersonId) return [];
    return exames.filter(e => e.person_id === selectedPersonId);
  }, [exames, selectedPersonId]);

  const filteredCirurgias = useMemo(() => {
    if (!selectedPersonId) return [];
    return cirurgias.filter(c => c.person_id === selectedPersonId);
  }, [cirurgias, selectedPersonId]);

  // ============================================================
  // ALERTAS INTELIGENTES (INTEGRADOS COM health-insights.ts)
  // ============================================================
  const alertas = useMemo(() => {
    if (!selectedPersonId) return [];

    const alerts: { 
      tipo: 'estoque' | 'receita' | 'consulta' | 'exame' | 'cirurgia'; 
      mensagem: string; 
      urgencia: 'alta' | 'media' | 'baixa'; 
      entidade: any; 
      link: string;
    }[] = [];

    filteredMedicamentos.forEach(med => {
      const insight = sugerirRenovacao(med);
      if (insight.deveRenovar) {
        alerts.push({
          tipo: 'estoque',
          mensagem: insight.mensagem,
          urgencia: insight.urgencia,
          entidade: med,
          link: `/saude/medicamentos/detalhes?id=${med.id}`,
        });
      }
    });

    filteredMedicamentos.forEach(med => {
      if (isReceitaVencidaSegura(med.proxima_renovacao)) {
        alerts.push({
          tipo: 'receita',
          mensagem: `Receita de ${med.nome} venceu em ${formatDateDisplay(med.proxima_renovacao)}`,
          urgencia: 'alta',
          entidade: med,
          link: `/saude/medicamentos/detalhes?id=${med.id}`,
        });
      }
    });

    const hoje = new Date();
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);
    
    filteredConsultas.forEach(con => {
      if (con.status === 'agendada') {
        const dataCon = new Date(con.data);
        if (dataCon >= hoje && dataCon <= seteDias) {
          const dias = Math.ceil((dataCon.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          // 💡 Nome do médico dinâmico na consulta
          const nomeMedico = con.medico || con.medico_nome || 'médico';
          alerts.push({
            tipo: 'consulta',
            mensagem: `Consulta com ${nomeMedico} em ${dias} dia${dias > 1 ? 's' : ''}`,
            urgencia: dias <= 2 ? 'alta' : 'media',
            entidade: con,
            link: `/saude/consultas/detalhes?id=${con.id}`,
          });
        }
      }
    });

    filteredExames.forEach(exame => {
      if (exame.data_retorno) {
        const dias = getDaysUntil(exame.data_retorno);
        if (dias !== null) {
          // 💡 Alerta de exame vencido vs. a vencer
          if (dias < 0) {
            alerts.push({
              tipo: 'exame',
              mensagem: `Exame "${exame.nome}" venceu há ${Math.abs(dias)} dia(s)`,
              urgencia: 'alta',
              entidade: exame,
              link: `/saude/exames/detalhes?id=${exame.id}`,
            });
          } else if (dias <= 7) {
            alerts.push({
              tipo: 'exame',
              mensagem: `Apresentação de exame "${exame.nome}" em ${dias} dia(s)`,
              urgencia: dias <= 2 ? 'alta' : 'media',
              entidade: exame,
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
  }, [filteredMedicamentos, filteredConsultas, filteredExames, selectedPersonId]);

  // Estatísticas para a Visão Geral
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

  // Buscas por aba
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

  if (!persons) return <LoadingSkeleton />;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'medicos', label: 'Médicos', icon: Stethoscope },
    { id: 'farmacias', label: 'Farmácias', icon: Pill },
    { id: 'hospitais', label: 'Hospitais', icon: Building2 },
    { id: 'tratamentos', label: 'Tratamentos', icon: FolderHeart },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Vault</p>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Minha Rede de Saúde
              </h1>
            </div>
          </div>

          {/* Seletor de Pessoa */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <User size={16} className="text-ink-muted shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {persons.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => { trigger("vibrate"); setSelectedPersonId(p.id!); }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedPersonId === p.id
                      ? "border-ice bg-ice/12 text-ice"
                      : "border-surface-border/50 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Abas */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
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

          {/* Input de Busca Contextual */}
          {activeTab !== 'visao-geral' && (
            <div className="relative mt-4">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder={`Buscar ${activeTab === 'medicos' ? 'médico' : activeTab === 'farmacias' ? 'farmácia' : activeTab === 'hospitais' ? 'hospital' : 'tratamento'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-surface-border/50 bg-surface-raised pl-9"
              />
            </div>
          )}
        </header>

        <section className="px-5 pt-5 space-y-4">
          <AnimatePresence mode="wait">
            {/* ============================================================ */}
            {/* VISÃO GERAL */}
            {/* ============================================================ */}
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
                  {/* 💡 Parametrizando as rotas de click com person_id */}
                  <ResumoCard
                    icon={Pill}
                    label="Medicamentos"
                    value={stats.medicamentos}
                    sub={`${stats.medicamentosAtivos} ativos`}
                    color="#10B981"
                    onClick={() => router.push(`/saude/medicamentos?person_id=${selectedPersonId}`)}
                  />
                  <ResumoCard
                    icon={FolderHeart}
                    label="Tratamentos"
                    value={stats.tratamentos}
                    sub={`${stats.tratamentosAtivos} ativos`}
                    color="#8B5CF6"
                    onClick={() => router.push(`/saude/tratamentos?person_id=${selectedPersonId}`)}
                  />
                  <ResumoCard
                    icon={Calendar}
                    label="Consultas"
                    value={stats.consultas}
                    sub={`${stats.consultasProximas} próximas`}
                    color="#38BDF8"
                    onClick={() => router.push(`/saude/consultas?person_id=${selectedPersonId}`)}
                  />
                  <ResumoCard
                    icon={FlaskConical}
                    label="Exames"
                    value={stats.exames}
                    sub="Registrados"
                    color="#10B981"
                    onClick={() => router.push(`/saude/exames?person_id=${selectedPersonId}`)}
                  />
                  <ResumoCard
                    icon={Syringe}
                    label="Cirurgias"
                    value={stats.cirurgias}
                    sub="Histórico"
                    color="#EF4444"
                    onClick={() => router.push(`/saude/cirurgias?person_id=${selectedPersonId}`)}
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

            {/* ABAS ESPECÍFICAS DE LISTAGEM */}
            {activeTab === 'medicos' && (
              <TabList
                key="medicos"
                items={filteredMedicosSearch}
                icon={Stethoscope}
                label="Médico"
                emptyMessage="Nenhum médico cadastrado para esta pessoa."
                onItemClick={(item: any) => router.push(`/saude/medicos/detalhes?id=${item.id}`)}
                renderItem={(item: any) => (
                  <div>
                    <p className="truncate font-display text-sm font-semibold text-ink-primary">{item.nome}</p>
                    {item.especialidade && <p className="mt-0.5 text-xs text-ink-muted">{item.especialidade}</p>}
                    {/* 💡 Restaurando CRM */}
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
              <TabList
                key="farmacias"
                items={filteredFarmaciasSearch}
                icon={Pill}
                label="Farmácia"
                emptyMessage="Nenhuma farmácia cadastrada para esta pessoa."
                onItemClick={(item: any) => router.push(`/saude/farmacias/detalhes?id=${item.id}`)}
                renderItem={(item: any) => (
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
              <TabList
                key="hospitais"
                items={filteredHospitaisSearch}
                icon={Building2}
                label="Hospital"
                emptyMessage="Nenhum hospital cadastrado para esta pessoa."
                onItemClick={(item: any) => router.push(`/saude/hospitais/detalhes?id=${item.id}`)}
                renderItem={(item: any) => (
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
              <TabList
                key="tratamentos"
                items={filteredTratamentosSearch}
                icon={FolderHeart}
                label="Tratamento"
                emptyMessage="Nenhum tratamento cadastrado para esta pessoa."
                onItemClick={(item: any) => router.push(`/saude/tratamentos/detalhes?id=${item.id}`)}
                renderItem={(item: any) => {
                  // 🎨 Uso exclusivo da cor real cadastrada no banco, com fallback padrão limpo
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

function ResumoCard({ icon: Icon, label, value, sub, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
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

function TabList({ items, icon: Icon, label, emptyMessage, onItemClick, renderItem }: any) {
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
          Cadastre novos itens para exibi-los aqui.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item: any, index: number) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
          onClick={() => { trigger("vibrate"); onItemClick(item); }}
          className="flex w-full items-start gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            {renderItem(item)}
          </div>
          <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
        </motion.button>
      ))}
    </div>
  );
}
