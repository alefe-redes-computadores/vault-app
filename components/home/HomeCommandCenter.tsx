"use client";

import { useRouter } from "next/navigation";
import { Activity, Bell, BookHeart, CalendarDays, ChevronRight, Droplets, FileText, FlaskConical, FolderHeart, HeartPulse, Layers3, Pill, ReceiptText, Stethoscope, Store } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { ClinicalDisclosure } from "@/components/saude/ClinicalDisclosure";
import { HomeClinicalAreaTile } from "@/components/home/HomeClinicalAreaTile";
import { HomeSupplyAccessTiles } from "@/components/home/HomeSupplyAccessTiles";
import { HomeCareOrganizationTiles } from "@/components/home/HomeCareOrganizationTiles";

type Props = { gastoMes: number; diferencaMes: number; totalRede: number };

const clinical = [
  { label: "Minha saúde", sub: "Perfil, sono e medidas", path: "/saude/minha-saude", icon: HeartPulse, tone: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400" },
  { label: "Consultas", sub: "Agenda", path: "/saude/consultas", icon: CalendarDays, tone: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300" },
  { label: "Exames", sub: "Pedidos e resultados", path: "/saude/exames", icon: FlaskConical, tone: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400" },
  { label: "Hidratação", sub: "Registros em ml", path: "/saude/hidratacao", icon: Droplets, tone: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300" },
  { label: "Lembretes", sub: "Sua agenda de saúde", path: "/saude/lembretes", icon: Bell, tone: "border-amber-400/20 bg-amber-400/[0.06] text-amber-400" },
  { label: "Linha de cuidado", sub: "Sintomas, doses e histórico", path: "/saude/registros", icon: Activity, tone: "border-coral/20 bg-coral/[0.06] text-coral" },
] as const;

export function HomeCommandCenter({ gastoMes, diferencaMes, totalRede }: Props) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const go = (path: string) => { trigger("vibrate"); router.push(path); };

  return (
    <section className="vault-deferred-lg space-y-3" aria-label="Central do Vault">
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="font-display text-sm font-semibold text-ink-primary">Saúde e rotina</h2><p className="mt-0.5 text-[10px] text-ink-muted">Ações principais primeiro; demais áreas sob demanda</p></div>
        <Stethoscope size={16} className="text-ink-muted"/>
      </div>

      <div id="home-acessos-medicamentos" className="scroll-mt-28 space-y-2" aria-label="Medicamentos, retiradas e fornecimento">
        <button type="button" onClick={() => go("/saude/medicamentos")} className="col-span-2 flex min-h-12 items-center gap-2.5 rounded-[20px] border border-emerald-400/20 bg-surface px-3 py-3 w-full text-left transition-colors hover:bg-surface-raised motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300" aria-hidden="true"><Pill size={19}/></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm text-ink-primary">Medicamentos</strong><span className="mt-0.5 block text-xs text-ink-muted">Rotina, estoque e histórico</span></span><ChevronRight size={17} className="shrink-0 text-emerald-300" aria-hidden="true"/>
        </button>
        <HomeSupplyAccessTiles onNavigate={go} withdrawalPath="/saude/retiradas" supplyPath="/saude/fornecimento" />
      </div>

      <ClinicalDisclosure id="home-outras-areas" defaultOpen title="Outras áreas de saúde" description="Consultas, exames, registros, hidratação e segurança" icon={<Layers3 size={18}/>} iconClassName="text-violet-300">
        {() => <div className="grid min-w-0 grid-cols-2 gap-2.5">
          {clinical.map(({ label, sub, path, icon: Icon, tone }) => <HomeClinicalAreaTile key={path} label={label} description={sub} path={path} Icon={Icon} tone={tone} onNavigate={go} />)}
          <HomeClinicalAreaTile label="Cirurgias" description="Procedimentos" path="/saude/cirurgias" Icon={ReceiptText} tone="border-rose-400/20 bg-rose-400/[0.06] text-rose-300" onNavigate={go} />
          <HomeClinicalAreaTile label="Plano de segurança" description="Apoio e contatos" path="/saude/plano-seguranca" Icon={BookHeart} tone="border-rose-300/20 bg-rose-300/[0.055] text-rose-200" onNavigate={go} />
        </div>}
      </ClinicalDisclosure>

      <ClinicalDisclosure id="home-organizacao" title="Organização do cuidado" description="Documentos, custos e rede clínica" icon={<FileText size={18}/>} iconClassName="text-amber-300">
        {() => <div className="space-y-2"><HomeCareOrganizationTiles onNavigate={go} gastoMes={gastoMes} diferencaMes={diferencaMes} totalRede={totalRede}
          documentPath="/saude/documentos" purchasePath="/saude/renovacao" networkPath="/saude/rede" networkTone="text-emerald-300/80" />
        <button type="button" onClick={() => go("/ajuda?topico=home")} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-surface-border/50 bg-surface-raised/35 px-3 text-xs font-semibold text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">Como usar a Home e organizar o cuidado</button></div>}
      </ClinicalDisclosure>
    </section>
  );
}
