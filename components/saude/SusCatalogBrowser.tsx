"use client";
import { useDeferredValue, useState } from "react";
import {
  Search,
  Library,
  ExternalLink,
  Package,
  ChevronDown,
} from "lucide-react";
import {
  searchSusCatalog,
  SUS_SOURCES,
  SUS_CATALOG,
  catalogIndications,
} from "@/lib/health-supply/catalog";
import { triggerHaptic } from "@/lib/haptics";
export function SusCatalogBrowser() {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [origin, setOrigin] = useState("estadual_ceaf"),
    [indication, setIndication] = useState("");
  const deferred = useDeferredValue(query),
    rows = open ? searchSusCatalog(deferred, origin, indication, 30) : [];
  return (
    <section className="overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          try {
            triggerHaptic("light");
          } catch {}
        }}
        className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left"
      >
        <span className="rounded-2xl bg-ice/10 p-3 text-ice">
          <Library size={20} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-ink-primary">
            Catálogo SUS
          </span>
          <span className="mt-1 block text-[11px] text-ink-muted">
            {SUS_CATALOG.length} registros · CEAF/MG e Farmácia Popular
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-ink-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-surface-border/50 p-4">
          <label className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3">
            <Search size={17} className="shrink-0 text-ice" />
            <input
              aria-label="Buscar medicamento, indicação ou CID"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink-primary outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Medicamento, indicação ou CID"
            />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              aria-label="Programa"
              className="w-full rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                setIndication("");
              }}
            >
              <option value="estadual_ceaf">CEAF · Minas Gerais</option>
              <option value="farmacia_popular">
                Farmácia Popular · Brasil
              </option>
            </select>
            <select
              aria-label="Indicação"
              className="w-full rounded-xl bg-surface-raised p-3 text-xs text-ink-primary"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
            >
              <option value="">Todas as indicações</option>
              {catalogIndications(origin).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-muted">
            Consulte as apresentações e condições oficiais. A presença no elenco
            depende dos critérios do tratamento e do atendimento da unidade; não
            informa estoque disponível.
          </p>
          <div className="max-h-[420px] space-y-2 overflow-y-auto overscroll-contain">
            {rows.length ? (
              rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-surface-border/50 bg-surface-raised p-3"
                >
                  <p className="flex items-start gap-2 text-xs font-bold text-ink-primary">
                    {row.natureza === "insumo" ? (
                      <Package size={15} className="shrink-0 text-amber-300" />
                    ) : null}
                    {row.medicamento}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {row.apresentacao}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold text-ice">
                    {row.indicacao}
                    {row.cids.length ? ` · ${row.cids.join(", ")}` : ""}
                  </p>
                  {row.programa === "farmacia_popular" &&
                  row.medicamento === "fralda geriátrica" ? (
                    <p className="mt-2 rounded-xl bg-amber-500/5 p-2 text-[10px] leading-relaxed text-ink-muted">
                      Exige comprovação médica da necessidade. O programa prevê
                      pessoas com 60 anos ou mais ou pessoas com deficiência;
                      neste último caso, o documento deve informar o CID.
                      Consulte as orientações oficiais.
                    </p>
                  ) : null}
                  {row.natureza === "insumo" ? (
                    <p className="mt-1 text-[10px] text-ink-muted">
                      Insumo · referência informativa, separado de doses de
                      medicamentos
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="p-3 text-xs text-ink-muted">
                Nenhum registro encontrado nesta versão.
              </p>
            )}
          </div>
          <p className="text-[10px] text-ink-muted">
            Até 30 resultados por busca. Refine o texto ou a indicação.
          </p>
          {SUS_SOURCES.filter((s) =>
            origin === "estadual_ceaf"
              ? s.id.startsWith("ses-mg")
              : s.id.startsWith("ms-")
          ).map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] font-semibold text-ice"
            >
              <ExternalLink size={14} />
              {s.titulo} · {s.publicado_em.split("-").reverse().join("/")}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
