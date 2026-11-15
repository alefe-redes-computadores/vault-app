"use client";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { ActiveProbePreferences } from "@/lib/health-intelligence/active-probing/types";
import { ACTIVE_PROBE_DEFAULT_PREFS } from "@/lib/health-intelligence/active-probing/consent-m153";

export function BrainActiveProbeConsentPanel({ preferences, onSave }: {
  preferences: ActiveProbePreferences;
  onSave: (requested: ActiveProbePreferences) => void;
}) {
  const [draft, setDraft] = useState<ActiveProbePreferences>({ ...preferences });
  const [error, setError] = useState("");
  const options: Array<[keyof Pick<ActiveProbePreferences,"manufacturer"|"confirmedSos"|"temporaryCourse"|"fourAxes">,string]> = [
    ["manufacturer", "Percepcoes sobre lotes iniciados por mim"],
    ["confirmedSos", "Acompanhamento apos SOS tomado e registrado"],
    ["temporaryCourse", "Revisao apos ciclo temporario confirmado"],
    ["fourAxes", "Contexto de mudancas nos quatro eixos"],
  ];
  const chosen = options.some(([field]) => draft[field]);
  const save = () => {
    try { onSave({ ...draft, enabled: chosen, consentVersion: chosen ? 1 : 0 }); setError(""); }
    catch { setError("Nao foi possivel salvar a preferencia neste aparelho."); }
  };
  return <section aria-label="Preferencias das perguntas do Brain" className="rounded-[22px] border border-violet-400/20 bg-surface p-4">
    <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 text-violet-300" size={19}/><div><h2 className="text-sm font-semibold text-ink-primary">Perguntas opcionais do Brain</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Desligadas por padrao. Escolha o que deseja acompanhar nesta pessoa. No maximo duas novas perguntas a cada sete dias. Respostas nao sao diagnostico.</p></div></div>
    <fieldset className="mt-3 space-y-2"><legend className="sr-only">Assuntos permitidos</legend>{options.map(([field,label]) => <label key={field} className="flex min-h-11 items-center gap-3 rounded-xl border border-surface-border/60 px-3 py-2 text-xs text-ink-primary"><input type="checkbox" className="size-4 accent-violet-400" checked={draft[field]===true} onChange={event=>setDraft(previous=>({...previous,[field]:event.target.checked}))}/><span>{label}</span></label>)}</fieldset>
    {error && <p role="alert" className="mt-2 text-xs text-amber-300">{error}</p>}
    <button type="button" disabled={!chosen} onClick={save} className="mt-3 min-h-11 w-full rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 text-xs font-semibold text-violet-200 disabled:opacity-50">Ativar somente os assuntos selecionados</button>
    <button type="button" onClick={()=>{setDraft({...ACTIVE_PROBE_DEFAULT_PREFS});try{onSave({...ACTIVE_PROBE_DEFAULT_PREFS});setError("");}catch{setError("Nao foi possivel desativar nesta sessao.");}}} className="mt-2 min-h-11 w-full text-xs text-ink-muted">Desativar todas as perguntas nesta pessoa</button>
    <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">Preferencia guardada apenas neste aparelho. A desativacao interrompe novas perguntas; nao apaga historico ja registrado.</p>
  </section>;
}
