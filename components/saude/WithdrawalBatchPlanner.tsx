"use client";

import { useState } from "react";
import { CalendarClock, Check, ChevronDown } from "lucide-react";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthTimePicker } from "@/components/saude/HealthTimePicker";
import { useToast } from "@/components/ToastProvider";
import type { Retirada } from "@/lib/types";

type Selection = {id: string; data: string; updated_at?: string};
interface Props {
  rows: Retirada[];
  onSave: (rows: Selection[], date: string, reason: string, time?: string | null) => Promise<number>;
}

export function WithdrawalBatchPlanner({rows, onSave}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("Ainda tenho estoque");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const {showToast} = useToast();
  const eligible = rows.filter(row => row.id && row.status === "agendada" && !row.renovacao_realizada_id);
  if (!eligible.length && !open) return null;

  async function save() {
    if (saving || !selected.length || !date) return;
    setSaving(true); setError("");
    try {
      const count = await onSave(selected, date, reason, time || null);
      showToast(count ? `${count} retirada${count === 1 ? " reagendada" : "s reagendadas"}` : "As retiradas já estão nesta data", "success");
      setSelected([]); setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível reagendar. Revise a seleção.");
    } finally { setSaving(false); }
  }

  return <section className="rounded-2xl border border-emerald-400/20 bg-surface">
    <button type="button" disabled={saving} aria-expanded={open} onClick={() => {setOpen(!open); setSelected([]); setError("");}}
      className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left">
      <CalendarClock size={19} className="shrink-0 text-emerald-300"/>
      <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Reorganizar retiradas</strong><span className="text-[10px] text-ink-muted">Escolha medicamentos e uma nova data</span></span>
      <ChevronDown size={16} className={`shrink-0 text-ink-muted ${open ? "rotate-180" : ""}`}/>
    </button>
    {open ? <div className="space-y-3 border-t border-surface-border/50 p-3.5">
      <p className="text-xs leading-relaxed text-ink-muted">Esta é a data da retirada, não da solicitação de receita. Nenhum recebimento ou uso será registrado.</p>
      <div className="max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-surface-border/50" role="group" aria-label="Retiradas para reagendar">
        {eligible.map(row => {
          const checked = selected.some(item => item.id === row.id);
          return <label key={row.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-surface-border/30 px-3 py-2 last:border-0">
            <input type="checkbox" checked={checked} disabled={saving} className="h-5 w-5 shrink-0 accent-emerald-400"
              onChange={() => setSelected(previous => checked ? previous.filter(item => item.id !== row.id) : [...previous, {id: row.id!, data: row.data, updated_at: row.updated_at}])}/>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink-primary">{row.medicamento_nome || "Medicamento"}</span><span className="text-[10px] text-ink-muted">{row.data.split("-").reverse().join("/")}{row.horario ? ` · ${row.horario}` : ""}{row.exige_nova_receita ? " · receita exigida pelo serviço" : ""}</span></span>
          </label>;
        })}
      </div>
      <CustomDatePicker label="Nova data de retirada" value={date} onChange={setDate} disabled={saving}/>
      <label className="block text-xs text-ink-muted">Novo horário opcional
        <HealthTimePicker value={time} onChange={setTime} className={saving ? "pointer-events-none opacity-50" : ""}/>
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Motivo do reagendamento">
        {["Ainda tenho estoque", "Aguardando receita", "Indisponível no serviço"].map(value => <button key={value} type="button" disabled={saving} aria-pressed={reason === value} onClick={() => setReason(value)} className={`min-h-11 rounded-xl border px-2.5 text-[11px] ${reason === value ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-surface-border text-ink-muted"}`}>{value}</button>)}
      </div>
      <label className="block text-xs text-ink-muted">Motivo ou observação<input value={reason} disabled={saving} onChange={event => setReason(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-ink-primary"/></label>
      {error ? <p role="alert" className="text-xs text-coral">{error}</p> : null}
      <button type="button" disabled={saving || !selected.length || !date} onClick={() => void save()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-void disabled:opacity-40">
        <Check size={16}/>{saving ? "Reagendando…" : `Confirmar ${selected.length} retirada${selected.length === 1 ? "" : "s"}`}
      </button>
      <p className="text-[10px] leading-relaxed text-ink-muted">Sem novo horário, cada retirada mantém sua hora atual. O histórico guarda data, hora anterior, novo compromisso e motivo.</p>
    </div> : null}
  </section>;
}
