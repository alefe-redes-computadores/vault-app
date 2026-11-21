"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, LockKeyhole, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import type { Consulta } from "@/lib/types";

/** Mostra apenas documento com ligação explícita; nunca converte leitura em receita ou estoque. */
export function ConsultationDocumentsP6P2R2({
  consultation,
}: {
  consultation: Consulta;
}) {
  const router = useRouter(),
    { user } = useAuth(),
    { activePersonId } = useActivePersonId();
  const id = consultation.id || "";
  const owner =
    !!id &&
    consultation.user_id === user?.id &&
    consultation.person_id === activePersonId;
  const documents = useLiveQuery(async () => {
    if (!owner || !activePersonId) return [];
    const rows = await db.documents
      .where("person_id")
      .equals(activePersonId)
      .toArray();
    return rows.filter(
      (d) =>
        d.user_id === user?.id &&
        d.person_id === activePersonId &&
        (d.id === consultation.document_id ||
          (d.entidade_tipo === "consulta" && d.entidade_id === id))
    );
  }, [id, owner, activePersonId, user?.id, consultation.document_id]);
  if (!owner) return null;
  return (
    <section
      className="space-y-2 rounded-[22px] border border-surface-border/50 bg-surface/40 p-3.5"
      aria-label="Documentos explicitamente vinculados à consulta"
    >
      <div className="flex items-center gap-2">
        <FileText size={17} className="text-sky-300" />
        <h3 className="text-sm font-semibold">Documentos da consulta</h3>
        <LockKeyhole size={13} className="text-ink-muted" />
      </div>
      {!documents?.length ? (
        <p className="text-xs leading-relaxed text-ink-muted">
          Nenhum documento vinculado explicitamente. Documentos da mesma data ou
          com texto semelhante não são associados automaticamente.
        </p>
      ) : (
        documents.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() =>
              router.push(
                `/saude/documentos/detalhes?id=${encodeURIComponent(
                  d.id || ""
                )}&return_to=${encodeURIComponent(
                  `/saude/consultas/detalhes?id=${id}`
                )}`
              )
            }
            className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-surface-border/40 bg-surface px-3 py-2 text-left"
          >
            <FileText size={17} className="shrink-0 text-sky-300" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">
                {d.title}
              </span>
              <span className="text-[11px] text-ink-muted">
                {d.type} ·{" "}
                {d.attachments?.length
                  ? `${d.attachments.length} anexo(s)`
                  : "sem anexo"}
              </span>
            </span>
            <ChevronRight size={15} className="shrink-0 text-ink-muted" />
          </button>
        ))
      )}
      <p className="text-[11px] leading-relaxed text-ink-muted">
        A leitura local de texto só aparece quando o aparelho oferece suporte.
        Nada é interpretado como prescrição, diagnóstico ou comprovação de
        aquisição.
      </p>
    </section>
  );
}
