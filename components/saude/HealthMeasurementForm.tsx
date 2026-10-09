"use client";
import { useRef, useState } from "react";
import { Check, Save, X } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthTimePicker } from "./HealthTimePicker";
import { HealthRelationPicker } from "./HealthRelationPicker";
import {
  HealthDeviceIcon,
  HealthMetricIcon,
  METRIC_TONES,
} from "./HealthDeviceIcon";
import {
  METRICS,
  type HealthMetric,
  type HealthDevice,
} from "@/lib/health-profile/types";
import { decimal, sleepDuration } from "@/lib/health-profile/metrics";
import { getLocalTodayISO } from "@/lib/health-utils";
import { saveHealthMeasurement } from "@/lib/repositories/healthMeasurements";
import { useHapticFeedback } from "@/lib/haptics";
export const HEALTH_FIELD =
  "w-full rounded-2xl border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary outline-none focus:border-emerald-400/50";
export function HealthMeasurementForm({
  type,
  personId,
  devices,
  onClose,
}: {
  type: HealthMetric;
  personId: string;
  devices: HealthDevice[];
  onClose: () => void;
}) {
  const now = new Date(),
    today = getLocalTodayISO(),
    time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  const [date, setDate] = useState(today),
    [hour, setHour] = useState(time),
    [value, setValue] = useState(""),
    [second, setSecond] = useState(""),
    [device, setDevice] = useState(""),
    [source, setSource] = useState<"manual" | "samsung_manual">("manual"),
    [notes, setNotes] = useState(""),
    [startDate, setStartDate] = useState(today),
    [startTime, setStartTime] = useState(""),
    [endDate, setEndDate] = useState(today),
    [endTime, setEndTime] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    id = useRef(crypto.randomUUID()),
    { trigger } = useHapticFeedback();
  const eligible = devices.filter(
    (d) => d.active && d.capabilities.includes(type)
  );
  let duration: number | null = null;
  if (type === "sono" && startTime && endTime) {
    try {
      duration = sleepDuration(
        new Date(`${startDate}T${startTime}`).toISOString(),
        new Date(`${endDate}T${endTime}`).toISOString()
      );
    } catch {
      duration = null;
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const start =
          type === "sono" && startTime
            ? new Date(`${startDate}T${startTime}`).toISOString()
            : undefined,
        end =
          type === "sono" && endTime
            ? new Date(`${endDate}T${endTime}`).toISOString()
            : undefined;
      await saveHealthMeasurement(personId, {
        id: id.current,
        type,
        value:
          type === "sono"
            ? sleepDuration(start || "", end || "")
            : decimal(value),
        second: type === "pressao_arterial" ? decimal(second) : undefined,
        date: type === "sono" ? endDate : date,
        time: type === "sono" ? endTime : hour,
        deviceId: device || null,
        source,
        start,
        end,
        notes,
      });
      trigger("success");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      trigger("error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <span className={METRIC_TONES[type]}>
          <HealthMetricIcon type={type} />
        </span>
        <h2 className="flex-1 font-semibold">
          Registrar {METRICS[type].label.toLowerCase()}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Fechar registro"
          className="p-2 text-ink-muted"
        >
          <X size={18} />
        </button>
      </div>
      {type === "sono" ? (
        <>
          <p className="text-xs text-ink-muted">
            Registre o período completo, incluindo a mudança de dia.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">Comecei a dormir</p>
              <CustomDatePicker value={startDate} onChange={setStartDate} />
              <HealthTimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">Acordei</p>
              <CustomDatePicker value={endDate} onChange={setEndDate} />
              <HealthTimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>
          <p aria-live="polite" className="text-xs text-violet-300">
            {duration !== null
              ? `Duração registrada: ${Math.floor(duration / 60)}h ${
                  duration % 60
                }min`
              : "Selecione início e fim para calcular a duração."}
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs text-ink-muted">
              <span>
                {type === "pressao_arterial"
                  ? "Sistólica"
                  : `Valor em ${METRICS[type].unit}`}
              </span>
              <input
                autoFocus
                inputMode="decimal"
                className={HEALTH_FIELD}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                placeholder={
                  type === "pressao_arterial" ? "120" : METRICS[type].unit
                }
              />
            </label>
            {type === "pressao_arterial" ? (
              <label className="space-y-2 text-xs text-ink-muted">
                <span>Diastólica</span>
                <input
                  inputMode="numeric"
                  className={HEALTH_FIELD}
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                  required
                  placeholder="80"
                />
              </label>
            ) : (
              <div className="self-end rounded-2xl bg-surface-raised p-3 text-xs text-ink-muted">
                {type === "caminhada"
                  ? "Duração observada, sem exigir passos."
                  : "Valor medido; sem estimativa automática."}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CustomDatePicker label="Data" value={date} onChange={setDate} />
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">Hora real</p>
              <HealthTimePicker value={hour} onChange={setHour} />
            </div>
          </div>
        </>
      )}
      <div className="space-y-2">
        <p className="text-xs text-ink-muted">Fonte do registro</p>
        <div className="grid grid-cols-2 gap-2">
          {(["manual", "samsung_manual"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={source === s}
              onClick={() => setSource(s)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
                source === s
                  ? "border-emerald-400/40 text-emerald-400"
                  : "border-surface-border text-ink-muted"
              }`}
            >
              {source === s && <Check size={14} />}{" "}
              {s === "manual" ? "Registro manual" : "Copiado do Samsung Health"}
            </button>
          ))}
        </div>
      </div>
      <HealthRelationPicker
        title="Aparelho que forneceu a medida"
        value={device}
        onValueChange={setDevice}
        className={HEALTH_FIELD}
        renderIcon={(id) => {
          const d = eligible.find((d) => d.id === id);
          return d ? (
            <HealthDeviceIcon kind={d.kind} color={d.color} />
          ) : (
            <HealthMetricIcon type={type} />
          );
        }}
      >
        <option value="">Sem aparelho vinculado</option>
        {eligible.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </HealthRelationPicker>
      <label className="block space-y-2 text-xs text-ink-muted">
        <span>Observações (opcional)</span>
        <textarea
          className={HEALTH_FIELD}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </label>
      <p role="alert" className="text-xs text-coral">
        {error}
      </p>
      <button
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 p-3 text-sm font-semibold text-void disabled:opacity-50"
      >
        <Save size={17} />
        {busy ? "Salvando…" : "Salvar registro"}
      </button>
    </form>
  );
}
