"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, ChevronRight } from "lucide-react";
import type { RegistroSaude } from "@/lib/types";
import { METRICS, type HealthMetric, type HealthDevice } from "@/lib/health-profile/types";
import { HealthMetricIcon, HealthDeviceIcon, METRIC_TONES } from "./HealthDeviceIcon";
import { selectMetricHistory, metricOpeningPeriod, type MetricPeriod } from "@/lib/health-profile/history";
import { healthReadingSource, healthReadingValue } from "@/lib/health-profile/avatar-readings";
import {validMetricRange,selectInsightMetricHistory,type MetricInsightRange} from "@/lib/health-profile/metric-link";
import { HealthMetricTrend } from "./HealthMetricTrend";
export function HealthMetricDetails({type, records, devices, today, onClose, onAdd, onRecord, initialRange}: {
  initialRange?:MetricInsightRange;
  type: HealthMetric; records: RegistroSaude[]; devices: HealthDevice[]; today: string;
  onClose: () => void; onAdd: () => void; onRecord: (id: string) => void;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const range=validMetricRange(initialRange,today)?initialRange:undefined;
  const [period,setPeriod]=useState<MetricPeriod|"insight">(()=>range?"insight":metricOpeningPeriod(records,type,today));
  useEffect(() => { const el=dialog.current; el?.showModal(); return () => { el?.close(); }; }, []);
  const rows=useMemo(()=>period==="insight"&&range?selectInsightMetricHistory(records,type,today,range):selectMetricHistory(records,type,today,period==="insight"?"all":period),[records,type,today,period,range]);
  const devicesByOwnerAndId=useMemo(()=>new Map(devices.filter(device=>device.id).map(device=>[`${device.user_id}:${device.person_id}:${device.id}`,device])),[devices]);
  const groupedRows=useMemo(()=>{
    const result=new Map<string,RegistroSaude[]>();
    for(const row of rows){const dayRows=result.get(row.data);if(dayRows)dayRows.push(row);else result.set(row.data,[row]);}
    return Array.from(result.entries());
  },[rows]);
  return createPortal(<dialog aria-label={`${METRICS[type].label}: histórico e evolução`} ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} className="m-auto max-h-[88dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-[28px] border border-surface-border bg-surface p-5 text-ink-primary shadow-vault backdrop:bg-black/70">
    <header className="flex items-center gap-3"><span className={METRIC_TONES[type]}><HealthMetricIcon type={type}/></span><div className="flex-1"><h2 className="font-semibold">{METRICS[type].label}</h2><p className="text-xs text-ink-muted">Seu histórico e evolução</p></div><button autoFocus type="button" onClick={onClose} aria-label="Fechar histórico" className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised"><X size={20}/></button></header>
    <div className="my-4 flex flex-wrap gap-2">{range?<button type="button" aria-pressed={period==='insight'} onClick={()=>setPeriod('insight')} className="min-h-11 rounded-xl border border-violet-400/30 px-3 py-2 text-xs text-violet-300">Período do insight</button>:null}{([['today','Hoje'],['7','7 dias'],['30','30 dias'],['all','Todos']] as const).map(([key,label])=><button type="button" key={key} onClick={()=>setPeriod(key)} aria-pressed={period===key} className={`min-h-11 rounded-xl border px-3 py-2 text-xs ${period===key?'border-emerald-400/50 text-emerald-400':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>
    {period==='insight'&&range?<p className="mb-3 text-xs text-ink-muted">Período comparado: {range.since.split('-').reverse().join('/')} a {range.until.split('-').reverse().join('/')}. Dias sem registro permanecem sem dados.</p>:null}
    <div className={`rounded-2xl border border-surface-border bg-surface-raised p-4 ${METRIC_TONES[type]}`}><p className="text-sm font-semibold">{rows.length} registro{rows.length!==1?'s':''} no período</p><HealthMetricTrend records={rows} type={type}/><p className="mt-2 text-xs text-ink-muted">Valores observados. Dias sem registro não são tratados como zero.</p></div>
    <button type="button" onClick={onAdd} className="my-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 p-3 font-semibold text-void"><Plus size={18}/>Registrar {METRICS[type].label.toLowerCase()}</button>
    {groupedRows.map(([day,dayRows])=><section key={day} className="mb-4"><h3 className="mb-2 text-xs font-semibold text-ink-muted">{day===today?'Hoje':day.split('-').reverse().join('/')}</h3>{dayRows.map(r=>{const d=devicesByOwnerAndId.get(`${r.user_id}:${r.person_id}:${r.device_id}`);return <button key={r.id} type="button" disabled={!r.id} onClick={()=>{if(r.id)onRecord(r.id);}} className="flex w-full items-center gap-3 border-t border-surface-border py-3 text-left"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{healthReadingValue(r) || r.valor_medicao || (r.duracao_minutos!==undefined?`${r.duracao_minutos} min`:'Registrado')}</p><p className="mt-1 text-xs text-ink-muted">{r.horario || 'Sem horário'} · {healthReadingSource(r.source)}</p>{r.inicio_em && r.fim_em && <p className="mt-1 text-xs text-ink-muted">Intervalo: {new Date(r.inicio_em).toLocaleString('pt-BR')} — {new Date(r.fim_em).toLocaleString('pt-BR')}</p>}{d && <span className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><HealthDeviceIcon kind={d.kind} color={d.color} size={14}/>{d.name}</span>}</div><ChevronRight size={16} className="text-ink-muted"/></button>;})}</section>)}
    {!rows.length && <p className="py-5 text-center text-sm text-ink-muted">Nenhum registro neste período. Você pode consultar os últimos dias ou registrar uma medição.</p>}
    {type==='sono' && <p className="text-xs text-ink-muted">Sessões são apresentadas separadamente. Intervalos importados podem incluir tempo acordado; durações sobrepostas não devem ser somadas.</p>}
    {type==='frequencia_cardiaca' && <p className="text-xs text-ink-muted">A importação traz médias diárias, identificadas no detalhe de cada registro. Uma média não é uma medição em repouso.</p>}
  </dialog>, document.body);
}
