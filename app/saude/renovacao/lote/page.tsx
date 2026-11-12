"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Layers3, Loader2, PackagePlus } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { getLocalTodayISO } from "@/lib/health-utils";
import { attachManufacturerMetadata } from "@/lib/medications/manufacturer-experience";
import { PageTransition } from "@/components/PageTransition";

type Mode = "receita" | "aquisicao" | "ambos";
type Draft = { selected: boolean; mode: Mode; quantity: string; price: string; lot: string; manufacturer: string };

const displayDate = (iso: string) => iso.split('-').reverse().join('/');
const isoDate = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length !== 8) return '';
  const [day, month, year] = [digits.slice(0,2), digits.slice(2,4), digits.slice(4,8)];
  const candidate = `${year}-${month}-${day}`;
  const parsed = new Date(`${candidate}T12:00:00`);
  return parsed.getFullYear() === Number(year) && parsed.getMonth()+1 === Number(month) && parsed.getDate() === Number(day) ? candidate : '';
};
const maskDate = (value: string) => value.replace(/\D/g,'').slice(0,8).replace(/^(\d{2})(\d)/,'$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/,'$1/$2/$3');

export default function BatchRenewalPage() {
  const router = useRouter();
  const { medicamentos, isLoading } = useMedicamentos();
  const { addRenovacao } = useRenovacoes();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [date, setDate] = useState(displayDate(getLocalTodayISO()));
  const [origin, setOrigin] = useState<"comprado" | "sus">("comprado");
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const selected = useMemo(() => medicamentos.filter(item => item.id && drafts[item.id]?.selected && !completedIds.includes(item.id)), [medicamentos, drafts, completedIds]);
  const patchDraft = (id: string, patch: Partial<Draft>) => setDrafts(current => {
    const base: Draft = current[id] ?? { selected: false, mode: "aquisicao", quantity: "", price: "", lot: "", manufacturer: "" };
    return { ...current, [id]: { ...base, ...patch } };
  });

  async function save() {
    const canonicalDate = isoDate(date);
    if (!selected.length || !canonicalDate) { setMessage('Informe uma data válida.'); return; }
    const invalid = selected.find(med => drafts[med.id!].mode !== "receita" && !(Number(drafts[med.id!].quantity.replace(',', '.')) > 0));
    if (invalid) { setMessage(`Informe a quantidade de ${invalid.nome}.`); setReview(false); return; }
    setSaving(true); setMessage("");
    let completed = 0;
    try {
      for (const med of selected) {
        const id = med.id!; const draft = drafts[id];
        const onlyPrescription = draft.mode === "receita";
        const onlyAcquisition = draft.mode === "aquisicao";
        await addRenovacao({
          medicamento_id: id,
          data: canonicalDate,
          data_aquisicao: onlyPrescription ? null : canonicalDate,
          tipo_aquisicao: origin,
          quantidade: onlyPrescription ? null : Number(draft.quantity.replace(',', '.')),
          preco: onlyPrescription || !draft.price ? null : Number(draft.price.replace(',', '.')),
          lote: onlyPrescription ? null : draft.lot || null,
          observacoes: attachManufacturerMetadata(undefined, { manufacturer: onlyPrescription ? undefined : draft.manufacturer }),
          exige_nova_receita: origin === "sus" ? true : undefined,
        }, { somenteReceita: onlyPrescription, somenteAquisicao: onlyAcquisition });
        completed += 1;
        // Evita reenviar itens confirmados após falha parcial nesta sessão.
        setCompletedIds(current => current.includes(id) ? current : [...current, id]);
      }
      setMessage(`${completed} registro(s) concluído(s), cada um com histórico independente.`);
      setTimeout(() => router.push('/saude/renovacao'), 700);
    } catch (error) {
      setReview(false);
      setMessage(`${completed ? `${completed} concluído(s) nesta sessão e retirado(s) da seleção. ` : ''}${error instanceof Error ? error.message : 'Não foi possível concluir o lote.'} Antes de tentar novamente após reiniciar o app, confira os históricos.`);
    } finally { setSaving(false); }
  }

  return <PageTransition><main className="min-h-screen bg-void px-5 pb-28 pt-5 text-ink-primary">
    <header className="mb-5 flex items-center gap-3"><button type="button" onClick={() => router.back()} className="grid size-12 place-items-center rounded-2xl border border-surface-border bg-surface"><ArrowLeft/></button><div><p className="text-[10px] font-bold uppercase tracking-[.24em] text-emerald-300">Registro múltiplo</p><h1 className="text-2xl font-bold">Receitas e aquisições</h1></div></header>
    <section className="mb-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/[.05] p-4"><div className="flex gap-3"><Layers3 className="text-emerald-300"/><div><h2 className="font-bold">Uma revisão, históricos separados</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Data e origem são compartilhadas. Quantidade, preço, lote e fabricante pertencem a cada medicamento. Nenhuma dose é alterada.</p></div></div><div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Data<input type="text" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} value={date} onChange={e=>setDate(maskDate(e.target.value))} className="mt-1 min-h-11 w-full rounded-xl border border-surface-border bg-surface-raised px-3"/></label><fieldset><legend className="text-xs font-semibold">Origem</legend><div className="mt-1 grid grid-cols-2 gap-2">{([['comprado','Particular'],['sus','SUS / Governo']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={origin===value} onClick={()=>setOrigin(value)} className={`min-h-11 rounded-xl border text-xs font-semibold ${origin===value?'border-emerald-400/50 bg-emerald-400/10 text-emerald-200':'border-surface-border bg-surface-raised text-ink-muted'}`}>{label}</button>)}</div></fieldset></div></section>
    {isLoading ? <div className="grid place-items-center py-20"><Loader2 className="animate-spin"/></div> : <section className="space-y-3">{medicamentos.map(med=>{if(!med.id)return null;const d=drafts[med.id]??{selected:false,mode:'aquisicao',quantity:'',price:'',lot:'',manufacturer:''};return <article key={med.id} className={`rounded-3xl border p-4 ${d.selected?'border-emerald-400/40 bg-emerald-400/[.04]':'border-surface-border bg-surface'}`}><button type="button" onClick={()=>patchDraft(med.id!,{selected:!d.selected})} className="flex w-full items-center gap-3 text-left"><span className={`grid size-7 place-items-center rounded-full border ${d.selected?'border-emerald-300 bg-emerald-300 text-void':'border-surface-border'}`}>{d.selected&&<Check size={15}/>}</span><span className="min-w-0"><strong className="block truncate">{med.nome} <span className="text-sm text-ink-muted">{med.dosagem}</span></strong><span className="text-xs text-ink-muted">Saldo: {typeof med.estoque_quantidade==='number'?med.estoque_quantidade:'não conferido'}</span></span></button>{d.selected&&<div className="mt-4 space-y-3 border-t border-surface-border pt-4"><div className="grid grid-cols-3 gap-2">{([['receita','Receita'],['aquisicao','Aquisição'],['ambos','Ambos']] as const).map(([mode,label])=><button key={mode} type="button" onClick={()=>patchDraft(med.id!,{mode})} className={`min-h-10 rounded-xl border text-[11px] font-semibold ${d.mode===mode?'border-emerald-400/50 bg-emerald-400/10 text-emerald-200':'border-surface-border text-ink-muted'}`}>{label}</button>)}</div>{d.mode!=='receita'&&<div className="grid grid-cols-2 gap-2"><input aria-label="Quantidade" placeholder="Quantidade *" inputMode="decimal" value={d.quantity} onChange={e=>patchDraft(med.id!,{quantity:e.target.value})} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"/><input aria-label="Preço" placeholder="Preço total" inputMode="decimal" value={d.price} onChange={e=>patchDraft(med.id!,{price:e.target.value})} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"/><input aria-label="Fabricante" placeholder="Laboratório / fabricante" value={d.manufacturer} onChange={e=>patchDraft(med.id!,{manufacturer:e.target.value})} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"/><input aria-label="Lote" placeholder="Lote" value={d.lot} onChange={e=>patchDraft(med.id!,{lot:e.target.value})} className="min-h-11 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm"/></div>}</div>}</article>})}</section>}
    {message&&<p role="status" className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-sm text-amber-100">{message}</p>}
    <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] mt-5 rounded-3xl border border-surface-border bg-void/95 p-3 backdrop-blur">{review?<div className="space-y-2"><p className="text-sm font-semibold">Confirmar {selected.length} medicamento(s)?</p><p className="text-xs text-ink-muted">Cada item será auditável separadamente. Se um item falhar, os anteriores permanecem registrados e o Vault informa quantos foram concluídos.</p><button type="button" disabled={saving} onClick={()=>void save()} className="min-h-12 w-full rounded-2xl bg-emerald-300 font-bold text-void">{saving?'Salvando…':'Confirmar registros'}</button><button type="button" disabled={saving} onClick={()=>setReview(false)} className="min-h-11 w-full text-sm text-ink-muted">Voltar e revisar</button></div>:<button type="button" disabled={!selected.length} onClick={()=>setReview(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 font-bold text-void disabled:opacity-40"><PackagePlus size={18}/>Revisar {selected.length||''} registro(s)</button>}</div>
  </main></PageTransition>;
}
