"use client";

import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, CircleHelp, Database, Heart, Search, Settings, Shield, Users } from "lucide-react";

const sections = [
  { id: "conta", label: "Conta e pessoas", terms: "perfil pessoa ativa", Icon: Users },
  { id: "cuidado", label: "Cuidado e inteligência", terms: "saúde brain mapa", Icon: Heart },
  { id: "cofre", label: "Cofre pessoal", terms: "ferramentas registros documentos", Icon: Shield },
  { id: "preferencias", label: "Preferências", terms: "notificações configuração categorias tema aparência biometria lembretes", Icon: Settings },
  { id: "dados", label: "Dados e nuvem", terms: "sincronização backup exportação privacidade recuperação diagnóstico", Icon: Database },
  { id: "atualizacoes", label: "Atualizações", terms: "versão apk", Icon: Bell },
  { id: "ajuda", label: "Ajuda", terms: "suporte guias", Icon: CircleHelp },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

export function MoreArea({id, children, preview, accessibleLabel, defaultOpen = false}: {
  id: typeof sections[number]["id"]; children: ReactNode; preview: ReactNode; accessibleLabel?: string; defaultOpen?: boolean;
}) {
  const descriptor = sections.find(section => section.id === id);
  if (!descriptor) throw new Error("Seção de Mais inválida");
  const {label, Icon} = descriptor;
  return <details id={`mais-${id}`} open={defaultOpen} aria-label={accessibleLabel} tabIndex={-1} data-vault-remember-r2={id === "preferencias" ? "preferences" : `area-${id}`}
    data-vault-default-open={defaultOpen ? "1" : "0"} className="group/area min-w-0 scroll-mt-24 rounded-[22px] border border-surface-border/60 bg-surface/50">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-[22px] px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
      <Icon size={20} className="shrink-0 text-ice" aria-hidden="true"/>
      <span className="min-w-0 flex-1"><strong className="block text-sm text-ink-primary">{label}</strong><span className="block break-words text-xs text-ink-muted">{preview}</span></span>
      <ChevronDown size={18} className="shrink-0 text-ink-muted group-open/area:rotate-180" aria-hidden="true"/>
    </summary>
    <div className="min-w-0 space-y-3 border-t border-surface-border/40 p-2.5">{children}</div>
  </details>;
}

export function MoreSectionIndex() {
  const [query, setQuery] = useState("");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const visible = sections.filter(({label, terms}) => {
    const searchable = normalize(`${label} ${terms}`);
    return words.every(word => searchable.includes(word));
  });

  return (
    <nav aria-label="Seções de Mais" className="space-y-2 rounded-2xl border border-surface-border/50 bg-surface p-2">
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 focus-within:border-ice">
        <Search size={17} className="shrink-0 text-ink-muted" aria-hidden="true"/>
        <span className="sr-only">Buscar seção de Mais</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Buscar seção" className="min-w-0 flex-1 bg-transparent text-base text-ink-primary outline-none"/>
      </label>
      <ul className="flex flex-wrap gap-1.5">
        {visible.map(({id, label, Icon}) => (
          <li key={id} className="min-w-0">
            <a href={`#mais-${id}`} onClick={() => {
              const area = document.getElementById(`mais-${id}`);
              if (area instanceof HTMLDetailsElement) area.open = true;
            }} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/60 px-2 text-xs text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
              <Icon size={15} className="shrink-0 text-ice" aria-hidden="true"/>
              {label}
            </a>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p role="status" className="px-2 text-sm text-ink-muted">Nenhuma seção encontrada.</p>}
    </nav>
  );
}
