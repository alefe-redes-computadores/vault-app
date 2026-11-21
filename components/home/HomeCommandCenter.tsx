"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  BookHeart,
  CalendarDays,
  ChevronRight,
  Compass,
  Droplets,
  FileText,
  FlaskConical,
  FolderHeart,
  HeartPulse,
  Layers3,
  Pill,
  ReceiptText,
  Store,
  Syringe,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { ClinicalDisclosure } from "@/components/saude/ClinicalDisclosure";
import { HomeClinicalAreaTile } from "@/components/home/HomeClinicalAreaTile";
import { HomeSupplyAccessTiles } from "@/components/home/HomeSupplyAccessTiles";
import { HomeCareOrganizationTiles } from "@/components/home/HomeCareOrganizationTiles";
import { HomeVivaP4 } from "@/components/home/HomeVivaP4";
import type { HomeVivaInputP4 } from "@/lib/home/home-viva-p4";

type Props = {
  gastoMes: number;
  diferencaMes: number;
  totalRede: number;
  mode?: "all" | "primary" | "secondary";
  onOpenOccurrences?: () => void;
  viva?: HomeVivaInputP4;
};

const clinical = [
  {
    label: "Consultas",
    sub: "Agenda",
    path: "/saude/consultas",
    icon: CalendarDays,
    tone: "border-sky-400/20 bg-sky-400/[0.06] text-sky-300",
  },
  {
    label: "Exames",
    sub: "Pedidos e resultados",
    path: "/saude/exames",
    icon: FlaskConical,
    tone: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300",
  },
  {
    label: "Hidratação",
    sub: "Registros em ml",
    path: "/saude/hidratacao",
    icon: Droplets,
    tone: "border-ice/20 bg-ice/[0.06] text-ice",
  },
  {
    label: "Lembretes",
    sub: "Sua agenda de saúde",
    path: "/saude/lembretes",
    icon: Bell,
    tone: "border-amber-400/20 bg-amber-400/[0.06] text-amber-400",
  },
  {
    label: "Linha de cuidado",
    sub: "Sintomas, doses e histórico",
    path: "/saude/registros",
    icon: Activity,
    tone: "border-coral/20 bg-coral/[0.06] text-coral",
  },
] as const;

export function HomeCommandCenter({
  gastoMes,
  diferencaMes,
  totalRede,
  mode = "all",
  onOpenOccurrences,
  viva,
}: Props) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const go = (path: string) => {
    trigger("vibrate");
    router.push(path);
  };
  const [essential, setEssential] = useState(false);
  useEffect(() => {
    const sync = () => {
      try {
        setEssential(localStorage.getItem("vault:home:essential:v1") === "1");
      } catch {
        setEssential(false);
      }
    };
    sync();
    window.addEventListener("vault:home:essential-changed", sync);
    return () =>
      window.removeEventListener("vault:home:essential-changed", sync);
  }, []);

  return (
    <section
      className="vault-deferred-lg space-y-3"
      aria-label={
        mode === "primary" ? "Acessos principais da Home" : "Central do Vault"
      }
    >
      {mode !== "secondary" && (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Saúde e rotina
              </h2>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                Ações principais primeiro; demais áreas sob demanda
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => go("/saude/mapa?return_to=%2F")}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-violet-300/25 bg-violet-300/[.065] px-2.5 text-[11px] font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
                aria-label="Explorar todas as áreas de saúde"
              >
                <Compass size={15} aria-hidden="true" />
                Ver todas <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* M131: dois destinos principais, com cores e componentes canônicos. */}
          <div
            id="home-acessos-medicamentos"
            className="scroll-mt-28 space-y-2"
            aria-label="Acessos principais de saúde e medicamentos"
          >
            <div
              className={`grid min-w-0 grid-cols-2 gap-2 items-start max-[349px]:grid-cols-1 ${
                viva ? "!grid-cols-1" : ""
              }`}
              aria-label="Medicamentos e acompanhamento contextual"
            >
              <button
                type="button"
                onClick={() => go("/saude/medicamentos")}
                className={`group flex ${
                  viva ? "h-auto self-start" : "h-full"
                } min-h-[76px] w-full min-w-0 items-center gap-2 rounded-[18px] border border-emerald-300/25 bg-emerald-300/[.06] px-2.5 py-2.5 text-left touch-manipulation shadow-sm transition-colors hover:bg-surface-raised motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300`}
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"
                  aria-hidden="true"
                >
                  <Pill size={17} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <strong className="block break-words text-sm font-bold leading-snug text-ink-primary">
                    Medicamentos
                  </strong>
                  <span className="mt-1 block line-clamp-2 break-words text-xs leading-snug text-ink-muted">
                    Rotina e estoque
                  </span>
                </span>
                <ChevronRight
                  size={15}
                  className="shrink-0 text-emerald-200"
                  aria-hidden="true"
                />
              </button>
              {viva ? (
                <HomeVivaP4 data={viva} onNavigate={go} />
              ) : (
                <HomeClinicalAreaTile
                  label="Minha saúde"
                  description="CareFlow, exames, sinais e dossiê"
                  path="/saude/minha-saude"
                  Icon={HeartPulse}
                  tone="border-coral/20 bg-coral/[0.06] text-coral"
                  onNavigate={go}
                />
              )}
            </div>
            {/* Acessos operacionais continuam disponíveis no Essencial, sem ocupar a primeira dobra. */}
            <details className="group overflow-hidden rounded-[18px] border border-emerald-300/15 bg-gradient-to-r from-emerald-300/[.035] via-surface to-surface shadow-sm">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-3 py-2 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200">
                  <Store size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs font-bold text-ink-primary">
                    Retiradas e fornecimento
                  </strong>
                  <span className="block text-[10px] font-normal text-ink-muted">
                    Agenda SUS, processos e documentos
                  </span>
                </span>
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-emerald-200 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                />
              </summary>
              <div className="border-t border-emerald-300/10 p-2">
                <HomeSupplyAccessTiles
                  onNavigate={go}
                  withdrawalPath="/saude/retiradas"
                  supplyPath="/saude/fornecimento"
                />
              </div>
            </details>
          </div>
        </>
      )}
      {mode !== "primary" && (
        <>
          <button
            type="button"
            onClick={() => go("/saude/plano-seguranca")}
            className="flex min-h-12 w-full items-center gap-2.5 rounded-[18px] border border-rose-300/20 bg-rose-300/[0.045] px-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-300/10 text-rose-200">
              <BookHeart size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-xs text-ink-primary">
                Apoio humano e plano pessoal
              </strong>
              <span className="block text-[10px] text-ink-muted">
                Contatos escolhidos, CVV 188 e SAMU 192
              </span>
            </span>
            <ChevronRight size={15} className="text-rose-200" />
          </button>

          {!essential ? (
            <ClinicalDisclosure
              id="home-outras-areas"
              title="Outras áreas de saúde"
              description="Consultas, exames, registros, hidratação e segurança"
              icon={<Layers3 size={18} />}
              iconClassName="text-violet-300"
            >
              {() => (
                <div className="grid min-w-0 grid-cols-2 gap-2.5">
                  {/* M149: mesmo cartão, grid e peso visual dos demais acessos; fonte de verdade é a Central M144. */}
                  <HomeClinicalAreaTile
                    label="Ocorrências e ciclos"
                    description="Vacinas e histórico"
                    path="/saude/central-m144?return_to=%2F"
                    Icon={Syringe}
                    tone="border-violet-400/20 bg-violet-400/[0.06] text-violet-300"
                    onNavigate={(path) =>
                      onOpenOccurrences ? onOpenOccurrences() : go(path)
                    }
                  />
                  {clinical.map(({ label, sub, path, icon: Icon, tone }) => (
                    <HomeClinicalAreaTile
                      key={path}
                      label={label}
                      description={sub}
                      path={path}
                      Icon={Icon}
                      tone={tone}
                      onNavigate={go}
                    />
                  ))}
                  <HomeClinicalAreaTile
                    label="Cirurgias"
                    description="Procedimentos"
                    path="/saude/cirurgias"
                    Icon={Syringe}
                    tone="border-violet-400/20 bg-violet-400/[0.06] text-violet-300"
                    onNavigate={go}
                  />
                </div>
              )}
            </ClinicalDisclosure>
          ) : null}

          {!essential ? (
            <ClinicalDisclosure
              id="home-organizacao"
              title="Organização do cuidado"
              description="Documentos, custos e rede clínica"
              icon={<FileText size={18} />}
              iconClassName="text-amber-300"
            >
              {() => (
                <div className="space-y-2">
                  <HomeCareOrganizationTiles
                    onNavigate={go}
                    gastoMes={gastoMes}
                    diferencaMes={diferencaMes}
                    totalRede={totalRede}
                    documentPath="/saude/documentos"
                    purchasePath="/saude/renovacao"
                    networkPath="/saude/rede"
                    networkTone="text-sky-300/80"
                  />
                  <button
                    type="button"
                    onClick={() => go("/ajuda?topico=home")}
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-surface-border/50 bg-surface-raised/35 px-3 text-xs font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
                  >
                    Como usar a Home e organizar o cuidado
                  </button>
                </div>
              )}
            </ClinicalDisclosure>
          ) : null}
        </>
      )}
    </section>
  );
}
