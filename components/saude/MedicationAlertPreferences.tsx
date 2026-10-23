'use client';
import { useEffect, useState } from 'react';
import { BellOff, BellRing, CalendarClock, Package } from 'lucide-react';
import Link from 'next/link';
import type { Medicamento } from '@/lib/types';
import { decideMedicationAlerts, getMedicationAlertPrefs, setMedicationAlertPrefs, isAsNeededMedication, type MedicationAlertPrefs } from '@/lib/health-intelligence/medication-alert-policy';
import type { Retirada } from '@/lib/types';
import { cancelMedicationRenewalNotification, scheduleMedicationRenewalNotification } from '@/lib/notifications';

/** Local device reminders. Explicit clinical information remains visible elsewhere. */
export function MedicationAlertPreferences({med,withdrawals=[],today}:{med:Medicamento;withdrawals?:Retirada[];today:string}) {
  const [prefs,setPrefs]=useState<MedicationAlertPrefs>(()=>({stock:!isAsNeededMedication(med),prescription:!isAsNeededMedication(med)}));
  const [notice,setNotice]=useState('');
  useEffect(()=>{setPrefs(getMedicationAlertPrefs(med));setNotice('');},[med.id,med.user_id,med.person_id,med.tipo_uso]);
  const decision=decideMedicationAlerts({medication:med,withdrawals,today,prefs});
  const change=(field:keyof MedicationAlertPrefs)=>{
    const next={...prefs,[field]:!prefs[field]};
    if(setMedicationAlertPrefs(med,next)){
      setPrefs(next);setNotice('Preferências salvas neste aparelho.');
      if (field==='prescription' && med.id) {
        // Cancel native reminders immediately. The local preference alone is not enough.
        if (!next.prescription) {
          void cancelMedicationRenewalNotification(med.id).catch(()=>setNotice('Preferência salva, mas falhou ao cancelar o alarme antigo.'));
        } else {
          const effectiveDate=med.lembrete_receita_modo==='data_personalizada' && med.lembrete_receita_data ? med.lembrete_receita_data : med.proxima_renovacao;
          if (effectiveDate && decideMedicationAlerts({medication:med,withdrawals,today,prefs:next}).showPrescription)
            void scheduleMedicationRenewalNotification(med.id,med.nome,effectiveDate,med.medico||'',med.lembrete_receita_modo==='data_personalizada'?0:7).catch(()=>setNotice('Preferência salva, mas não foi possível atualizar o alarme.'));
        }
      }
    }
    else setNotice('Não foi possível salvar a preferência neste aparelho.');
  };
  const switches=[
    {field:'stock' as const,label:'Avisar sobre estoque e reposição',Icon:Package},
    {field:'prescription' as const,label:'Lembrar planejamento de receita',Icon:CalendarClock},
  ];
  return <section className="rounded-[20px] border border-emerald-400/15 bg-surface p-3.5" aria-label="Alertas individuais do medicamento">
    <div className="flex items-start gap-2.5"><BellRing className="mt-0.5 shrink-0 text-emerald-300" size={18}/><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-ink-primary">Alertas deste medicamento</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Escolha o que merece aviso. Compromissos de retirada e confirmações de doses agendadas permanecem visíveis.</p></div></div>
    <div className="mt-3 space-y-2">{switches.map(({field,label,Icon})=><button type="button" key={field} onClick={()=>change(field)} aria-pressed={prefs[field]} className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-surface-border/65 bg-void/30 px-3 py-2.5 text-left">
      <Icon size={16} className={prefs[field]?'text-emerald-300':'text-ink-muted'}/><span className="min-w-0 flex-1 text-xs font-medium text-ink-primary">{label}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${prefs[field]?'bg-emerald-400/10 text-emerald-300':'bg-surface-raised text-ink-muted'}`}>{prefs[field]?'Ativo':'Silenciado'}</span>
    </button>)}</div>
    <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">{decision.explanation}</p>
    {med.id?<Link href={`/saude/medicamentos/editar?id=${encodeURIComponent(med.id)}`} className="mt-2 inline-flex min-h-10 items-center text-[11px] font-semibold text-emerald-300 underline underline-offset-2">Escolher data do planejamento de receita</Link>:null}
    {notice?<p role="status" className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300"><BellOff size={13}/>{notice}</p>:null}
    <p className="mt-2 text-[10px] text-ink-muted">Esta preferência vale neste dispositivo, por conta, pessoa e medicamento. Não silencia alertas de segurança clínica nem sincroniza automaticamente com outros aparelhos.</p>
  </section>;
}
