"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Brain,
  ChevronRight,
  ChevronDown,
  Droplets,
  History,
  Network,
  Plus,
  Settings,
  Watch,
  Bell,
  UserRound,
} from "lucide-react";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import {avatarBodyContext,type AvatarBodyPart} from "@/lib/health-profile/avatar-body";
import { surgeryBodyLabel } from "@/lib/surgery-body";
import {AvatarBodyEvidence} from "@/components/saude/AvatarBodyEvidence";
import { useSharedHealthIntelligence as useHealthIntelligence } from "@/contexts/HealthIntelligenceContext";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { HealthConnectPanel } from "@/components/saude/HealthConnectPanel";
import { CustomDatePicker } from "@/components/DatePicker";
import { MetricHistoryLink } from "@/components/saude/MetricHistoryLink";
import {clearMetricInsightQuery,type MetricInsightTarget} from "@/lib/health-profile/metric-link";
import { HealthMetricDetails } from "@/components/saude/HealthMetricDetails";
import { avatarWeightContext } from "@/lib/health-profile/avatar-readings";
import { avatarPreferenceKey } from "@/lib/health-profile/avatar-preference";
import { avatarInsightContext } from "@/lib/health-profile/avatar-context";
import { AvatarReadings } from "@/components/saude/AvatarReadings";
import { AvatarHealthContext } from "@/components/saude/AvatarHealthContext";
import { HealthAvatar as HealthBody } from "@/components/saude/HealthAvatar";
import {
  HealthDeviceIcon,
  HealthMetricIcon,
  METRIC_TONES,
} from "@/components/saude/HealthDeviceIcon";
import { HealthMeasurementForm } from "@/components/saude/HealthMeasurementForm";
import {
  HealthProfileEditor,
  HealthDeviceEditor,
} from "@/components/saude/HealthProfileEditor";
import dynamic from "next/dynamic";
const HydrationPanel = dynamic(
  () =>
    import("@/components/saude/HydrationPanel").then((m) => m.HydrationPanel),
  {
    loading: () => (
      <p className="text-xs text-ink-muted">Carregando hidratação…</p>
    ),
  }
);
import { healthProfileRepository } from "@/lib/repositories/healthProfile";
import {
  METRICS,
  SKIN_TONES,
  type HealthMetric,
} from "@/lib/health-profile/types";
import { summarizeHealthDay, adjacentHealthDays } from "@/lib/health-profile/history-summary";
import { ageOn, bmi } from "@/lib/health-profile/metrics";
import { getLocalTodayISO } from "@/lib/health-utils";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { HealthInsightSheet } from "@/components/vault-intelligence/HealthInsightSheet";
import { withReturnTarget } from "@/lib/navigation/return-context";
import type { HealthInsight } from "@/lib/health-insights";
import { NewHealthDataSummary } from "@/components/saude/NewHealthDataSummary";
import { buildHealthDashboardIndex } from "@/lib/health-profile/dashboard-index";
export default function MyHealthPage() {
  const data = useHealthProfile();
  return <HealthDashboard key={data.personId || "none"} data={data} />;
}
function HealthDashboard({
  data,
}: {
  data: ReturnType<typeof useHealthProfile>;
}) {
  const router = useRouter(),
    { trigger } = useHapticFeedback(),
    { showToast } = useToast(),
    { registros, isLoading } = useRegistrosSaude();
  const [bodyPart,setBodyPart]=useState<AvatarBodyPart|null>(null);
  const [brainSummaryOpen,setBrainSummaryOpen]=useState(false);
  const [selectedInsight,setSelectedInsight]=useState<HealthInsight|null>(null);
  // V158 keeps overview vs full metric-history semantically distinct.
  const [bodyMarkerKey,setBodyMarkerKey]=useState<string|null>(null);
  const selectBody=(part:AvatarBodyPart|null,markerKey?:string)=>{setBodyMarkerKey(markerKey||null);setBodyPart(part);};
  const intelligence = useHealthIntelligence({ includeAudit: false });
  const { personId, person, profile, devices, loading, error } = data;
  const [panel, setPanel] = useState<
      "profile" | "device" | "water" | HealthMetric | null
    >(null),
    [editDevice, setEditDevice] = useState<string | null>(null),
    [filter, setFilter] = useState<HealthMetric | null>(null),
    [metric, setMetric] = useState<HealthMetric | null>(null),
    [historyDate, setHistoryDate] = useState(getLocalTodayISO()),
    [archive, setArchive] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [insightTarget,setInsightTarget]=useState<MetricInsightTarget|null>(null);
  const closeMetric=()=>{setMetric(null);setInsightTarget(null);if(insightTarget){const query=clearMetricInsightQuery(new URLSearchParams(window.location.search));router.replace(`/saude/minha-saude${query?`?${query}`:""}`);}};
  const deviceEditorRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(panel!=="device")return;const frame=requestAnimationFrame(()=>{deviceEditorRef.current?.scrollIntoView({block:"start",behavior:"auto"});deviceEditorRef.current?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[panel,editDevice]);
  const profileEditorId = useId();
  const profileEditorRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileWasOpen = useRef(false);
  useEffect(() => {
    const opened = panel === "profile";
    const wasOpen = profileWasOpen.current;
    profileWasOpen.current = opened;
    if (!opened && (!wasOpen || panel !== null)) return;
    const frame = window.requestAnimationFrame(() => {
      if (opened) {
        profileEditorRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
        profileEditorRef.current?.focus({ preventScroll: true });
      } else {
        profileButtonRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
        profileButtonRef.current?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [panel]);
  const lock = useRef(false),
    today = getLocalTodayISO();
  const dashboardIndex = useMemo(() => buildHealthDashboardIndex({ records: registros, devices, personId: personId || "", userId: person?.user_id || "", today }), [registros, devices, personId, person?.user_id, today]);
  const { records, latestByMetric, deviceById, activeDevices: active, archivedDevices } = dashboardIndex;
  const latest = (type: HealthMetric) => latestByMetric.get(type);
  const weightContext=useMemo(()=>avatarWeightContext(records,personId||"",person?.user_id||"",today),[records,personId,person?.user_id,today]);
  const bodyContext=useMemo(()=>avatarBodyContext(registros,intelligence.context?.cirurgias||[],devices,personId||"",person?.user_id||"",today),[registros,intelligence.context?.cirurgias,devices,personId,person?.user_id,today]);
  const avatarContext=useMemo(()=>avatarInsightContext(intelligence.insights),[intelligence.insights]);
  const weight = weightContext.latest,
    index = bmi(weight?.valor_numerico, profile?.height_cm),
    age = ageOn(profile?.birth_date, today);
  const daySummary=useMemo(()=>summarizeHealthDay(records,historyDate),[records,historyDate]);
  const adjacentDays=useMemo(()=>adjacentHealthDays(records,historyDate,today),[records,historyDate,today]);
  const dayGroups=useMemo(()=>filter?new Map([[filter,daySummary.groups.get(filter)||[]]]):daySummary.groups,[daySummary,filter]);
  const visible=useMemo(()=>Array.from(dayGroups.values()).flat(),[dayGroups]);
  const go = (path: string) => {
    trigger("vibrate");
    router.push(path);
  };
  const goFromHealth = (path: string) => go(withReturnTarget(path,"/saude/minha-saude"));
  const open = (next: typeof panel) => {
    trigger("vibrate");
    setPanel(next);
  };
  async function archiveDevice() {
    if (!archive || !personId || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const d = deviceById.get(archive);
      await healthProfileRepository.setDeviceActive(
        personId,
        archive,
        !d?.active
      );
      setArchive(null);
      trigger("success");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Não foi possível atualizar.",
        "error"
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function value(type: HealthMetric) {
    const r = latest(type);
    if (!r) return "Sem registro";
    if (type === "sono") {
      const mins = r.duracao_minutos;
      return mins !== undefined
        ? `${Math.floor(mins / 60)}h ${mins % 60}min`
        : r.valor_medicao || "Registrado";
    }
    return (
      r.valor_medicao ||
      `${r.valor_numerico ?? "—"} ${r.unidade_medida || METRICS[type].unit}`
    );
  }
  return (
    <main className="min-h-screen bg-void px-4 pb-28 pt-6 text-ink-primary">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go("/")}
            aria-label="Voltar ao início"
            className="rounded-2xl border border-surface-border bg-surface p-3"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-[.2em] text-emerald-400">
              Saúde e rotina
            </p>
            <h1 className="font-display text-2xl font-semibold">Minha saúde</h1>
          </div>
          <button
            type="button"
            onClick={() => go("/saude/lembretes")}
            className="p-3 text-ink-muted"
            aria-label="Configurar lembretes"
          >
            <Bell size={20} />
          </button>
        </header>
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-coral/20 p-4 text-sm text-coral"
          >
            {error}
          </p>
        )}
        {!personId ? (
          <p className="text-sm text-ink-muted">
            Selecione uma pessoa para organizar a saúde.
          </p>
        ) : (
          <>
            <NewHealthDataSummary records={records} userId={person?.user_id||""} personId={personId} onOpen={()=>goFromHealth("/saude/registros")}/>
            {panel === "profile" && (
              <div id={profileEditorId} ref={profileEditorRef} role="region" aria-label="Configurações do perfil de saúde" tabIndex={-1} className="scroll-mt-24 rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                <HealthProfileEditor personId={personId} profile={profile} onClose={() => setPanel(null)} />
              </div>
            )}
            <section className="overflow-hidden rounded-2xl border border-surface-border border-l-2 border-l-emerald-300/40 bg-gradient-to-br from-emerald-400/[.035] to-surface p-3">
              <div className="flex items-center gap-3">
                {person?.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <UserRound size={24} className="text-emerald-400" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {person?.name || "Seu perfil"}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    {age !== null ? `${age} anos · ` : ""}Seu espaço de saúde
                  </p>
                </div>
                <button
                  type="button"
                  ref={profileButtonRef}
                  onClick={() => {
                    open("profile");
                    if (panel === "profile") {
                      profileEditorRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
                      profileEditorRef.current?.focus({ preventScroll: true });
                    }
                  }}
                  aria-expanded={panel === "profile"}
                  aria-controls={profileEditorId}
                  aria-label="Editar perfil de saúde"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <Settings size={18} />
                </button>
              </div>
              {/* V156 compact health identity: model at left, evidence to the right. */}
              <div className="mt-3 grid grid-cols-[minmax(0,46%)_minmax(0,1fr)] items-start gap-3">
                <div className="min-w-0 overflow-hidden rounded-lg bg-emerald-300/[0.025]">
                  <HealthBody key={personId} preferenceKey={avatarPreferenceKey(person?.user_id||"",personId||"")} personName={person?.name||""} skin={profile?.skin_tone || SKIN_TONES[2]} devices={devices} body={bodyContext} onBodySelect={selectBody} onBrainSelect={()=>{const insight=!intelligence.error&&!intelligence.isLoading?avatarContext.primary:null;if(insight)setSelectedInsight(insight);else setBrainSummaryOpen(true);}} onDeviceSelect={id=>{if(!devices.some(d=>d.id===id&&d.person_id===personId&&d.user_id===person?.user_id))return;setEditDevice(id);open("device");}} attention={intelligence.isLoading||intelligence.error?0:avatarContext.rank} expanded />
                </div>
                <div className="min-w-0 flex-1 space-y-3 self-center">
                  <div>
                    <p className="text-[11px] text-ink-muted">Altura</p>
                    <p className="text-lg font-semibold">
                      {profile?.height_cm ? `${profile.height_cm} cm` : "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => open("peso")}
                    className="block min-h-14 w-full rounded-lg text-left focus-visible:outline focus-visible:outline-emerald-300"
                  >
                    <p className="text-[11px] text-ink-muted">Último peso</p>
                    <p className="text-lg font-semibold">
                      {weight?.valor_numerico
                        ? `${weight.valor_numerico} kg`
                        : "Registrar"}
                    </p>
                    {weight && (
                      <p className="text-[9px] text-ink-muted">
                        {weight.data.split("-").reverse().join("/")}
                      </p>
                    )}
                  </button>
                  <div>
                    <p className="text-[11px] text-ink-muted">IMC calculado</p>
                    <p className="text-lg font-semibold">{index ?? "—"}</p>
                  </div>
                </div>
              </div>
              <details className="mt-3 rounded-xl border border-surface-border/70 bg-surface-raised/30 px-3 py-1">
                <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-ink-primary">Corpo e sinais · explorar regiões</summary>
                <AvatarReadings records={records} devices={devices} personId={personId} userId={person?.user_id||""} today={today} onView={type=>{trigger("vibrate");setMetric(type);}} onAdd={open}/>
                <div className="mb-2 mt-1 flex flex-wrap gap-2" aria-label="Explorar dados de saúde por região">
                  <button type="button" onClick={()=>setMetric('sono')} className="min-h-11 rounded-full border border-violet-400/15 px-3 text-[11px] text-violet-200">Cabeça · sono</button>
                  <button type="button" onClick={()=>goFromHealth('/saude/exames')} className="min-h-11 rounded-full border border-sky-400/15 px-3 text-[11px] text-sky-200">Olhos · exames</button>
                  <button type="button" onClick={()=>setMetric('frequencia_cardiaca')} className="min-h-11 rounded-full border border-rose-400/15 px-3 text-[11px] text-rose-200">Tórax · batimentos</button>
                  <button type="button" onClick={()=>setMetric('caminhada')} className="min-h-11 rounded-full border border-amber-400/15 px-3 text-[11px] text-amber-200">Pernas · caminhada</button>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-surface-border/60 pt-2" aria-label="Outros registros representados no avatar">
                  <button type="button" onClick={()=>selectBody('mood')} className="min-h-11 rounded-xl border border-violet-400/20 px-3 text-xs text-violet-300">Humor</button>
                  {bodyContext.surgeryAgenda.total>0?<button type="button" onClick={()=>selectBody('surgery')} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs text-ink-muted">Cirurgias</button>:null}
                  {bodyContext.supports.length>0?<button type="button" onClick={()=>selectBody('equipment')} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs text-ink-muted">Equipamentos</button>:null}
                </div>
              </details>
              <details className="mt-2 text-[11px] leading-relaxed text-ink-muted"><summary className="min-h-11 cursor-pointer py-3">Sobre o perfil e o IMC</summary><p className="pb-3">O avatar representa suas escolhas e os registros disponíveis. O IMC não mede composição corporal. {age !== null && age < 20 ? "A avaliação de crianças e adolescentes utiliza idade e crescimento." : "Interprete com seu histórico e avaliação profissional."} <a href="https://www.cdc.gov/bmi/about/" target="_blank" rel="noreferrer" className="underline">Fonte: CDC</a></p></details>
              {!profile && (
                <button
                  type="button"
                  onClick={() => open("profile")}
                  className="mt-3 w-full rounded-xl border border-emerald-400/20 p-3 text-xs font-semibold text-emerald-400"
                >
                  Completar meu perfil
                </button>
              )}
            </section>
            <section className="rounded-2xl border border-surface-border border-l-2 border-l-violet-300/40 bg-surface p-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-xl p-3 ${!intelligence.error&&!intelligence.isLoading&&intelligence.insights.some(x=>x.urgencia==='alta'||x.gravidadeSeguranca==='critica')?'bg-rose-400/10 text-rose-300':!intelligence.error&&!intelligence.isLoading&&intelligence.insights.some(x=>x.urgencia==='media')?'bg-amber-400/10 text-amber-300':'bg-violet-400/10 text-violet-300'}`}><Brain size={20}/></span>
                <div className="min-w-0 flex-1">
                  <button type="button" aria-expanded={brainSummaryOpen} onClick={()=>setBrainSummaryOpen(v=>!v)} className="flex min-h-11 w-full items-center justify-between text-left text-sm font-semibold">Vault Intelligence <ChevronDown size={16} className={brainSummaryOpen?"rotate-180":""}/></button>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {intelligence.isLoading
                      ? "Analisando os registros disponíveis…"
                      : intelligence.error ? "Não foi possível atualizar a análise. Seus registros continuam disponíveis." : avatarContext.primary?.titulo || "Sem destaque prioritário nos registros disponíveis."}
                  </p>
                </div>
              </div>
              {brainSummaryOpen && (!intelligence.error && avatarContext.items.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {avatarContext.items.map((item) => (
                    <li key={item.id} className="border-l-2 border-violet-300/25 bg-surface/70 py-2 pl-3 pr-2">
                      <button type="button" onClick={()=>setSelectedInsight(item)} className="flex min-h-11 w-full items-center gap-2 text-left text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span className="flex-1">{item.titulo}</span><ChevronRight size={14} className="shrink-0 text-violet-300"/><span className="sr-only">Ver evidências</span></button>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{item.mensagem}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  {intelligence.isLoading
                    ? "Os padrões aparecem quando a análise terminar."
                    : intelligence.error ? "Tente consultar a análise completa novamente." : "Ainda não há padrões com amostra suficiente. O Vault mostra apenas o que os registros sustentam."}
                </p>
              ))}
              <button type="button" onClick={() => goFromHealth("/inteligencia/saude")} className="mt-2 flex items-center gap-1 text-xs font-semibold text-violet-300">
                Ver análise e histórico completos <ChevronRight size={15} />
              </button>
            </section>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="font-semibold">Minha rede de dados</h2><p className="mt-0.5 text-[10px] text-ink-muted">{active.length} {active.length===1?'aparelho ativo':'aparelhos ativos'}</p></div>
                <button
                  type="button"
                  onClick={() => {
                    setEditDevice(null);
                    open("device");
                  }}
                  className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-emerald-400"
                >
                  <Settings size={15} />
                  Gerenciar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {active.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => {
                      setEditDevice(d.id);
                      open("device");
                    }}
                    className="flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs"
                  >
                    <HealthDeviceIcon kind={d.kind} color={d.color} />
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}

              </div>
              {!active.length && (
                <p className="text-xs text-ink-muted">
                  Adicione relógio, anel ou medidor para identificar de onde vêm
                  suas medidas.
                </p>
              )}
              {archivedDevices.length > 0 && (
                <details className="text-xs text-ink-muted">
                  <summary className="cursor-pointer py-2">
                    Aparelhos arquivados
                  </summary>
                  {archivedDevices.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setEditDevice(d.id);
                          open("device");
                        }}
                        className="flex items-center gap-2 p-3"
                      >
                        <HealthDeviceIcon kind={d.kind} color={d.color} />
                        {d.name}
                      </button>
                    ))}
                </details>
              )}
            </section>
            {panel === "device" && (
              <div ref={deviceEditorRef} tabIndex={-1} className="space-y-2 scroll-mt-24 focus:outline-none">
                <HealthDeviceEditor
                  key={editDevice || "new"}
                  personId={personId}
                  device={deviceById.get(editDevice || "")}
                  onClose={() => setPanel(null)}
                />
                {editDevice && (
                  <button
                    type="button"
                    onClick={() => setArchive(editDevice)}
                    className="w-full rounded-xl border border-surface-border p-3 text-xs text-ink-muted"
                  >
                    {deviceById.get(editDevice)?.active
                      ? "Arquivar aparelho, preservando histórico"
                      : "Reativar aparelho"}
                  </button>
                )}
              </div>
            )}
            <HealthConnectPanel key={personId} personId={personId} personName={person?.name || "esta pessoa"} devices={devices} />
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3"><div><h2 className="font-semibold">Meus registros</h2><p className="mt-1 text-[11px] text-ink-muted">Valores recentes e acesso ao histórico</p></div><button type="button" onClick={()=>goFromHealth('/saude/registros')} className="min-h-11 shrink-0 text-xs font-semibold text-emerald-400">Ver todos</button></div>
              <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
                {(Object.keys(METRICS) as HealthMetric[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { trigger("vibrate"); setMetric(type); }}
                    className="flex min-h-[68px] w-full items-center gap-3 border-b border-surface-border/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-raised/50 active:bg-surface-raised"
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-surface-raised ${METRIC_TONES[type]}`}><HealthMetricIcon type={type} size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-primary">{METRICS[type].label}</span><span className="mt-0.5 block truncate text-[10px] text-ink-muted">{latest(type)?`Atualizado em ${latest(type)!.data.split("-").reverse().join("/")}`:"Sem registro"}</span></span>
                    <strong className="max-w-[36%] truncate text-right text-xs font-semibold text-ink-primary">{loading || isLoading ? "Carregando…" : value(type)}</strong>
                    <ChevronRight size={15} className="shrink-0 text-ink-muted" />
                  </button>
                ))}
              </div>
            </section>
            {bodyPart?<AvatarBodyEvidence surgeryMarkerKey={bodyMarkerKey} onShowAllSurgeries={()=>selectBody("surgery")} part={bodyPart} context={bodyContext} onClose={()=>selectBody(null)} onWeight={()=>{selectBody(null);setMetric('peso');}} onEquipment={()=>{selectBody(null);setEditDevice(null);open('device');}}/>:null}
            <MetricHistoryLink personId={loading||isLoading||!person?.user_id?"":personId} today={today} onOpen={target=>{setInsightTarget(target);setMetric(target.type);}}/>
            {metric && <HealthMetricDetails key={metric+(insightTarget?.since||"")+(insightTarget?.until||"")} initialRange={insightTarget?.type===metric?insightTarget:undefined} type={metric} records={records} devices={devices} today={today} onClose={closeMetric} onAdd={() => { closeMetric(); open(metric); }} onRecord={id => goFromHealth(`/saude/registros/detalhes?id=${encodeURIComponent(id)}`)} />}
            {panel && Object.prototype.hasOwnProperty.call(METRICS, panel) && (
              <HealthMeasurementForm
                key={panel}
                type={panel as HealthMetric}
                personId={personId}
                devices={devices}
                onClose={() => setPanel(null)}
              />
            )}
            <button
              type="button"
              aria-expanded={panel === "water"}
              onClick={() => open(panel === "water" ? null : "water")}
              className="flex w-full items-center gap-3 rounded-[22px] border border-ice/20 bg-surface p-4 text-left"
            >
              <Droplets size={22} className="text-cyan-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Hidratação</p>
                <p className="text-xs text-ink-muted">
                  Registrar água e ajustar sua meta
                </p>
              </div>
              <ChevronRight size={18} className="text-ink-muted" />
            </button>
            {panel === "water" && <HydrationPanel embedded />}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => goFromHealth("/saude/registros/novo")}
                className="flex items-center gap-2 rounded-2xl border border-coral/20 bg-coral/[0.06] p-4 text-left text-xs"
              >
                <Activity size={20} className="text-coral" />
                Sintomas e humor
              </button>
              <button
                type="button"
                onClick={() => goFromHealth("/saude/registros")}
                className="flex items-center gap-2 rounded-2xl border border-ice/20 bg-ice/[0.045] p-4 text-left text-xs"
              >
                <History size={20} className="text-ice" />
                Linha de cuidado
              </button>
              <button
                type="button"
                onClick={() => goFromHealth("/saude/rede")}
                className="col-span-2 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Network size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">Minha rede de saúde</span>
                  <span className="mt-0.5 block text-[10px] text-ink-muted">Profissionais, locais e cuidado contínuo</span>
                </span>
                <ChevronRight size={16} className="text-emerald-300" />
              </button>
            </div>
            <section className="rounded-[24px] border border-surface-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Registros do dia</h2>
                <button
                  type="button"
                  onClick={() => goFromHealth("/saude/registros")}
                  className="text-xs text-ink-muted"
                >
                  Ver todos
                </button>
              </div>
              <div className="mb-3"><CustomDatePicker label="Dia do histórico" value={historyDate} maxDate={today} onChange={v => setHistoryDate(v || today)} /></div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <button type="button" disabled={!adjacentDays.previous} onClick={()=>{if(adjacentDays.previous)setHistoryDate(adjacentDays.previous);}} className="min-h-11 rounded-xl border border-surface-border px-2 text-[10px] text-ink-muted disabled:opacity-40">Anterior com dados</button>
                <button type="button" disabled={historyDate===today} onClick={()=>setHistoryDate(today)} className="min-h-11 rounded-xl border border-emerald-400/25 px-2 text-xs text-emerald-300 disabled:opacity-40">Hoje</button>
                <button type="button" disabled={!adjacentDays.next} onClick={()=>{if(adjacentDays.next)setHistoryDate(adjacentDays.next);}} className="min-h-11 rounded-xl border border-surface-border px-2 text-[10px] text-ink-muted disabled:opacity-40">Próximo com dados</button>
              </div>
              <p className="mb-3 rounded-xl bg-black/15 px-3 py-2 text-[10px] leading-relaxed text-ink-muted">{daySummary.total} registros no dia · {daySummary.imported} importados · {daySummary.manual} manuais{daySummary.unknown>0?` · ${daySummary.unknown} sem origem informada`:""}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  aria-pressed={!filter}
                  className={`rounded-full border px-3 py-2 text-[10px] ${
                    !filter
                      ? "border-emerald-400/30 text-emerald-400"
                      : "border-surface-border text-ink-muted"
                  }`}
                >
                  Todos
                </button>
                {(Object.keys(METRICS) as HealthMetric[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilter(type)}
                    aria-label={`Filtrar ${METRICS[type].label}`}
                    aria-pressed={filter === type}
                    className={`rounded-full border p-2 ${
                      filter === type
                        ? "border-emerald-400/30"
                        : "border-surface-border"
                    } ${METRIC_TONES[type]}`}
                  >
                    <HealthMetricIcon type={type} size={16} />
                  </button>
                ))}
              </div>
              {visible.length ? (
                Array.from(dayGroups.entries()).filter(([,group])=>group.length>0).map(([type, group]) => (
                  <details key={`${historyDate}:${type}`} className="group border-t border-surface-border">
                    <summary className="flex cursor-pointer items-center gap-3 py-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                      <span className={METRIC_TONES[type as HealthMetric]}><HealthMetricIcon type={type as HealthMetric} /></span>
                      <span className="flex-1">{METRICS[type as HealthMetric]?.label || type}</span>
                      <span className="text-ink-muted">{group.length} registro(s) · {group[0].horario || "—"}</span>
                      <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    {group.map((r) => {
                  const d = deviceById.get(r.device_id || "");
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => goFromHealth(`/saude/registros/detalhes?id=${r.id}`)}
                      className="flex w-full items-center gap-3 border-t border-surface-border py-3 text-left"
                    >
                      <span className={METRIC_TONES[r.tipo as HealthMetric]}>
                        <HealthMetricIcon type={r.tipo as HealthMetric} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">
                          {r.nome} · {r.valor_medicao || "Registrado"}
                        </p>
                        <p className="mt-1 text-[10px] text-ink-muted">
                          {r.data.split("-").reverse().join("/")} · {r.horario}{" "}
                          ·{" "}
                          {r.source === "samsung_manual"
                            ? "Samsung Health · manual"
                            : r.source === "health_connect" ? "Samsung Health · Health Connect" : "Registro manual"}
                        </p>
                        {d && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-ink-muted">
                            <HealthDeviceIcon
                              kind={d.kind}
                              color={d.color}
                              size={12}
                            />
                            {d.name}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-ink-muted" />
                    </button>
                  );
                })}
                  </details>
                ))
              ) : (
                <p className="text-xs text-ink-muted">
                  {isLoading
                    ? "Carregando registros…"
                    : "Nenhum registro neste recorte. Ausência de registro não significa ausência de atividade."}
                </p>
              )}
            </section>
          </>
        )}
      </div>
      <HealthInsightSheet
        insight={selectedInsight}
        onClose={()=>setSelectedInsight(null)}
        onNavigate={href=>{setSelectedInsight(null);goFromHealth(href);}}
        onOpenCentral={selectedInsight?()=>{const id=selectedInsight.id;setSelectedInsight(null);goFromHealth(`/inteligencia/alertas?insight=${encodeURIComponent(id)}`);}:undefined}
      />
      <ConfirmationModal
        isOpen={!!archive}
        onClose={() => setArchive(null)}
        onConfirm={archiveDevice}
        isLoading={busy}
        title="Atualizar aparelho"
        message="Os registros e seus vínculos serão preservados."
        confirmLabel={
          deviceById.get(archive || "")?.active
            ? "Arquivar"
            : "Reativar"
        }
      />
    </main>
  );
}
