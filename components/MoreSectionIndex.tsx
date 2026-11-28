"use client";

import { useState } from "react";
import { Bell, CircleHelp, Database, Heart, Search, Settings, Shield, Users } from "lucide-react";

const sections = [
  { id: "conta", label: "Conta e pessoas", terms: "perfil pessoa ativa", Icon: Users },
  { id: "cuidado", label: "Cuidado e inteligência", terms: "saúde brain mapa", Icon: Heart },
  { id: "cofre", label: "Cofre pessoal", terms: "ferramentas registros documentos", Icon: Shield },
  { id: "preferencias", label: "Preferências", terms: "notificações configuração categorias", Icon: Settings },
  { id: "dados", label: "Dados e nuvem", terms: "sincronização backup exportação privacidade recuperação", Icon: Database },
  { id: "atualizacoes", label: "Atualizações", terms: "versão apk", Icon: Bell },
  { id: "ajuda", label: "Ajuda", terms: "suporte guias", Icon: CircleHelp },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
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
            <a href={`#mais-${id}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-surface-border/60 px-2 text-xs text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
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
