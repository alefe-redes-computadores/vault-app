"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getVaultTreatmentIcon } from "@/lib/health-profile/treatment-icon";
import { catalogPackagesForMedicationUXR4 } from "@/lib/medications/catalog-packaging-ux-r4";
import { ArrowUpRight, Brain, CalendarClock, ChevronRight, Clock3, Factory, FileCheck2, FilePenLine, History, Layers3, Package, Pill, Repeat2, ShieldCheck, ShoppingBag, X } from "lucide-react";

export type Medication360Tab = "ficha" | "rotina" | "estoque" | "receita" | "acoes";
export type Medication360Treatment = { id?: string; name: string; color?: string | null };
export type Medication360Conflict = { declared: string; reference: string; limitation?: string };
export type Medication360Value = {
  id: string;
  name: string;
  dosage: string;
  activeIngredient: string;
  icon: ReactNode;
  initialTab: Medication360Tab;
  manufacturer: string | null;
  catalogManufacturer: string | null;
  declaredManufacturer: string | null;
  form: string | null;
  route: string;
  officialPresentations: string | null;
  catalogCoverage: "verified" | "partial" | "declared_only" | "unavailable";
  regulatoryClass: string | null;
  origin: string | null;
  regime: string;
  dose: string;
  schedules: string[];
  todayLabel: string;
  todayDetail: string;
  stockLabel: string;
  stockDetail: string;
  stockReview: string | null;
  regulatory: { label: string; detail: string; source: string | null; verified: boolean; authority: string; declared: string | null };
  prescriptionDate: string | null;
  renewalDate: string | null;
  treatments: Medication360Treatment[];
  conflicts: Medication360Conflict[];
  provenance: ReactNode;
  controls: ReactNode[];
  detailHref: string;
  editHref: string;
};
const sections: { id: Medication360Tab; title: string; Icon: typeof Pill }[] = [
  {id:"ficha",title:"Ficha",Icon:Pill},
  {id:"rotina",title:"Rotina",Icon:Clock3},
  {id:"estoque",title:"Estoque",Icon:Package},
  {id:"receita",title:"Receita",Icon:FileCheck2},
  {id:"acoes",title:"Ações",Icon:Layers3},
];
function presentationChipsP0(raw:string|null,dosage:string,form:string|null){
  const reviewed=catalogPackagesForMedicationUXR4(raw,dosage,form);
  if (!reviewed.options.length) return <div className="mt-2 space-y-2">
    <p className="text-[11px] text-ink-muted">Não foi possível confirmar embalagens para esta concentração e forma farmacêutica. Confira a descrição original.</p>
    {raw && <details className="text-[10px] text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">Conferir referência técnica original</summary><p className="break-words rounded-lg border border-surface-border/50 p-2">{raw}</p></details>}
  </div>;
  return <div className="mt-2 space-y-2"><p className="text-[10px] text-ink-muted">Embalagens encontradas no catálogo — não são caixas registradas ou adquiridas.</p>
    <div className="flex flex-wrap gap-2" aria-label="Embalagens encontradas no catálogo">{reviewed.options.map(option=><span key={option.size} title={option.original} className="inline-flex min-h-8 items-center rounded-lg border border-sky-300/25 bg-sky-300/[.055] px-2.5 py-1 text-[11px] font-medium text-sky-100">{option.label}</span>)}</div>
    <details className="text-[10px] text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">Conferir descrição técnica original</summary><p className="break-words rounded-lg border border-surface-border/50 p-2">{raw}</p></details>
  </div>;
}
const rowClass = "flex min-h-11 items-center gap-2.5 rounded-xl border border-surface-border/45 bg-surface/45 px-3 py-2.5";
const labelClass = "text-[10px] font-medium text-ink-muted";
const valueClass = "mt-1 break-words text-xs font-semibold text-ink-primary";
function Field({icon, label, value}:{icon:ReactNode;label:string;value:string}){
  return <div className="min-w-0 rounded-xl border border-surface-border/45 bg-surface/55 p-3">
    <div className="flex items-center gap-1.5 text-ink-muted">{icon}<span className={labelClass}>{label}</span></div>
    <p className={valueClass}>{value}</p>
  </div>;
}
function toBrazilianDate(input:string|null){
  if (!input) return "Não informada";
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y,m,d]=input.slice(0,10).split("-");
    return `${d}/${m}/${y}`;
  }
  return input;
}
/** Apenas projeção de dados e handlers do cadastro. Nunca cria tomada, receita, estoque ou retirada. */
export function MedicationSheet360R3({value,onClose,onNavigate}:{value:Medication360Value|null;onClose:()=>void;onNavigate:(href:string)=>void}){
  const [tab,setTab]=useState<Medication360Tab>("ficha");
  const [keptConflictKeys,setKeptConflictKeys]=useState<string[]>([]);
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!value)return;
    setTab(value.initialTab);
    setKeptConflictKeys([]);
    const original=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame=requestAnimationFrame(()=>closeRef.current?.focus());
    const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();onClose();}};
    document.addEventListener("keydown",escape);
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener("keydown",escape);original?.focus();};
  },[value,onClose]);
  if(!value)return null;
  const navigate=(href:string)=>{onClose();onNavigate(href);};
  return <div className="fixed inset-0 z-[105] flex items-end justify-center bg-black/75 px-2 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm min-[520px]:items-center"
      role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="vault-med360-title" data-vault-med360-sheet
      className="flex max-h-[min(89dvh,790px)] w-full max-w-[470px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-surface-border/70 bg-surface-raised shadow-2xl">
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-surface-border"/>
      <header className="flex shrink-0 items-start gap-3 px-4 pb-3 pt-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border/60 bg-surface text-ink-secondary">{value.icon}</span>
        <div className="min-w-0 flex-1">
          <h2 id="vault-med360-title" className="break-words font-display text-base font-bold uppercase tracking-[.018em] text-ink-primary">{value.name} <span className="font-medium text-ink-muted">{value.dosage}</span></h2>
          <p className="mt-1 line-clamp-2 break-words text-[11px] text-ink-muted">{value.activeIngredient || "Princípio ativo não confirmado no catálogo"}</p>
          <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${value.regulatory.verified && /notifica[cç][aã]o\s+a/i.test(value.regulatory.label) ? "border-amber-400/30 bg-amber-400/[.06] text-amber-200" : value.regulatory.verified && /notifica[cç][aã]o\s+b/i.test(value.regulatory.label) ? "border-sky-400/30 bg-sky-400/[.06] text-sky-200" : "border-surface-border/50 bg-surface/60 text-ink-secondary"}`}><ShieldCheck size={12}/>{value.regulatory.label}</span>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar Gaveta 360" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border text-ink-secondary active:scale-95"><X size={17}/></button>
      </header>
      <div role="tablist" aria-label="Assuntos do medicamento" className="grid shrink-0 grid-cols-5 gap-1 border-y border-surface-border/45 px-2 py-2">
        {sections.map(({id,title,Icon})=><button key={id} role="tab" type="button" aria-selected={tab===id} aria-controls="med360-tabpanel" onClick={()=>setTab(id)}
          className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 text-[10px] font-semibold transition-colors active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${tab===id?"border-white bg-white text-slate-950 shadow-sm":"border-surface-border/50 bg-surface/45 text-ink-secondary"}`}><Icon size={13} className="hidden min-[410px]:block"/>{title}</button>)}
      </div>
      <div role="tabpanel" id="med360-tabpanel" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {tab==="ficha" && <>
          <h3 className="text-sm font-semibold text-ink-primary">Ficha técnica e procedência</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field icon={<Factory size={14}/>} label="Fabricante" value={value.manufacturer || value.declaredManufacturer || "Não informado"}/>
            <Field icon={<Pill size={14}/>} label="Via de uso" value={value.route}/>
            <Field icon={<Pill size={14}/>} label="Dose cadastrada" value={value.dose || "Não informada"}/>
            <Field icon={<ShoppingBag size={14}/>} label="Origem" value={value.origin || "Não informada"}/>
          </div>
          <p className="rounded-lg border border-surface-border/40 bg-surface/30 px-3 py-2 text-[11px] text-ink-muted">Fabricante no catálogo: {value.catalogManufacturer || "não identificado"} · {value.regulatory.authority}. Cadastro e aquisição são fontes diferentes; não presumir lote físico.</p>
          <div className="rounded-xl border border-surface-border/45 bg-surface/45 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-ink-primary"><FileCheck2 size={15} className="text-sky-300"/>Apresentações no catálogo</p>
            {presentationChipsP0(value.officialPresentations,value.dosage,value.form)}
            <p className="mt-1 text-[10px] text-ink-muted">{value.catalogCoverage === "verified" && catalogPackagesForMedicationUXR4(value.officialPresentations,value.dosage,value.form).options.length ? "Embalagens compatíveis com a referência" : value.catalogCoverage === "partial" ? "Referência parcial: confira concentração e forma" : "Dados declarados ou referência não disponível"}. A apresentação encontrada não determina a posologia.</p>
          </div>
          {value.declaredManufacturer && value.manufacturer && value.declaredManufacturer!==value.manufacturer && <p className="rounded-lg border border-surface-border/45 p-2 text-[11px] text-ink-secondary">Fabricante da etiqueta: {value.declaredManufacturer}. A última aquisição pode ter outro fabricante.</p>}
          <div className="rounded-xl border border-surface-border/40 bg-surface/30 p-2.5">{value.provenance}</div>

          <section className="space-y-2 border-t border-surface-border/40 pt-3" aria-label="Tratamentos vinculados">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-primary"><Brain size={16} className="text-ink-muted"/>Tratamentos vinculados</h3>
          {value.treatments.length ? value.treatments.map((t,i)=>{
            const TreatmentIcon = getVaultTreatmentIcon(t.name);
            return <div key={`${t.id||"noid"}-${i}`} className={rowClass}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-surface-border/50 bg-surface" style={t.color?{color:t.color}:undefined}><TreatmentIcon size={16}/></span>
            <span className="min-w-0 flex-1 break-words text-xs font-semibold text-ink-primary">{t.name}</span>
            {t.id && <button type="button" onClick={()=>navigate(`/saude/tratamentos/detalhes?id=${encodeURIComponent(t.id!)}`)} className="grid size-11 shrink-0 place-items-center rounded-lg border border-surface-border/60" aria-label={`Abrir tratamento ${t.name}`}><ChevronRight size={17}/></button>}
          </div>;}):<p className="rounded-xl border border-surface-border/40 bg-surface/35 p-3 text-xs text-ink-muted">Nenhum tratamento explicitamente vinculado a este medicamento.</p>}
          </section>
        </>}
        {tab==="rotina" && <>
          <h3 className="text-sm font-semibold text-ink-primary">Rotina registrada</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field icon={<Repeat2 size={14}/>} label="Regime" value={value.regime}/>
            <Field icon={<Pill size={14}/>} label="Quantidade por dose" value={value.dose||"Não informada"}/>
          </div>
          <div className={rowClass}><Clock3 size={17} className="shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{value.todayLabel}</p><p className={labelClass}>{value.todayDetail}</p></div></div>
          <div className={rowClass}><CalendarClock size={17} className="shrink-0 text-ink-muted"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold">Horários cadastrados</p><p className={labelClass}>{value.schedules.length?value.schedules.join(" · "):"Sem horários disponíveis"}</p></div></div>
          <p className="text-[11px] text-ink-muted">Horários e previsões não registram tomadas automaticamente. Dose extra e SOS usam os fluxos existentes.</p>
        </>}
        {tab==="estoque" && <>
          <h3 className="text-sm font-semibold text-ink-primary">Estoque e fornecimento</h3>
          <Field icon={<Package size={15}/>} label="Saldo clínico registrado" value={value.stockLabel}/>
          <p className="rounded-xl border border-surface-border/50 bg-surface/40 p-3 text-xs text-ink-secondary">{value.stockDetail}</p>
          {value.stockReview && <p className="rounded-xl border border-amber-400/25 bg-amber-400/[.065] p-3 text-xs text-amber-200">Unidade a conferir: {value.stockReview}</p>}
          <p className="text-[11px] text-ink-muted">Aquisição, receita, retirada programada e recebimento confirmado são eventos diferentes. Esta gaveta não movimenta estoque.</p>
        </>}
        {tab==="receita" && <>
          <h3 className="text-sm font-semibold text-ink-primary">Receita e classificação regulatória</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field icon={<ShieldCheck size={14}/>} label="Modelo de receituário" value={value.regulatory.label}/>
            <Field icon={<FileCheck2 size={14}/>} label="Origem da evidência" value={value.regulatory.source||"Cadastro local"}/>
            {value.regulatoryClass && <Field icon={<ShieldCheck size={14}/>} label="Lista regulatória" value={value.regulatoryClass}/>}
            <Field icon={<FilePenLine size={14}/>} label="Tipo declarado" value={value.regulatory.declared||"Não informado"}/>
            <Field icon={<CalendarClock size={14}/>} label="Data da receita" value={toBrazilianDate(value.prescriptionDate)}/>
          </div>
          <p className="rounded-xl border border-surface-border/50 bg-surface/40 p-3 text-[11px] text-ink-secondary">{value.regulatory.detail} · {value.regulatory.verified?"Classificação regulatória confirmada na referência do catálogo.":"Classificação não confirmada pelo catálogo; pode refletir o cadastro declarado."}</p>
          <p className="text-xs text-ink-muted">Renovação registrada: {toBrazilianDate(value.renewalDate)}</p>
          {value.conflicts.filter(c=>!keptConflictKeys.includes(`${c.declared}:${c.reference}`)).map((c,i)=><div key={i} className="rounded-xl border border-amber-400/30 bg-amber-400/[.065] p-3">
            <p className="flex items-center gap-1 text-xs font-bold text-amber-200"><FilePenLine size={15}/>Sugestão de revisão</p>
            <p className="mt-1 text-[11px] text-ink-secondary">Seu cadastro: {c.declared} · Referência: {c.reference}</p>
            {c.limitation && <p className="mt-1 text-[11px] text-ink-muted">{c.limitation}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setKeptConflictKeys(keys=>[...keys,`${c.declared}:${c.reference}`])}
                className="min-h-11 rounded-xl border border-surface-border/65 bg-surface/45 px-2 py-2 text-[11px] font-semibold text-ink-secondary">Manter meu cadastro</button>
              <button type="button" onClick={()=>navigate(value.editHref)}
                className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-amber-400/35 bg-amber-400/[.07] px-2 py-2 text-[11px] font-semibold text-amber-200">Aplicar no editor <ArrowUpRight size={13}/></button>
            </div>
            <p className="mt-2 text-[10px] text-ink-muted">Manter dispensa este aviso apenas nesta abertura. Aplicar abre a edição para revisar e salvar explicitamente; não altera nenhum campo ao tocar.</p>
          </div>)}
          <p className="text-[11px] text-ink-muted">A fonte pode indicar o receituário esperado, mas não confirma documento pessoal anexado, validade atual ou retirada concluída. Se o cadastro diferir, mantenha seu valor ou revise no editor — nenhuma alteração é automática.</p>
        </>}
        {tab==="acoes" && <>
          <h3 className="text-sm font-semibold text-ink-primary">Ações disponíveis</h3>
          {value.controls.length>0 ? <div onClickCapture={()=>{window.setTimeout(onClose,0);}} className="grid grid-cols-2 gap-2 [&_button]:min-h-12 [&_button]:w-full [&_button]:whitespace-normal [&_button]:text-xs">{value.controls.map((c,i)=><div key={i} className="min-w-0">{c}</div>)}</div> : <p className="rounded-xl border border-surface-border/50 bg-surface/40 p-3 text-xs text-ink-muted">Nenhuma ação clínica rápida disponível neste estado.</p>}
          <p className="text-[11px] text-ink-muted">As ações acima reutilizam os botões e permissões originais; abrir este painel não registra eventos.</p>
        </>}
        <button type="button" onClick={()=>navigate(value.detailHref)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-surface-border/60 bg-surface/75 px-3 text-left text-xs font-semibold text-ink-primary active:scale-[.99]">
          <span className="flex items-center gap-2"><History size={16} className="text-ink-secondary"/> Abrir detalhes completos</span><ChevronRight size={16} className="text-ink-muted"/>
        </button>
      </div>
    </section>
  </div>;
}
