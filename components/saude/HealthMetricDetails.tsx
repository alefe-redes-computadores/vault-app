"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, ChevronRight } from "lucide-react";
import type { RegistroSaude } from "@/lib/types";
import { METRICS, type HealthMetric, type HealthDevice } from "@/lib/health-profile/types";
import { HealthMetricIcon, HealthDeviceIcon, METRIC_TONES } from "./HealthDeviceIcon";
import { selectMetricHistory, type MetricPeriod } from "@/lib/health-profile/history";
import { HealthMetricTrend } from "./HealthMetricTrend";
export function HealthMetricDetails({type, records, devices, today, onClose, onAdd, onRecord}: {
  type: HealthMetric; records: RegistroSaude[]; devices: HealthDevice[]; today: string;
  onClose: () => void; onAdd: () => void; onRecord: (id: string) => void;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [period,setPeriod]=useState<MetricPeriod>("today");
  useEffect(() => { const el=dialog.current; el?.showModal(); return () => { el?.close(); }; }, []);
  const rows=selectMetricHistory(records,type,today,period);
  const groups=Array.from(new Set(rows.map(r=>r.data)));
  return createPortal(<dialog aria-label={`${METRICS[type].label}: histórico e evolução`} ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} className="m-auto max-h-[88dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-[28px] border border-surface-border bg-surface p-5 text-ink-primary shadow-vault backdrop:bg-black/70">
    <header className="flex items-center gap-3"><span className={METRIC_TONES[type]}><HealthMetricIcon type={type}/></span><div className="flex-1"><h2 className="font-semibold">{METRICS[type].label}</h2><p className="text-xs text-ink-muted">Seu histórico e evolução</p></div><button autoFocus type="button" onClick={onClose} aria-label="Fechar histórico" className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised"><X size={20}/></button></header>
    <div className="my-4 flex flex-wrap gap-2">{([['today','Hoje'],['7','7 dias'],['30','30 dias'],['all','Todos']] as const).map(([key,label])=><button type="button" key={key} onClick={()=>setPeriod(key)} aria-pressed={period===key} className={`rounded-xl border px-3 py-2 text-xs ${period===key?'border-emerald-400/50 text-emerald-400':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>
    <div className={`rounded-2xl border border-surface-border bg-surface-raised p-4 ${METRIC_TONES[type]}`}><p className="text-sm font-semibold">{rows.length} registro{rows.length!==1?'s':''} no período</p><HealthMetricTrend records={rows} type={type}/><p className="mt-2 text-xs text-ink-muted">Valores observados. Dias sem registro não são tratados como zero.</p></div>
    <button type="button" onClick={onAdd} className="my-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 p-3 font-semibold text-void"><Plus size={18}/>Registrar {METRICS[type].label.toLowerCase()}</button>
    {groups.map(day=><section key={day} className="mb-4"><h3 className="mb-2 text-xs font-semibold text-ink-muted">{day===today?'Hoje':day.split('-').reverse().join('/')}</h3>{rows.filter(r=>r.data===day).map(r=>{const d=devices.find(d=>d.id===r.device_id);return <button key={r.id} type="button" disabled={!r.id} onClick={()=>{if(r.id)onRecord(r.id);}} className="flex w-full items-center gap-3 border-t border-surface-border py-3 text-left"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.valor_medicao || (r.duracao_minutos!==undefined?`${r.duracao_minutos} min`:'Registrado')}</p><p className="mt-1 text-xs text-ink-muted">{r.horario || 'Sem horário'} · {r.source==='health_connect'?'Samsung Health · Health Connect':r.source==='samsung_manual'?'Samsung Health · manual':'Registro manual'}</p>{r.inicio_em && r.fim_em && <p className="mt-1 text-xs text-ink-muted">Intervalo: {new Date(r.inicio_em).toLocaleString('pt-BR')} — {new Date(r.fim_em).toLocaleString('pt-BR')}</p>}{d && <span className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><HealthDeviceIcon kind={d.kind} color={d.color} size={14}/>{d.name}</span>}</div><ChevronRight size={16} className="text-ink-muted"/></button>;})}</section>)}
    {!rows.length && <p className="py-5 text-center text-sm text-ink-muted">Nenhum registro neste período. Você pode consultar os últimos dias ou registrar uma medição.</p>}
    {type==='sono' && <p className="text-xs text-ink-muted">Sessões são apresentadas separadamente. Intervalos importados podem incluir tempo acordado; durações sobrepostas não devem ser somadas.</p>}
    {type==='frequencia_cardiaca' && <p className="text-xs text-ink-muted">A importação traz médias diárias, identificadas no detalhe de cada registro. Uma média não é uma medição em repouso.</p>}
  </dialog>, document.body);
}
