"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MapPin, X } from 'lucide-react';
import { SelectionModal } from '@/components/SelectionModal';
import { SURGERY_REGIONS, SURGERY_SIDES, type SurgeryBody, type SurgeryRegion, type SurgerySide } from '@/lib/surgery-body';

const REGIONS = (Object.entries(SURGERY_REGIONS) as [SurgeryRegion, string][]).map(([id, label]) => ({ id, label }));
const SIDES = Object.entries(SURGERY_SIDES) as [SurgerySide, string][];

export function SurgeryBodyFields({ value, onChange }: { value: SurgeryBody; onChange: (value: SurgeryBody) => void }) {
  const [selecting, setSelecting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectorHost = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const close = () => setSelecting(false);
  useEffect(() => {
    if (!selecting) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => selectorHost.current?.querySelector('input')?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setSelecting(false); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(selectorHost.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !selectorHost.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); };
  }, [selecting]);
  return <fieldset className="space-y-3 rounded-[24px] border border-rose-400/20 bg-surface p-4">
    <legend className="px-2 text-xs font-medium text-rose-300">Localização no corpo · opcional</legend>
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="mb-2 text-xs text-ink-muted">Região do corpo</p>
        <button ref={trigger} type="button" aria-labelledby={`${labelId} ${labelId}-value`} aria-haspopup="dialog" aria-expanded={selecting} onClick={() => setSelecting(true)} className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300">
          <MapPin size={16} className="shrink-0 text-rose-300" />
          <span id={`${labelId}-value`} className="min-w-0 flex-1 truncate">{value.regiao_corporal ? SURGERY_REGIONS[value.regiao_corporal] : 'Não informada'}</span>
          <ChevronDown size={16} className="shrink-0 text-ink-muted" />
        </button>
      </div>
      {value.regiao_corporal ? <button type="button" aria-label="Limpar localização da cirurgia" onClick={() => onChange({ regiao_corporal: null, lateralidade: null })} className="mt-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-border text-ink-muted"><X size={16}/></button> : null}
    </div>
    {value.regiao_corporal ? <div role="group" aria-label="Lado da cirurgia" className="grid grid-cols-2 gap-2">
      {SIDES.map(([side, label]) => <button type="button" key={side} aria-pressed={value.lateralidade === side} onClick={() => onChange({ ...value, lateralidade: value.lateralidade === side ? null : side })} className={"min-h-11 rounded-xl border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 " + (value.lateralidade === side ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-surface-border text-ink-muted')}>{label}</button>)}
    </div> : null}
    <p className="text-[11px] leading-relaxed text-ink-muted">Informe conforme o agendamento ou documento. Isso identifica o procedimento no Avatar; equipamentos em uso continuam no cadastro próprio.</p>
    {selecting ? createPortal(<div ref={selectorHost}><SelectionModal isOpen onClose={close} onSelect={region => onChange({ regiao_corporal: region.id, lateralidade: value.regiao_corporal === region.id ? value.lateralidade ?? null : null })} items={REGIONS} title="Região da cirurgia" placeholder="Buscar região..." getItemId={item => item.id} getItemLabel={item => item.label} renderItem={item => <span className={value.regiao_corporal === item.id ? 'text-rose-300' : 'text-ink-primary'}>{item.label}{value.regiao_corporal === item.id ? ' ✓' : ''}</span>} /></div>, document.body) : null}
  </fieldset>;
}
