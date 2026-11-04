"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronRight, Search } from "lucide-react";
import { helpTopics, searchHelpTopics, type HelpTopic } from "@/lib/help/catalog";

const HelpTopicGuide = dynamic(() => import("@/components/help/HelpTopicGuide").then(module => module.HelpTopicGuide));

export default function HelpPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HelpTopic | null>(null);
  const topics = useMemo(() => searchHelpTopics(query), [query]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("topico")?.trim();
    if (!id || id.length > 64) return;
    const topic = helpTopics.find(entry => entry.id === id);
    if (topic) setSelected(topic);
  }, []);
  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-4 px-4 pb-32 pt-5 header-safe-top text-ink-primary">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => router.push("/mais")} aria-label="Voltar para Mais" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><ArrowLeft size={20} /></button>
        <div><h1 className="text-xl font-semibold">Ajuda e guias</h1><p className="mt-1 text-xs text-ink-muted">Descubra como organizar seu cuidado no Vault.</p></div>
      </header>
      <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-surface-border bg-surface px-3 focus-within:border-emerald-400/50">
        <Search size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
        <span className="sr-only">Buscar nos guias</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Medicamentos, receita, doses, sincronização…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-ink-faint" />
      </label>
      <p role="status" className="text-xs text-ink-muted">{topics.length} guia{topics.length === 1 ? "" : "s"} disponíve{topics.length === 1 ? "l" : "is"}</p>
      <div className="space-y-2">
        {topics.map(topic => (
          <article id={`guia-${topic.id}`} key={topic.id} className="rounded-2xl border border-surface-border bg-surface p-3">
            <button type="button" onClick={() => setSelected(topic)} className="flex min-h-12 w-full items-start gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><BookOpen size={17} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm">{topic.title}</strong><span className="mt-1 block text-xs leading-relaxed text-ink-muted">{topic.summary}</span></span>
              <ChevronRight size={16} className="mt-2 shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => router.push(topic.destination)} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">{topic.id === "commands" ? "Ir à Home e usar a lupa" : "Abrir área"}<ArrowUpRight size={15} aria-hidden="true" /></button>
          </article>
        ))}
      </div>
      {!topics.length ? <p className="rounded-2xl border border-surface-border p-4 text-sm text-ink-muted">Nenhum guia encontrado. Tente outro termo ou limpe a busca.</p> : null}
      {selected ? <HelpTopicGuide key={selected.id} topic={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
