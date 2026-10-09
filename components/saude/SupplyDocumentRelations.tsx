"use client";
import Link from "next/link";
import { useHealthSupply } from "@/hooks/useHealthSupply";
export function SupplyDocumentRelations({
  documentId,
}: {
  documentId: string;
}) {
  const { data } = useHealthSupply(),
    links = data.documentos.filter((x) => x.document_id === documentId);
  if (!links.length) return null;
  return (
    <section className="rounded-[24px] border border-surface-border bg-surface p-4">
      <h2 className="text-sm font-bold text-ink-primary">
        Fornecimento vinculado
      </h2>
      <div className="mt-3 space-y-2">
        {links.map((l) => (
          <Link
            key={l.id}
            href={`/saude/fornecimento?id=${encodeURIComponent(l.processo_id)}${l.retirada_id ? `&retirada_id=${encodeURIComponent(l.retirada_id)}` : ""}`}
            className="block rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
          >
            {data.processos.find((p) => p.id === l.processo_id)?.titulo ||
              "Processo"}{" "}
            · {l.tipo} · {l.estado}
          </Link>
        ))}
      </div>
    </section>
  );
}
