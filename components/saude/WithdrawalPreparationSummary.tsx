"use client";
import Link from "next/link";
import { ClipboardCheck, FileText, ArrowUpRight } from "lucide-react";
import { useSupplyOverview } from "@/hooks/useSupplyOverview";
import {
  withdrawalPreparation,
  withdrawalSourceNote,
} from "@/lib/health-supply/overview";
import { getLocalTodayISO } from "@/lib/health-utils";
export function WithdrawalPreparationSummary({
  withdrawalId,
  compact = false,
}: {
  withdrawalId: string;
  compact?: boolean;
}) {
  const overview = useSupplyOverview();
  return (
    <WithdrawalPreparationView
      withdrawalId={withdrawalId}
      compact={compact}
      overview={overview}
    />
  );
}
export function WithdrawalPreparationView({
  withdrawalId,
  compact = false,
  overview,
}: {
  withdrawalId: string;
  compact?: boolean;
  overview: ReturnType<typeof useSupplyOverview>;
}) {
  if (!overview) return null;
  const r = overview.withdrawals.find((x) => x.id === withdrawalId);
  if (!r) return null;
  const source = withdrawalSourceNote(r, overview.renewals),
    own = r.observacoes?.trim();
  const prep = withdrawalPreparation(
    r,
    overview.meds.find((m) => m.id === r.medicamento_id),
    overview.data,
    overview.files,
    getLocalTodayISO()
  );
  if (compact)
    return (
      <span className="mt-2 block space-y-1 text-[10px] leading-relaxed">
        {r.status === "agendada" ? (
          <span
            className={`block ${
              prep.tone === "important"
                ? "text-coral"
                : prep.tone === "attention"
                ? "text-amber-300"
                : "text-ink-muted"
            }`}
          >
            <ClipboardCheck size={12} className="mr-1 inline" />
            {prep.pending.length ? prep.pending.join(" · ") : prep.label}
          </span>
        ) : null}
        {own || source ? (
          <span className="line-clamp-2 block text-ink-muted">
            {own || source}
          </span>
        ) : null}
      </span>
    );
  return (
    <section className="space-y-3 rounded-[24px] border border-surface-border/60 bg-surface p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink-primary">
        <ClipboardCheck size={17} className="text-ice" />O que levar nesta
        retirada
      </h2>
      {r.status === "agendada" ? (
        <>
          <p
            className={`text-xs font-semibold ${
              prep.tone === "important"
                ? "text-coral"
                : prep.tone === "attention"
                ? "text-amber-300"
                : "text-ink-muted"
            }`}
          >
            {prep.label}
          </p>
          {prep.pending.length ? (
            <ul className="space-y-1 text-xs text-ink-muted">
              {prep.pending.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          ) : null}
          {prep.recipe ? (
            <p className="text-[11px] text-ink-muted">{prep.recipe}</p>
          ) : null}
          <Link
            href={`/saude/fornecimento?medicamento_id=${encodeURIComponent(
              r.medicamento_id
            )}&retirada_id=${encodeURIComponent(r.id!)}${
              prep.process ? `&id=${encodeURIComponent(prep.process.id)}` : ""
            }`}
            className="flex min-h-[44px] items-center justify-between rounded-xl bg-ice/10 p-3 text-xs font-bold text-ice"
          >
            {prep.process
              ? "Conferir documentos e autorização"
              : "Organizar fornecimento"}
            <ArrowUpRight size={15} />
          </Link>
        </>
      ) : (
        <p className="text-xs text-ink-muted">
          Retirada encerrada · documentos e anotações permanecem no histórico.
        </p>
      )}
      {source && source !== own ? (
        <div className="rounded-2xl bg-surface-raised p-3">
          <p className="flex items-center gap-2 text-[10px] font-bold text-ice">
            <FileText size={13} />
            Observação da aquisição de origem
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted">
            {source}
          </p>
          <Link
            href={`/saude/renovacao/detalhes?id=${encodeURIComponent(
              r.renovacao_origem_id!
            )}`}
            className="mt-2 inline-block text-[11px] font-semibold text-ice"
          >
            Ver aquisição de origem
          </Link>
        </div>
      ) : null}
    </section>
  );
}
