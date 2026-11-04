"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { HelpTopic } from "@/lib/help/catalog";

export function HelpTopicGuide({ topic, onClose }: { topic: HelpTopic; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const step = topic.steps[index];
  const last = index === topic.steps.length - 1;
  return (
    <BottomSheet isOpen onClose={onClose} title={topic.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <Compass size={18} aria-hidden="true" />
          <span>Conheça esta área · {index + 1} de {topic.steps.length}</span>
        </div>
        <div role="progressbar" aria-label="Progresso do guia" aria-valuemin={1} aria-valuemax={topic.steps.length} aria-valuenow={index + 1} className="flex gap-1.5">
          {topic.steps.map((entry, position) => <span key={entry.title} className={`h-1.5 flex-1 rounded-full ${position <= index ? "bg-emerald-400" : "bg-surface-border"}`} />)}
        </div>
        <div aria-live="polite" aria-atomic="true" className="min-h-32 rounded-2xl border border-surface-border bg-surface/60 p-4">
          <h3 className="text-base font-semibold text-ink-primary">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{step.text}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {index > 0 ? <button type="button" onClick={() => setIndex(value => value - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-3 text-sm text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><ArrowLeft size={16} aria-hidden="true" />Voltar</button> : null}
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">Pular guia</button>
          <button type="button" onClick={() => last ? onClose() : setIndex(value => value + 1)} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-200">
            {last ? "Entendi" : "Avançar"}{last ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-ink-muted">Você pode rever este guia em Mais → Ajuda e guias.</p>
      </div>
    </BottomSheet>
  );
}
