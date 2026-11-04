"use client";

import { motion } from "framer-motion";
import { AlertCircle, Calendar, Clock, DollarSign, FileText, Gift } from "lucide-react";

type EventKind = "prescription" | "planned" | "public" | "private";
type Props = {
  kind: EventKind;
  dateLabel: string;
  pharmacyName?: string | null;
  publicKind?: "sus" | "gratuito" | null;
  quantityLabel?: string | null;
  requiresPrescription: boolean;
  nextWithdrawalLabel?: string | null;
  price?: number | null;
  onOpen: () => void;
  enabled: boolean;
};

const tags: Record<EventKind,{label:string;tone:string}> = {
  prescription: {label:"Receita",tone:"bg-violet-500/15 text-violet-300"},
  planned: {label:"Aquisição prevista",tone:"bg-amber-500/15 text-amber-300"},
  public: {label:"SUS / sem custo",tone:"bg-emerald-500/20 text-emerald-400"},
  private: {label:"Comprado",tone:"bg-ice/10 text-ice"},
};

/** Visão somente leitura. Status de receita, previsão e aquisição são decididos fora deste componente. */
export function MedicationAcquisitionHistoryCard({kind,dateLabel,pharmacyName,publicKind,quantityLabel,requiresPrescription,nextWithdrawalLabel,price,onOpen,enabled}: Props) {
  const tag=tags[kind];
  const tagLabel=kind==="public" ? publicKind==="sus"?"SUS":"Sem custo" : tag.label;
  const safePrice=typeof price==="number"&&Number.isFinite(price) ? price : null;
  const shownPrice=kind==="prescription"?"Receita":kind==="planned"?"Prevista":kind==="public"?"R$ 0,00":safePrice!==null?`R$ ${safePrice.toFixed(2)}`:"—";
  const Icon=kind==="prescription"?FileText:kind==="planned"?Clock:kind==="public"?Gift:DollarSign;
  return <motion.button type="button" onClick={onOpen} disabled={!enabled}
    aria-label={`${enabled ? "Abrir" : "Detalhes indisponíveis de"} ${kind==="prescription"?"receita":kind==="planned"?"aquisição prevista":"aquisição"} de ${dateLabel}`}
    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
    className={`w-full min-h-11 min-w-0 rounded-[16px] border bg-surface p-2.5 text-left transition-colors active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:cursor-default disabled:opacity-65 ${kind==="public"?"border-emerald-500/30 bg-emerald-500/5":"border-surface-border"}`}>
    <span className="flex min-w-0 items-start justify-between gap-3">
      <span className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-raised/70 text-ink-muted"><Calendar size={14} aria-hidden="true"/></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-ink-primary">{dateLabel}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {pharmacyName && <span className="max-w-[180px] break-words text-[11px] leading-snug text-ink-muted">{pharmacyName}</span>}
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${tag.tone}`}><Icon size={9} aria-hidden="true"/>{tagLabel}</span>
            {quantityLabel && kind!=="prescription" && <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-[8px] font-bold text-ink-muted">Qtd. {quantityLabel}</span>}
            {requiresPrescription && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400"><AlertCircle size={9} aria-hidden="true"/>Nova receita</span>}
            {nextWithdrawalLabel && <span className="inline-flex items-center gap-0.5 rounded-full bg-ice/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-ice"><Calendar size={9} aria-hidden="true"/>Retorno: {nextWithdrawalLabel}</span>}
          </span>
        </span>
      </span>
      <span className={`max-w-[45%] shrink-0 break-words rounded-lg px-2 py-1 text-right font-mono text-xs font-bold ${kind==="public"?"bg-emerald-400/10 text-emerald-400":"bg-ice/10 text-ice"}`}>{shownPrice}</span>
    </span>
    <span className={kind==="planned"||kind==="prescription"?"mt-2 block border-t border-surface-border/35 pt-2 text-[10px] leading-snug text-ink-muted":"sr-only"}>
      {kind==="prescription"?"Receita registrada; não demonstra compra ou retirada.":kind==="planned"?"Aquisição planejada, ainda não realizada; sem entrada automática no estoque.":kind==="public"?"Aquisição registrada sem custo informado; confirme a retirada pelo registro correspondente.":"Compra registrada; estoque depende da movimentação salva."}
    </span>
  </motion.button>;
}
