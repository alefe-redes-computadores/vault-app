"use client";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Activity, ChevronDown, Database, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import type { RegistroSaude } from "@/lib/types";
import type { ConnectConnection, ConnectStatus } from "@/lib/health-connect/types";
import { projectHealthConnectCoverageM101 } from "@/lib/health-connect/coverage-m101";

const EMPTY_CONNECT_ROWS_M101: RegistroSaude[] = [];

/** Leitura Dexie somente ao expandir. Não ativa sensores nem sincronização. */
export function HealthConnectCoverageM101({ userId, personId, connection, status }: {
  userId?: string; personId: string; connection?: ConnectConnection | null; status?: ConnectStatus | null;
}) {
  const [open, setOpen] = useState(false);
  const linked = Boolean(userId && personId && connection?.user_id === userId && connection.person_id === personId);
  const records = useLiveQuery<RegistroSaude[]>(
    () => open && linked && userId
      ? db.registros_saude.where("[user_id+person_id]").equals([userId, personId]).toArray()
      : Promise.resolve([] as RegistroSaude[]),
    [open, linked, userId, personId]
  ) ?? EMPTY_CONNECT_ROWS_M101;
  const report = useMemo(
    () => projectHealthConnectCoverageM101(records, connection, status, userId, personId),
    [records, connection, status, userId, personId]
  );
  return (
    <section className="mt-3 rounded-2xl border border-surface-border/70 bg-void/30 p-3" aria-label="Cobertura de dados Health Connect">
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}
        className="flex w-full min-h-11 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
        <span className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300"><Database size={16}/></span>
        <span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Cobertura real das medições</strong>
          <span className="mt-1 block text-[10px] text-ink-muted">Últimos 7 e 28 dias · somente registros importados</span></span>
        <ChevronDown size={16} className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && <div className="mt-3 border-t border-surface-border/50 pt-3">
        {!report.linked ? <p className="text-xs text-ink-muted">Nenhum vínculo confirmado para a pessoa e a conta atual. Nenhum histórico é consultado de outros perfis.</p> : <>
          <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-ink-muted">
            <span className="rounded-lg bg-surface-raised px-2.5 py-2"><Activity size={13} className="mr-1 inline"/>{report.samples28} registros importados em 28 dias</span>
            <span className="rounded-lg bg-surface-raised px-2.5 py-2"><ShieldCheck size={13} className="mr-1 inline"/>{report.permittedCount}/{report.selectedCount} tipos autorizados agora</span>
          </div>
          <div className="space-y-2">
            {report.metrics.filter(metric => metric.selected).map(metric => (
              <div key={metric.metric} className="rounded-xl border border-surface-border/70 bg-surface-raised/40 px-3 py-2.5">
                <div className="flex justify-between gap-2 text-xs"><strong className="text-ink-primary">{metric.label}</strong>
                  <span className={metric.permission === "granted" ? "text-emerald-300" : "text-amber-200"}>{metric.permission === "granted" ? "Permitido" : metric.permission === "denied" ? "Não autorizado" : "Permissão não verificada"}</span>
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">{metric.days7} dia(s) com registro em 7 · {metric.days28} dia(s) em 28 · {metric.samples28} leitura(s)</p>
                <p className="mt-1 text-[10px] text-ink-muted">{metric.latestDay ? `Último registro importado: ${metric.latestDay.split("-").reverse().join("/")}` : "Nenhuma medição importada neste intervalo"}</p>
              </div>
            ))}
          </div>
          {report.selectedCount === 0 && <p className="text-xs text-ink-muted">Nenhuma métrica selecionada neste vínculo.</p>}
          <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">Um dia sem importação não equivale a valor zero. Permissão concedida não garante que o Samsung Health possua leituras naquele período. Contagem não comprova qual aparelho realizou a medição.</p>
        </>}
      </div>}
    </section>
  );
}
