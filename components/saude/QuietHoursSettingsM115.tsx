"use client";
import { useEffect, useState } from "react";
import { BellOff, ShieldCheck } from "lucide-react";
import { HealthTimePicker } from "@/components/saude/HealthTimePicker";
import { DEFAULT_QUIET_HOURS_M115, readQuietHoursM115, saveQuietHoursM115, type QuietHoursM115 } from "@/lib/health-reminders/quiet-hours-m115";
import { HEALTH_REMINDERS_RECONCILE_EVENT } from "@/components/HealthReminderReconciler";
export function QuietHoursSettingsM115() {
  const [value,setValue] = useState<QuietHoursM115>({...DEFAULT_QUIET_HOURS_M115});
  const [message,setMessage] = useState("");
  useEffect(()=>{setValue(readQuietHoursM115());},[]);
  function save(next:QuietHoursM115){
    try { setValue(saveQuietHoursM115(next));setMessage("Horários salvos neste aparelho. O calendário de lembretes será atualizado.");window.dispatchEvent(new Event(HEALTH_REMINDERS_RECONCILE_EVENT)); }
    catch(error){setMessage(error instanceof Error?error.message:"Não foi possível salvar.");}
  }
  return <section className="mx-auto mt-4 max-w-xl rounded-[22px] border border-violet-300/20 bg-surface p-4" aria-label="Horário de silêncio dos lembretes pessoais">
    <div className="flex items-start gap-2"><BellOff size={19} className="mt-0.5 shrink-0 text-violet-300"/><div><h2 className="text-sm font-semibold text-ink-primary">Silêncio dos lembretes personalizados</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Opcional neste dispositivo. Ocorrências dentro da janela não serão notificadas; lembretes de dose e avisos clínicos têm controles próprios.</p></div></div>
    <label className="mt-3 flex min-h-11 items-center gap-3 text-xs text-ink-secondary"><input type="checkbox" checked={value.enabled} onChange={e=>save({...value,enabled:e.target.checked})} className="size-5 accent-violet-300"/>Ativar horário de silêncio</label>
    {value.enabled?<div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-ink-muted">A partir de<HealthTimePicker value={value.start} onChange={start=>save({...value,start})}/></label><label className="text-xs text-ink-muted">Até<HealthTimePicker value={value.end} onChange={end=>save({...value,end})}/></label></div>:null}
    <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-ink-faint"><ShieldCheck size={13} className="mt-0.5 shrink-0"/>A preferência não é enviada ao servidor. Não é interpretação do humor ou de adesão a tratamento.</p>
    {message?<p role="status" className="mt-2 text-[11px] text-violet-200">{message}</p>:null}
  </section>;
}
