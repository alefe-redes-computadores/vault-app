"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronRight, Search, Activity, Stethoscope, FolderLock, BrainCircuit } from "lucide-react";
import { helpTopics, searchHelpTopics, type HelpTopic } from "@/lib/help/catalog";

const HelpTopicGuide = dynamic(() => import("@/components/help/HelpTopicGuide").then(module => module.HelpTopicGuide));

export default function HelpPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/mais");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HelpTopic | null>(null);
  const topics = useMemo(() => searchHelpTopics(query), [query]);
  const topicGroupsR4=useMemo(()=>{
    const groupList=[
      {name:"Rotina e medicamentos",tone:"text-emerald-300 bg-emerald-300/10 border-emerald-300/20",Icon:Activity,match:(t:HelpTopic)=>/medic|retirada|fornec|dose|today|home|sos|treatment/i.test(`${t.id} ${t.title}`)},
      {name:"Consultas e profissionais",tone:"text-sky-300 bg-sky-300/10 border-sky-300/20",Icon:Stethoscope,match:(t:HelpTopic)=>/consult|exam|medic[oa]s|profiss|cirurg|rede|hospital|farmac/i.test(`${t.id} ${t.title}`)},
      {name:"Documentos e cofre",tone:"text-amber-300 bg-amber-300/10 border-amber-300/20",Icon:FolderLock,match:(t:HelpTopic)=>/docum|cofre|vault|cart[aã]o|senha|segur|receita|anexo|export|recuper/i.test(`${t.id} ${t.title}`)},
      {name:"Inteligência e Fênix",tone:"text-violet-300 bg-violet-300/10 border-violet-300/20",Icon:BrainCircuit,match:(t:HelpTopic)=>/brain|f[eê]nix|intelig|avatar|pharma|visual/i.test(`${t.id} ${t.title}`)},
    ];
    const sections=groupList.map(g=>({...g,items:[] as HelpTopic[]}));
    for(const item of topics){const index=groupList.findIndex(g=>g.match(item));sections[index>=0?index:0].items.push(item);}
    return sections.filter(g=>g.items.length>0);
  },[topics]);
  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    const requested=params.get("return_to");
    if(requested && requested.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") && !/[\r\n]/.test(requested))setReturnTo(requested);
    const id = params.get("topico")?.trim();
    if (!id || id.length > 64) return;
    const topic = helpTopics.find(entry => entry.id === id);
    if (topic) setSelected(topic);
  }, []);
  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-4 px-4 pb-32 pt-5 header-safe-top text-ink-primary">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => router.push(returnTo)} aria-label="Voltar à origem da ajuda" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><ArrowLeft size={20} /></button>
        <div><h1 className="text-xl font-semibold">Ajuda e guias</h1><p className="mt-1 text-xs text-ink-muted">Descubra como organizar seu cuidado no Vault.</p></div>
      </header>
      <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-surface-border bg-surface px-3 focus-within:border-emerald-400/50">
        <Search size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
        <span className="sr-only">Buscar nos guias</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Medicamentos, receita, doses, sincronização…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-ink-faint" />
      </label>
      <p role="status" className="text-xs text-ink-muted">{topics.length} guia{topics.length === 1 ? "" : "s"} disponíve{topics.length === 1 ? "l" : "is"}</p>
      <div className="space-y-4">
        {topicGroupsR4.map(group => <section key={group.name} className="space-y-2" aria-label={group.name}>
          <h2 className="flex items-center gap-2 text-xs font-bold text-ink-secondary"><group.Icon size={15} className={group.tone.split(" ")[0]} aria-hidden="true"/>{group.name}<span className="font-mono text-[10px] text-ink-muted">{group.items.length}</span></h2>
        {group.items.map(topic => (
          <article id={`guia-${topic.id}`} key={topic.id} className={`rounded-2xl border bg-surface p-3 ${group.tone.split(" ").slice(2).join(" ")}`}>
            <button type="button" onClick={() => setSelected(topic)} className="flex min-h-12 w-full items-start gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${group.tone}`}><BookOpen size={17} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm">{topic.title}</strong><span className="mt-1 block text-xs leading-relaxed text-ink-muted">{topic.summary}</span></span>
              <ChevronRight size={16} className="mt-2 shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => router.push(topic.destination)} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">{topic.id === "commands" ? "Ir à Home e usar a lupa" : "Abrir área"}<ArrowUpRight size={15} aria-hidden="true" /></button>
          </article>
        ))}
        </section>)}
      </div>
      {!topics.length ? <p className="rounded-2xl border border-surface-border p-4 text-sm text-ink-muted">Nenhum guia encontrado. Tente outro termo ou limpe a busca.</p> : null}
      {selected ? <HelpTopicGuide key={selected.id} topic={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
