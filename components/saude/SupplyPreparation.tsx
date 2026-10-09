"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  CalendarClock,
  ExternalLink,
  CheckCircle2,
  Clock3,
  FileText,
  Stethoscope,
  Info,
} from "lucide-react";
import { useConsultas } from "@/hooks/useConsultas";
import type { Medicamento, Retirada, Document } from "@/lib/types";
import type {
  SupplyProcess,
  SupplyCycle,
  SupplyData,
  SupplyCycleReason,
} from "@/lib/health-supply/types";
import { SUPPLY_REASON_LABELS } from "@/lib/health-supply/types";
import { supplyDossier, SUS_LINKS } from "@/lib/health-supply/knowledge";
import { getLocalTodayISO } from "@/lib/health-utils";
import { healthSupplyRepository as repo } from "@/lib/repositories/healthSupply";
const input =
  "mt-1 w-full rounded-xl border border-surface-border bg-surface-raised p-3 text-sm text-ink-primary outline-none focus:border-ice/60";
const action =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ice/10 px-3 py-3 text-xs font-bold text-ice";
type Props = {
  process: SupplyProcess;
  cycle: SupplyCycle;
  data: SupplyData;
  documents: Document[];
  meds: Medicamento[];
  withdrawal?: Retirada;
  pid: string;
  run: (fn: () => Promise<unknown>, message?: string) => Promise<void>;
};
export function SupplyPreparation({
  process,
  cycle,
  data,
  documents,
  meds,
  withdrawal,
  pid,
  run,
}: Props) {
  const { consultas } = useConsultas();
  const [reason, setReason] = useState<SupplyCycleReason>(
      cycle.motivo || "outro"
    ),
    [deadline, setDeadline] = useState(cycle.preparar_ate || ""),
    [consultation, setConsultation] = useState(cycle.consulta_id || ""),
    [personal, setPersonal] = useState(!!cycle.documentos_pessoais_conferidos),
    [local, setLocal] = useState(cycle.exigencia_local || "");
  const items = data.itens.filter((i) => i.ciclo_id === cycle.id),
    dossiers = items
      .map((i) => meds.find((m) => m.id === i.medicamento_id))
      .filter((m): m is Medicamento => !!m)
      .map((m) => ({
        med: m,
        dossier: supplyDossier(
          process,
          cycle,
          m,
          data,
          documents,
          getLocalTodayISO(),
          withdrawal
        ),
      }));
  const requirements = [
    ...new Map(
      dossiers.flatMap((x) => x.dossier.requirements).map((r) => [r.tipo, r])
    ).values(),
  ];
  const editable =
      cycle.status === "preparando" || cycle.status === "protocolado",
    known = dossiers.some((x) => x.dossier.detailed),
    missing = requirements.filter((r) => !r.ready).length;
  const current = consultas.find(
    (c) =>
      c.id === cycle.consulta_id &&
      c.user_id === process.user_id &&
      c.person_id === pid
  );
  return (
    <section className="overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface">
      <div className="flex items-center gap-3 border-b border-surface-border/50 bg-gradient-to-br from-ice/10 to-transparent p-4">
        <span className="rounded-2xl bg-ice/10 p-3 text-ice">
          <ClipboardCheck size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ice">
            Roteiro do fornecimento
          </p>
          <h2 className="mt-1 text-sm font-bold text-ink-primary">
            {SUPPLY_REASON_LABELS[cycle.motivo || "outro"]}
          </h2>
        </div>
        {requirements.length ? (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              missing
                ? "bg-amber-500/10 text-amber-300"
                : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {missing
              ? `${missing} pendente${missing > 1 ? "s" : ""}`
              : "Anexos preparados"}
          </span>
        ) : null}
      </div>
      <div className="space-y-4 p-4">
        {requirements.length ? (
          <div className="space-y-2">
            {requirements.map((r) => (
              <div
                key={r.tipo}
                className="flex items-start gap-3 rounded-2xl bg-surface-raised p-3"
              >
                {r.ready ? (
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                ) : (
                  <Clock3
                    size={17}
                    className="mt-0.5 shrink-0 text-amber-300"
                  />
                )}
                <div>
                  <p className="text-xs font-semibold text-ink-primary">
                    {r.titulo}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-muted">
                    {r.responsavel} ·{" "}
                    {r.ready
                      ? r.tipo === "pessoais"
                        ? "conferência registrada"
                        : r.entregue
                        ? "entrega registrada"
                        : "anexo vinculado"
                      : "a preparar"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-ink-muted">
            {!editable
              ? "Este ciclo registra o período autorizado. Prepare um novo ciclo para renovar ou registrar alterações."
              : "Confirme a indicação do processo e a apresentação SUS de cada medicamento para receber o roteiro correspondente. Para outras indicações, consulte o checklist oficial específico."}
          </p>
        )}
        {dossiers.map(({ med, dossier: d }) =>
          d.prescriptionModel ? (
            <p
              key={med.id}
              className="rounded-xl bg-amber-500/5 p-3 text-[11px] leading-relaxed text-ink-muted"
            >
              <FileText size={14} className="mr-1 inline text-amber-300" />
              <strong className="text-ink-primary">{med.nome}</strong>:{" "}
              {d.prescriptionModel} a cada retirada.
            </p>
          ) : null
        )}
        {editable ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  repo.planCycle(pid, cycle.id, {
                    motivo: reason,
                    preparar_ate: deadline || null,
                    consulta_id: consultation || null,
                    documentos_pessoais_conferidos: personal,
                    exigencia_local: local || null,
                  }),
                "Planejamento do ciclo salvo"
              );
            }}
          >
            <label className="block text-xs text-ink-muted">
              Motivo da documentação
              <select
                className={input}
                value={reason}
                onChange={(e) => setReason(e.target.value as SupplyCycleReason)}
              >
                {Object.entries(SUPPLY_REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ink-muted">
              <CalendarClock size={14} className="mr-1 inline" />
              Preparar documentos até
              <input
                type="date"
                className={input}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
            <label className="block text-xs text-ink-muted">
              Consulta para preencher os documentos
              <select
                className={input}
                value={consultation}
                onChange={(e) => setConsultation(e.target.value)}
              >
                <option value="">Sem consulta vinculada</option>
                {consultas
                  .filter(
                    (c) =>
                      c.user_id === process.user_id &&
                      c.person_id === pid &&
                      c.status !== "cancelada"
                  )
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data.split("-").reverse().join("/")} ·{" "}
                      {c.medico || c.especialidade}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex min-h-[44px] items-center gap-3 rounded-xl bg-surface-raised p-3 text-xs text-ink-primary">
              <input
                type="checkbox"
                checked={personal}
                onChange={(e) => setPersonal(e.target.checked)}
              />
              Documentos pessoais exigidos conferidos
            </label>
            <label className="block text-xs text-ink-muted">
              Exigência informada pela unidade
              <textarea
                rows={2}
                className={input}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex.: atualizar LME e levar relatório de alteração de dose"
              />
            </label>
            <button type="submit" className={action}>
              <CheckCircle2 size={15} />
              Salvar planejamento
            </button>
          </form>
        ) : null}
        {current ? (
          <Link
            className={action}
            href={`/saude/consultas/detalhes?id=${encodeURIComponent(
              current.id!
            )}`}
          >
            <Stethoscope size={15} />
            Consulta · {current.data.split("-").reverse().join("/")}
          </Link>
        ) : editable ? (
          <Link
            className={action}
            href={`/saude/consultas/nova${
              process.medico_id
                ? `?medico_id=${encodeURIComponent(process.medico_id)}`
                : ""
            }`}
          >
            <Stethoscope size={15} />
            Agendar consulta
          </Link>
        ) : null}
        {cycle.motivo === "ajuste_dose" ? (
          <p className="rounded-xl bg-amber-500/5 p-3 text-[11px] leading-relaxed text-ink-muted">
            <Info size={14} className="mr-1 inline text-amber-300" />A
            documentação para alteração de dose deve ser confirmada com a
            unidade. Registre a exigência recebida e seu prazo acima.
          </p>
        ) : null}
        <details className="rounded-2xl border border-surface-border/60 p-3">
          <summary className="cursor-pointer text-xs font-bold text-ice">
            Formulários e dicas para a consulta
          </summary>
          <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-ink-muted">
            <p>
              Leve os documentos pessoais, a prescrição atual e os documentos
              anteriores. O médico informa diagnóstico, CID, justificativa, dose
              e quantidade; o Vault organiza os registros.
            </p>
            {known ? (
              <>
                <p>
                  No formulário de Dor Crônica, o médico registra evolução,
                  duração e classificação da dor, intensidade, tratamentos
                  prévios e justificativa de associações. Os campos médicos da
                  LME devem ser preenchidos pelo prescritor.
                </p>
                <a
                  href={SUS_LINKS.formulario}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={action}
                >
                  <ExternalLink size={14} />
                  Formulário · Dor Crônica
                </a>
                <a
                  href={SUS_LINKS.checklist}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={action}
                >
                  <ExternalLink size={14} />
                  Checklist oficial
                </a>
                <p className="text-[10px]">
                  SES/MG · checklist 12/06/2025 · conferido em 09/10/2026
                </p>
              </>
            ) : null}
            <a
              href={
                process.origem === "farmacia_popular"
                  ? SUS_LINKS.popular
                  : SUS_LINKS.formularios
              }
              target="_blank"
              rel="noopener noreferrer"
              className={action}
            >
              <ExternalLink size={14} />
              {process.origem === "farmacia_popular"
                ? "Orientações · Farmácia Popular"
                : "LME e formulários por tratamento"}
            </a>
            <p>
              Vincular o arquivo registra sua preparação. Confira assinatura,
              conteúdo e validade; a autorização permanece uma etapa própria.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
