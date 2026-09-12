"use client";

import { useRouter } from "next/navigation";
import { Activity, Bell, CalendarDays, ChevronRight, Droplets, FileText, FlaskConical, Network, Pill, ReceiptText, Stethoscope, Store } from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";

type Props = {
  gastoMes: number;
  diferencaMes: number;
  totalRede: number;
};

const clinical = [
  { label: "Consultas", sub: "Agenda", path: "/saude/consultas", icon: CalendarDays, tone: "border-ice/20 bg-ice/8 text-ice" },
  { label: "Exames", sub: "Pedidos e resultados", path: "/saude/exames", icon: FlaskConical, tone: "border-emerald-400/20 bg-emerald-400/8 text-emerald-400" },
  { label: "Hidratação", sub: "Registros em ml", path: "/saude/hidratacao", icon: Droplets, tone: "border-cyan-400/20 bg-cyan-400/8 text-cyan-400" },
  { label: "Lembretes", sub: "Sua agenda de saúde", path: "/saude/lembretes", icon: Bell, tone: "border-amber-400/20 bg-amber-400/8 text-amber-400" },
  { label: "Prontuário", sub: "Sintomas e evolução", path: "/saude/registros", icon: Activity, tone: "border-coral/20 bg-coral/8 text-coral" },
];

export function HomeCommandCenter({ gastoMes, diferencaMes, totalRede }: Props) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const go = (path: string) => { trigger("vibrate"); router.push(path); };

  return (
    <section className="space-y-5" aria-label="Central do Vault">
      <div>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="font-display text-sm font-semibold text-ink-primary">Saúde e rotina</h2><p className="mt-0.5 text-[10px] text-ink-muted">Ações frequentes em um só lugar</p></div><Stethoscope size={16} className="text-ice" /></div>

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => go("/saude/medicamentos")} className="col-span-2 flex items-center gap-3 rounded-[24px] border border-violet-400/25 bg-gradient-to-r from-violet-400/10 to-surface p-4 text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-300"><Pill size={21} /></div>
            <div className="min-w-0 flex-1"><p className="font-semibold text-ink-primary">Medicamentos</p><p className="mt-0.5 text-[10px] text-ink-muted">Tratamentos, estoque, doses e histórico</p></div><ChevronRight size={17} className="text-violet-300" />
          </button>

          <button type="button" onClick={() => go("/saude/retiradas")} className="col-span-2 flex items-center gap-3 rounded-[20px] border border-amber-400/20 bg-amber-400/[0.055] px-4 py-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/12 text-amber-400"><Store size={17} /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink-primary">Retiradas de medicamentos</p><p className="mt-0.5 text-[9px] text-ink-muted">Programações, locais e histórico de retirada</p></div><ChevronRight size={15} className="text-amber-400" />
          </button>

          {clinical.map(({ label, sub, path, icon: Icon, tone }) => <button type="button" key={path} onClick={() => go(path)} className={`flex min-h-[88px] items-center gap-3 rounded-[20px] border p-3 text-left ${tone}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/15"><Icon size={17} /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink-primary">{label}</p><p className="mt-0.5 line-clamp-2 text-[9px] text-ink-muted">{sub}</p></div></button>)}

          <button type="button" onClick={() => go("/saude/cirurgias")} className="flex min-h-[88px] items-center gap-3 rounded-[20px] border border-rose-400/20 bg-rose-400/8 p-3 text-left"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/15 text-rose-300"><ReceiptText size={17} /></div><div><p className="text-xs font-semibold text-ink-primary">Cirurgias</p><p className="mt-0.5 text-[9px] text-ink-muted">Procedimentos</p></div></button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2"><FileText size={15} className="text-ice" /><div><h2 className="font-display text-sm font-semibold text-ink-primary">Organização</h2><p className="text-[10px] text-ink-muted">Arquivos, custos e rede de cuidado</p></div></div>
        <div className="overflow-hidden rounded-[24px] border border-surface-border/60 bg-surface">
          <button type="button" onClick={() => go("/saude/documentos")} className="flex w-full items-center gap-3 border-b border-surface-border/50 p-4 text-left"><FileText size={18} className="text-ice" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Documentos de saúde</p><p className="text-[10px] text-ink-muted">Receitas, exames, laudos e acervo clínico</p></div><ChevronRight size={16} className="text-ink-faint" /></button>
          <button type="button" onClick={() => go("/saude/renovacao")} className="flex w-full items-center gap-3 border-b border-surface-border/50 p-4 text-left"><ReceiptText size={18} className="text-emerald-400" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Compras de medicamentos</p><p className="text-[10px] text-ink-muted">R$ {gastoMes.toFixed(2).replace(".", ",")} no mês {diferencaMes ? `· ${diferencaMes > 0 ? "+" : "-"} R$ ${Math.abs(diferencaMes).toFixed(2).replace(".", ",")}` : ""}</p></div><ChevronRight size={16} className="text-ink-faint" /></button>
          <button type="button" onClick={() => go("/saude/rede")} className="flex w-full items-center gap-3 p-4 text-left"><Network size={18} className="text-cyan-400" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Sua rede</p><p className="text-[10px] text-ink-muted">{totalRede} profissionais e locais cadastrados</p></div><ChevronRight size={16} className="text-ink-faint" /></button>
        </div>
      </div>
    </section>
  );
}
