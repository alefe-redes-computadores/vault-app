"use client";
import { useRef, useState } from "react";
import { Check, Save, X, Palette } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthRelationPicker } from "./HealthRelationPicker";
import { HealthDeviceIcon, HealthMetricIcon } from "./HealthDeviceIcon";
import { HEALTH_FIELD } from "./HealthMeasurementForm";
import { healthProfileRepository } from "@/lib/repositories/healthProfile";
import {
  DEVICE_KINDS,
  DEVICE_COLORS,
  SKIN_TONES,
  METRICS,
  type DeviceKind,
  type HealthMetric,
  type HealthProfile,
  type HealthDevice,
} from "@/lib/health-profile/types";
import { decimal } from "@/lib/health-profile/metrics";
import { useHapticFeedback } from "@/lib/haptics";
function ColorChoices({
  colors,
  value,
  onChange,
  label,
  custom = false,
}: {
  colors: string[];
  value: string;
  onChange: (c: string) => void;
  label: string;
  custom?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { trigger } = useHapticFeedback();
  const choose = (color: string) => { trigger("vibrate"); onChange(color); };
  return (
    <fieldset>
      <legend className="mb-2 text-xs text-ink-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${i + 1}`}
            aria-pressed={value === c}
            onClick={() => choose(c)}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
              value === c ? "border-white" : "border-slate-500/50"
            }`}
            style={{ backgroundColor: c }}
          >
            {value === c && <Check size={18} className="text-white" style={{ filter: "drop-shadow(0 1px 2px #000)" }} />}
          </button>
        ))}
        {custom && <button type="button" aria-label="Cor personalizada" aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-ink-primary"><Palette size={20} /></button>}
      </div>
      {custom && expanded && <div className="mt-3 space-y-3 rounded-2xl border border-surface-border bg-surface-raised p-3">
        <p className="text-xs text-ink-muted">Cor personalizada · escolha uma tonalidade</p>
        <div className="grid grid-cols-8 gap-2">{Array.from({length: 48}, (_, i) => {
          const hue = (i % 12) * 30, light = [25,40,55,75][Math.floor(i/12)];
          const a = 75 * Math.min(light,100-light)/100;
          const f = (n: number) => { const k = (n + hue/30)%12; return Math.round(255*(light-a*Math.max(-1,Math.min(k-3,9-k,1)))/100).toString(16).padStart(2,"0"); };
          const hex = `#${f(0)}${f(8)}${f(4)}`;
          return <button key={hex} type="button" aria-label={`Escolher ${hex}`} aria-pressed={value===hex} onClick={() => choose(hex)} className="h-9 rounded-lg border border-slate-500/40" style={{backgroundColor:hex}}>{value===hex && <Check size={16} className="mx-auto text-white" style={{filter:"drop-shadow(0 1px 2px #000)"}}/>}</button>;
        })}</div>
        <label className="flex items-center gap-3 text-xs"><span className="h-8 w-8 rounded-full border border-slate-400" style={{backgroundColor:value}}/><span>HEX</span><input aria-label="Código hexadecimal da cor" defaultValue={value} key={value} maxLength={7} onBlur={e => { if(/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase()); }} className="min-w-0 flex-1 rounded-xl border border-surface-border bg-surface p-2 text-ink-primary" /></label>
      </div>}
    </fieldset>
  );
}
export function HealthProfileEditor({
  personId,
  profile,
  onClose,
}: {
  personId: string;
  profile?: HealthProfile;
  onClose: () => void;
}) {
  const [birth, setBirth] = useState(profile?.birth_date || ""),
    [height, setHeight] = useState(profile?.height_cm?.toString() || ""),
    [skin, setSkin] = useState(profile?.skin_tone || SKIN_TONES[2]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    { trigger } = useHapticFeedback();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await healthProfileRepository.saveProfile(personId, {
        birth_date: birth || null,
        height_cm: height.trim() ? decimal(height) : null,
        skin_tone: skin,
      });
      trigger("success");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Meu perfil de saúde</h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Fechar perfil"
          className="p-2"
        >
          <X size={18} />
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        Nome e foto seguem a pessoa ativa. O peso é registrado no histórico, sem
        sobrescrever medidas anteriores.
      </p>
      <CustomDatePicker
        label="Data de nascimento (opcional)"
        value={birth}
        onChange={setBirth}
      />
      {birth && (
        <button
          type="button"
          onClick={() => setBirth("")}
          className="text-xs text-ink-muted"
        >
          Limpar nascimento
        </button>
      )}
      <label className="block space-y-2 text-xs text-ink-muted">
        <span>Altura em centímetros</span>
        <input
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Ex.: 175"
          className={HEALTH_FIELD}
        />
      </label>
      <ColorChoices
        label="Tom da ilustração"
        colors={SKIN_TONES}
        value={skin}
        onChange={setSkin}
      />
      <p role="alert" className="text-xs text-coral">
        {error}
      </p>
      <button
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 p-3 text-sm font-semibold text-void"
      >
        <Save size={17} />
        {busy ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
export function HealthDeviceEditor({
  personId,
  device,
  onClose,
}: {
  personId: string;
  device?: HealthDevice;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<DeviceKind>(device?.kind || "watch"),
    [name, setName] = useState(device?.name || ""),
    [color, setColor] = useState(device?.color || DEVICE_COLORS[0]),
    [side, setSide] = useState<HealthDevice["side"]>(device?.side || "none"),
    [caps, setCaps] = useState<HealthMetric[]>(device?.capabilities || []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    { trigger } = useHapticFeedback();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await healthProfileRepository.saveDevice(
        personId,
        { kind, name, color, side, capabilities: caps },
        device?.id
      );
      trigger("success");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-[24px] border border-surface-border bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <HealthDeviceIcon kind={kind} color={color} />
        <h2 className="flex-1 font-semibold">
          {device ? "Editar aparelho" : "Adicionar aparelho"}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Fechar aparelho"
          className="p-2"
        >
          <X size={18} />
        </button>
      </div>
      <HealthRelationPicker
        title="Tipo de aparelho"
        value={kind}
        onValueChange={(k) => setKind(k as DeviceKind)}
        className={HEALTH_FIELD}
        renderIcon={(k) => (
          <HealthDeviceIcon kind={k as DeviceKind} color={color} />
        )}
      >
        {Object.entries(DEVICE_KINDS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </HealthRelationPicker>
      <label className="block space-y-2 text-xs text-ink-muted">
        <span>Modelo ou nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="Ex.: Galaxy Watch Ultra"
          className={HEALTH_FIELD}
        />
      </label>
      <ColorChoices
        custom
        colors={DEVICE_COLORS}
        label="Cor do aparelho"
        value={color}
        onChange={setColor}
      />
      <HealthRelationPicker
        title="Lado de uso"
        value={side}
        onValueChange={(v) => setSide(v as HealthDevice["side"])}
        className={HEALTH_FIELD}
      >
        <option value="none">Não se aplica / não informado</option>
        <option value="right">Lado direito</option>
        <option value="left">Lado esquerdo</option>
      </HealthRelationPicker>
      <fieldset>
        <legend className="mb-2 text-xs text-ink-muted">
          Quais dados você utiliza desse aparelho?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(METRICS) as HealthMetric[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={caps.includes(k)}
              onClick={() =>
                setCaps((v) =>
                  v.includes(k) ? v.filter((x) => x !== k) : [...v, k]
                )
              }
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs ${
                caps.includes(k)
                  ? "border-emerald-400/40 text-emerald-400"
                  : "border-surface-border text-ink-muted"
              }`}
            >
              <HealthMetricIcon type={k} size={16} />
              <span className="flex-1">{METRICS[k].label}</span>
              {caps.includes(k) && <Check size={14} />}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-ink-muted">
        Cadastrar o aparelho permite vincular registros manuais. A sincronização
        automática será configurada separadamente.
      </p>
      <p role="alert" className="text-xs text-coral">
        {error}
      </p>
      <button
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 p-3 text-sm font-semibold text-void"
      >
        <Save size={17} />
        {busy ? "Salvando…" : "Salvar aparelho"}
      </button>
    </form>
  );
}
