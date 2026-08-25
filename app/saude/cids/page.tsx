// app/saude/cids/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  Stethoscope,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useCids } from "@/hooks/useCids";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { getCidInsights } from "@/lib/health-insights";
import { getClinicalTheme } from "@/lib/health-utils";
import { EmptyState } from "@/components/EmptyState";
import {
  ListPageHeader,
  ListSearch,
  ListCard,
} from "@/components/list";

export default function CidsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { cids } = useCids();
  const { activePersonId } = useActivePersonId();
  const [search, setSearch] = useState("");

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const medicosMap = useMemo(() => new Map(medicos.map((m) => [m.id, m])), [medicos]);

  const filteredCids = useMemo(() => {
    if (!cids) return [];
    
    let result = cids.filter((c) => {
      return !activePersonId || !c.person_id || c.person_id === activePersonId;
    });

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.codigo.toLowerCase().includes(lower) ||
          c.descricao.toLowerCase().includes(lower)
      );
    }
    return result.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [cids, search, activePersonId]);

  if (!cids) return <CardListSkeleton />;

  return (
    <PageTransition>
      <main className="relative min-h-screen bg-void pb-28">
        <ListPageHeader
          title="CIDs e Diagnósticos"
          subtitle={`${filteredCids.length} registros`}
          badgeLabel="REGISTROS CLÍNICOS"
          badgeColor="text-violet-400"
          icon={<FileText size={14} />}
          iconColor="text-violet-400"
        >
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código ou descrição..."
          />
        </ListPageHeader>

        <section className="space-y-3.5 px-5 pt-4">
          {filteredCids.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search ? "Nenhum CID encontrado" : "Nenhum CID cadastrado"}
              description={
                search
                  ? "Tente ajustar a busca."
                  : "Cadastre seus diagnósticos para acompanhar tratamentos."
              }
            />
          ) : (
            filteredCids.map((cid, index) => {
              const insight = getCidInsights(cid.codigo);
              const medico = cid.medico_id ? medicosMap.get(cid.medico_id) : null;
              const theme = getClinicalTheme(cid.descricao || cid.codigo);
              const IconComp = theme.icon;

              return (
                <ListCard
                  key={cid.id}
                  id={cid.id!}
                  color={theme.hex}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/cids/detalhes?id=${cid.id}`);
                  }}
                  delay={index * 0.025}
                  icon={<IconComp size={22} />}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                      {cid.codigo}
                    </h3>
                    <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${theme.tagClass}`}>
                      CID
                    </span>
                    {insight && (
                      <span className="shrink-0 whitespace-nowrap text-[9px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">
                        {insight.categoria}
                      </span>
                    )}
                  </div>

                  <p className="truncate text-xs text-ink-muted mt-0.5">{cid.descricao}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    {cid.data_diagnostico && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-ink-faint" />
                        {new Date(cid.data_diagnostico).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {medico && (
                      <span className="flex items-center gap-1">
                        <Stethoscope size={12} className="text-ice" />
                        Dr(a). {medico.nome}
                      </span>
                    )}
                  </div>
                </ListCard>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}