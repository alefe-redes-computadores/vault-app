"use client";
import { ShieldCheck, Activity, Clock3 } from "lucide-react";
import type { ConnectConnection, ConnectStatus } from "@/lib/health-connect/types";
import {
  projectConnectEvidenceM100,
  HEALTH_CONNECT_SOURCE_WARNING_M100,
  UNSUPPORTED_CONNECT_METRICS_M100,
} from "@/lib/health-connect/evidence-m100";

/** Exibe fatos do vínculo e limites da origem, sem solicitar novas permissões. */
export function HealthConnectEvidenceM100({ connection, status, personId }: {
  connection?: ConnectConnection | null; status?: ConnectStatus | null; personId: string;
}) {
  const evidence = projectConnectEvidenceM100(connection, status, personId);
  const permissionLabel = evidence.permissionState === "granted" ? "Autorização verificada" :
    evidence.permissionState === "partial" ? "Permissões parciais" :
    evidence.permissionState === "denied" ? "Sem permissão ativa" : "Estado de permissão indisponível";
  return (
    <details className="mt-3 rounded-2xl border border-surface-border/70 bg-surface-raised/40 px-3 py-3">
      <summary className="flex cursor-pointer list-none items-start gap-2 text-xs font-semibold text-ink-primary">
        <ShieldCheck size={16} className="shrink-0 text-emerald-300" aria-hidden="true"/>
        <span>Origem e confiabilidade dos dados <span className="block pt-1 text-[10px] font-normal text-ink-muted">Confira a conexão e os limites da informação importada</span></span>
      </summary>
      <div className="mt-3 space-y-2 border-t border-surface-border/60 pt-3 text-[11px] leading-relaxed text-ink-muted">
        <div className="flex items-center gap-2"><Activity size={14} aria-hidden="true"/><span>{evidence.linked ? `${evidence.selectedMetrics} métricas selecionadas · ${evidence.permittedMetrics} autorizadas neste momento` : "Sem vínculo com este perfil"}</span></div>
        <div className="flex items-center gap-2"><ShieldCheck size={14} aria-hidden="true"/><span>{permissionLabel}</span></div>
        <div className="flex items-start gap-2"><Clock3 size={14} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{evidence.lastImportAt ? `Última importação concluída: ${new Date(evidence.lastImportAt).toLocaleString("pt-BR")}. ` : ""}{evidence.message}</span></div>
        <p>{HEALTH_CONNECT_SOURCE_WARNING_M100}</p>
        <p>Não são importados neste APK: {UNSUPPORTED_CONNECT_METRICS_M100.join(", ")}. Novas métricas exigem implementação nativa, autorização específica e validação separada.</p>
        <p>Valores automáticos são registros de bem-estar, não diagnósticos ou garantia de precisão clínica.</p>
      </div>
    </details>
  );
}
