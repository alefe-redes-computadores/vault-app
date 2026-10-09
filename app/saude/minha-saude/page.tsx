"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Brain,
  ChevronRight,
  Droplets,
  History,
  Plus,
  Settings,
  Watch,
  Bell,
  UserRound,
} from "lucide-react";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useRegistrosSaude } from "@/hooks/useRegistrosSaude";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { HealthConnectPanel } from "@/components/saude/HealthConnectPanel";
import { HealthMetricTrend } from "@/components/saude/HealthMetricTrend";
import { HealthBody } from "@/components/saude/HealthBody";
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
import { ageOn, bmi } from "@/lib/health-profile/metrics";
import { getLocalTodayISO } from "@/lib/health-utils";
import { ConfirmationModal } from "@/components/ConfirmationModal";
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
  const { personId, person, profile, devices, loading, error } = data;
  const [panel, setPanel] = useState<
      "profile" | "device" | "water" | HealthMetric | null
    >(null),
    [editDevice, setEditDevice] = useState<string | null>(null),
    [filter, setFilter] = useState<HealthMetric | null>(null),
    [archive, setArchive] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    today = getLocalTodayISO();
  const records = useMemo(
    () =>
      registros.filter(
        (r) =>
          r.person_id === personId &&
          r.user_id === person?.user_id &&
          r.data <= today &&
          Object.prototype.hasOwnProperty.call(METRICS, r.tipo)
      ),
    [registros, today, personId, person?.user_id]
  );
  const latest = (type: HealthMetric) => records.find((r) => r.tipo === type);
  const weights = records.filter(r => r.tipo === "peso" && typeof r.valor_numerico === "number" && Number.isFinite(r.valor_numerico)).slice(0,2);
  const weightChange = weights.length === 2 ? Math.round((weights[0].valor_numerico! - weights[1].valor_numerico!) * 10) / 10 : null;
  const weight = latest("peso"),
    index = bmi(weight?.valor_numerico, profile?.height_cm),
    age = ageOn(profile?.birth_date, today);
  const active = devices.filter((d) => d.active),
    visible = records.filter((r) => !filter || r.tipo === filter).slice(0, 10);
  const go = (path: string) => {
    trigger("vibrate");
    router.push(path);
  };
  const open = (next: typeof panel) => {
    trigger("vibrate");
    setPanel(next);
  };
  async function archiveDevice() {
    if (!archive || !personId || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const d = devices.find((d) => d.id === archive);
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
      <div className="mx-auto max-w-xl space-y-5">
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
            <section className="overflow-hidden rounded-[28px] border border-surface-border bg-gradient-to-br from-emerald-400/[.035] to-surface p-4">
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
                    {age !== null ? `${age} anos · ` : ""}Perfil da pessoa ativa
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => open("profile")}
                  aria-label="Editar perfil de saúde"
                  className="rounded-xl bg-surface-raised p-3 text-ink-muted"
                >
                  <Settings size={18} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-[42%] shrink-0">
                  <HealthBody
                    skin={profile?.skin_tone || SKIN_TONES[2]}
                    devices={devices}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-[10px] text-ink-muted">Altura</p>
                    <p className="text-lg font-semibold">
                      {profile?.height_cm ? `${profile.height_cm} cm` : "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => open("peso")}
                    className="block text-left"
                  >
                    <p className="text-[10px] text-ink-muted">Último peso</p>
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
                  {weightChange !== null && <p className="text-[10px] text-ink-muted">{weightChange > 0 ? "+" : ""}{weightChange.toLocaleString("pt-BR")} kg desde {weights[1].data.split("-").reverse().join("/")}</p>}
                  <div>
                    <p className="text-[10px] text-ink-muted">IMC calculado</p>
                    <p className="text-lg font-semibold">{index ?? "—"}</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-ink-muted">
                A ilustração representa seu perfil e aparelhos. O IMC não mede
                composição corporal.{" "}
                {age !== null && age < 20
                  ? "A avaliação de crianças e adolescentes utiliza idade e crescimento."
                  : "Interprete com seu histórico e avaliação profissional."}{" "}
                <a
                  href="https://www.cdc.gov/bmi/about/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Fonte: CDC
                </a>
              </p>
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
            {panel === "profile" && (
              <HealthProfileEditor
                personId={personId}
                profile={profile}
                onClose={() => setPanel(null)}
              />
            )}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Minha rede de dados</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditDevice(null);
                    open("device");
                  }}
                  className="flex items-center gap-1 p-2 text-xs text-emerald-400"
                >
                  <Plus size={15} />
                  Aparelho
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
                    className="flex max-w-full items-center gap-2 rounded-2xl border border-surface-border bg-surface p-3 text-xs"
                  >
                    <HealthDeviceIcon kind={d.kind} color={d.color} />
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => go("/inteligencia/saude")}
                  className="flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-surface p-3 text-xs text-violet-300"
                >
                  <Brain size={20} />
                  Vault Intelligence
                </button>
              </div>
              {!active.length && (
                <p className="text-xs text-ink-muted">
                  Adicione relógio, anel ou medidor para identificar de onde vêm
                  suas medidas.
                </p>
              )}
              {devices.some((d) => !d.active) && (
                <details className="text-xs text-ink-muted">
                  <summary className="cursor-pointer py-2">
                    Aparelhos arquivados
                  </summary>
                  {devices
                    .filter((d) => !d.active)
                    .map((d) => (
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
              <div className="space-y-2">
                <HealthDeviceEditor
                  key={editDevice || "new"}
                  personId={personId}
                  device={devices.find((d) => d.id === editDevice)}
                  onClose={() => setPanel(null)}
                />
                {editDevice && (
                  <button
                    type="button"
                    onClick={() => setArchive(editDevice)}
                    className="w-full rounded-xl border border-surface-border p-3 text-xs text-ink-muted"
                  >
                    {devices.find((d) => d.id === editDevice)?.active
                      ? "Arquivar aparelho, preservando histórico"
                      : "Reativar aparelho"}
                  </button>
                )}
              </div>
            )}
            <HealthConnectPanel key={personId} personId={personId} personName={person?.name || "esta pessoa"} devices={devices} />
            <section className="space-y-3">
              <h2 className="font-semibold">Meus registros</h2>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(METRICS) as HealthMetric[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => open(type)}
                    className="rounded-[22px] border border-surface-border bg-surface p-4 text-left active:scale-[.98]"
                  >
                    <span
                      className={`flex items-center justify-between ${METRIC_TONES[type]}`}
                    >
                      <HealthMetricIcon type={type} />
                      <Plus size={15} />
                    </span>
                    <p className="mt-3 text-xs font-semibold">
                      {METRICS[type].label}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {loading || isLoading ? "Carregando…" : value(type)}
                    </p>
                    <div className={METRIC_TONES[type]}><HealthMetricTrend records={records} type={type} /></div>
                    {latest(type) && (
                      <p className="mt-1 text-[9px] text-ink-muted">
                        {latest(type)!.data.split("-").reverse().join("/")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
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
              className="flex w-full items-center gap-3 rounded-[22px] border border-cyan-400/15 bg-surface p-4 text-left"
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
                onClick={() => go("/saude/registros/novo")}
                className="flex items-center gap-2 rounded-2xl border border-coral/15 bg-surface p-4 text-left text-xs"
              >
                <Activity size={20} className="text-coral" />
                Sintomas e humor
              </button>
              <button
                type="button"
                onClick={() => go("/saude/registros")}
                className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface p-4 text-left text-xs"
              >
                <History size={20} className="text-ink-muted" />
                Linha de cuidado
              </button>
            </div>
            <section className="rounded-[24px] border border-surface-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Últimos registros</h2>
                <button
                  type="button"
                  onClick={() => go("/saude/registros")}
                  className="text-xs text-ink-muted"
                >
                  Ver todos
                </button>
              </div>
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
                visible.map((r) => {
                  const d = devices.find((d) => d.id === r.device_id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => go(`/saude/registros/detalhes?id=${r.id}`)}
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
                })
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
      <ConfirmationModal
        isOpen={!!archive}
        onClose={() => setArchive(null)}
        onConfirm={archiveDevice}
        isLoading={busy}
        title="Atualizar aparelho"
        message="Os registros e seus vínculos serão preservados."
        confirmLabel={
          devices.find((d) => d.id === archive)?.active
            ? "Arquivar"
            : "Reativar"
        }
      />
    </main>
  );
}
