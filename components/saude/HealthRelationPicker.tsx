"use client";

import { Children, isValidElement, useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, MapPin, Stethoscope, Store, Link2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { buildRelationMetadata, type RelationMetadata } from "@/lib/health-profile/relation-context";
import { SelectionModal } from "@/components/SelectionModal";
import { MedicationFormatIcon } from "./MedicationFormatIcon";
import type { Medicamento } from "@/lib/types";

type Choice = { id: string; label: string; disabled?: boolean };
type Props = {
  children: ReactNode;
  renderIcon?: (id:string)=>ReactNode;
  value?: string | number;
  defaultValue?: string;
  onValueChange: (value: string) => void;
  title: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  medications?: Medicamento[];
  medication?: Medicamento;
  compact?: boolean;
  kind?: "doctor" | "place" | "pharmacy";
};

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return Children.toArray(node).map(textOf).join("");
}

function choicesOf(children: ReactNode): Choice[] {
  const choices: Choice[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return;
    if (child.type === "option") choices.push({ id: String(child.props.value ?? textOf(child.props.children)), label: textOf(child.props.children), disabled: child.props.disabled });
    else choices.push(...choicesOf(child.props.children));
  });
  return choices;
}

/** Selects existing relational IDs through the same searchable modal used by Vault. */
export function HealthRelationPicker({ children, value, defaultValue = "", onValueChange, title, id, className = "", disabled, required, medications, medication: relatedMedication, kind, compact, renderIcon }: Props) {
  const [open, setOpen] = useState(false);
  const {user}=useAuth();const {activePersonId}=useActivePersonId();
  const enriched=useLiveQuery(async()=>{
    if(!open||!kind||!user?.id)return null;
    const {db}=await import("@/lib/db");
    const uid=user.id;
    try {
    const [doctors,pharmacies,places,hospitals,treatments]=await Promise.all([
      kind==="doctor"?db.medicos.where("user_id").equals(uid).toArray():Promise.resolve([]),
      kind==="pharmacy"?db.farmacias.where("user_id").equals(uid).toArray():Promise.resolve([]),
      kind!=="pharmacy"?db.locais.where("user_id").equals(uid).toArray():Promise.resolve([]),
      kind==="doctor"?db.hospitais.where("user_id").equals(uid).toArray():Promise.resolve([]),
      kind==="doctor"&&activePersonId?db.tratamentos.where("person_id").equals(activePersonId).toArray():Promise.resolve([])
    ]);
    return {uid,pid:activePersonId,kind,metadata:buildRelationMetadata(kind,uid,activePersonId,{doctors,pharmacies,places,hospitals,treatments}),error:false};
    } catch {return {uid,pid:activePersonId,kind,metadata:{},error:true};}
  },[open,kind,user?.id,activePersonId]);
  const metadata:Record<string,RelationMetadata>=enriched && enriched.uid===user?.id&&enriched?.pid===activePersonId&&enriched?.kind===kind?enriched.metadata:{};
  const [localValue, setLocalValue] = useState(defaultValue);
  const modalRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => modalRoot.current?.querySelector<HTMLInputElement>("input")?.focus());
    return () => { cancelAnimationFrame(frame); previous?.focus(); };
  }, [open]);
  const choices = useMemo(() => choicesOf(children), [children]);
  useEffect(() => { setOpen(false); }, [activePersonId, user?.id]);
  const selectedId = String(value ?? localValue);
  const selected = choices.find(item => item.id === selectedId);
  const Icon = kind === "doctor" ? Stethoscope : kind === "place" ? MapPin : kind === "pharmacy" ? Store : Link2;
  const icon = (choice: Choice) => {
    if(renderIcon)return renderIcon(choice.id);
    const medication = medications?.find(item => item.id === choice.id) || (choice.id ? relatedMedication : undefined);
    return medication ? <MedicationFormatIcon formato={medication.formato} cores={medication.cores} size={24} /> : <Icon size={20} style={metadata[choice.id]?.color?{color:metadata[choice.id].color}:undefined} className={kind === "doctor" ? "text-violet-300" : kind === "place" ? "text-amber-300" : kind === "pharmacy" ? "text-emerald-400" : "text-ink-muted"} />;
  };
  return <>
    <select className="sr-only" tabIndex={-1} aria-hidden="true" value={selectedId} disabled={disabled} required={required} onChange={event => onValueChange(event.target.value)} onInvalid={event => { event.preventDefault(); setOpen(true); }}>{children}</select>
    <button id={id} type="button" disabled={disabled} aria-label={title} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className={`${className} flex min-h-[44px] items-center gap-3 text-left disabled:opacity-50`}>
      {selected && !compact ? <span className="shrink-0">{icon(selected)}</span> : null}
      <span className="min-w-0 flex-1 break-words">{selected?.label || (selectedId ? "Vínculo indisponível · selecionar outro" : title)}</span>
      {!compact ? <ChevronDown size={16} className="shrink-0 text-ink-muted" /> : null}
    </button>
    {open ? createPortal(<div ref={modalRoot} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(modalRoot.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') || []).filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}><SelectionModal<Choice> isOpen={open} onClose={() => setOpen(false)} title={title} placeholder="Buscar no cadastro…" items={choices.filter(item => !item.disabled)} getItemId={item => item.id} getItemLabel={item => [item.label,metadata[item.id]?.detail||"",(item.label+" "+(metadata[item.id]?.detail||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"")].join(" ")} onSelect={item => { setLocalValue(item.id); onValueChange(item.id); }} renderItem={item => <div className="flex items-center gap-3"><span style={metadata[item.id]?.color?{borderColor:metadata[item.id].color,color:metadata[item.id].color}:undefined} className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border "+(kind==="doctor"?"border-violet-400/25 bg-violet-400/10":kind==="pharmacy"?"border-emerald-400/25 bg-emerald-400/10":kind==="place"?"border-cyan-400/25 bg-cyan-400/10":"border-surface-border bg-surface")}>{icon(item)}</span><span className="min-w-0 flex-1"><span className="block whitespace-pre-wrap break-words text-sm text-ink-primary">{item.label}</span>{metadata[item.id]&&<span className="mt-1 block whitespace-pre-wrap break-words text-[11px] leading-relaxed text-ink-muted">{metadata[item.id].detail}</span>}</span>{item.id === selectedId ? <Check size={17} className="shrink-0 text-emerald-400" /> : null}</div>} /></div>, document.body) : null}
  </>;
}
