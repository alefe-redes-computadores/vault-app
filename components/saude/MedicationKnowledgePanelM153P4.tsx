"use client";
import { Database, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Medicamento } from "@/lib/types";
import {
  knowledgeAuthorityLabel,
  resolveMedicationKnowledgeM153P4,
} from "@/lib/medication-intelligence/knowledge-resolver-m153p4";
import { MedicationOfficialGuidanceMacro1 } from "@/components/saude/MedicationOfficialGuidanceMacro1";
import { humanizeOfficialPresentation } from "@/lib/medications/visual-copy";
export function MedicationKnowledgePanelM153P4({
  medication,
}: {
  medication: Medicamento;
}) {
  const resolution = resolveMedicationKnowledgeM153P4(
    medication,
    medication.data_receita || undefined
  );
  if (!resolution.facts.length)
    return <MedicationOfficialGuidanceMacro1 medication={medication} />;
  return (
    <section
      id="conhecimento-regulatorio-m153p4"
      className="rounded-[20px] border border-surface-border/70 bg-surface/70 p-3.5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[.06] text-sky-200">
          <Database size={19} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink-primary">
            Conhecimento do medicamento
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Cadastro, catálogo e fonte oficial permanecem separados e
            auditáveis.
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {resolution.facts.map((fact, index) => (
          <details
            key={`${fact.kind}:${index}`}
            className={`rounded-xl border p-3 ${
              fact.authority === "conflict"
                ? "border-amber-400/30 bg-amber-400/[.055]"
                : "border-surface-border/70 bg-surface/55"
            }`}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-ink-muted">
                  {fact.label}
                </span>
                <strong className="mt-1 block break-words text-sm leading-relaxed text-ink-primary">
                  {fact.kind === "presentation" ? humanizeOfficialPresentation(fact.value) : fact.value}
                </strong>
                <span className="mt-1 block break-words text-[10px] font-semibold text-ink-secondary" data-vault-knowledge-authority={fact.authority}>
                  {knowledgeAuthorityLabel(fact.authority)}
                </span>
                {fact.kind === "active_ingredient" && fact.limitation ? (
                  <span className="mt-1 block break-words text-[10px] leading-snug text-ink-muted">{fact.limitation}</span>
                ) : null}
              </span>
              {fact.authority === "conflict" ? (
                <TriangleAlert size={17} className="shrink-0 text-amber-300" aria-hidden="true" />
              ) : fact.authority === "official_exact" ? (
                <ShieldCheck size={17} className="shrink-0 text-sky-300" aria-hidden="true" />
              ) : (
                <Info size={17} className="shrink-0 text-ink-muted" aria-hidden="true" />
              )}
            </summary>
            <div className="mt-2 border-t border-surface-border/60 pt-2 text-[11px] leading-relaxed text-ink-muted">
              <p className="font-semibold text-sky-200">
                {knowledgeAuthorityLabel(fact.authority)}
              </p>
              {fact.kind === "presentation" && humanizeOfficialPresentation(fact.value) !== fact.value ? (
                <details className="mt-2">
                  <summary className="min-h-9 cursor-pointer text-ink-secondary">Ver descrição técnica original</summary>
                  <p className="break-words font-mono text-[10px]">{fact.value}</p>
                </details>
              ) : null}
              {fact.source ? (
                <p className="mt-1">
                  Origem: {fact.source.label}
                  {fact.source.authority === "anvisa" ? " · Anvisa" : ""}
                </p>
              ) : null}
              {fact.catalogVersion ? (
                <p>Versão: {fact.catalogVersion}</p>
              ) : null}
              {fact.verifiedAt ? (
                <p>
                  Referência verificada/importada em{" "}
                  {new Date(fact.verifiedAt).toLocaleDateString("pt-BR")}
                </p>
              ) : null}
              {fact.declaredValue && fact.officialValue ? (
                <p className="mt-1">
                  Declarado: {fact.declaredValue} · Catálogo:{" "}
                  {fact.officialValue}
                </p>
              ) : null}
              {fact.limitation ? (
                <p className="mt-2 flex items-start gap-1.5">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  {fact.limitation}
                </p>
              ) : null}
            </div>
          </details>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
        O VAULT organiza fatos regulatórios e registros pessoais. Não
        diagnostica, não presume segurança de uma dose e não altera prescrição.
      </p>
      <div className="mt-3">
        <MedicationOfficialGuidanceMacro1 medication={medication} />
      </div>
    </section>
  );
}
