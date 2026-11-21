'use client';
import { useEffect, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { resolveMedicationTimeDraftM4P2 } from '@/lib/medications/time-draft-m4p2';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
};
/**
 * Um campo editável inteiro em vez de dois segmentos que roubam o foco.
 * A digitação é sempre local até o commit; o pai recebe apenas HH:mm válido.
 */
export function MedicationStableTimeInputM4P2({value,onChange,label,error,className='',compact=false,disabled=false}:Props) {
  const [draft,setDraft] = useState(value);
  const [invalid,setInvalid] = useState(false);
  const focused = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => { if (!focused.current) { setDraft(value); setInvalid(false); } }, [value]);
  const commit = () => {
    focused.current = false;
    const parsed = resolveMedicationTimeDraftM4P2(draft);
    if (parsed === null) { setInvalid(true); return; }
    setInvalid(false); setDraft(parsed);
    if (parsed !== value) latest.current(parsed);
  };
  return <div className={`min-w-0 ${className}`}>
    {label && <label className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</label>}
    <div className={`flex min-w-0 items-center gap-2 rounded-xl border bg-surface-raised px-3 ${compact?'min-h-11':'min-h-12'} ${invalid||error?'border-coral/60':'border-surface-border/70 focus-within:border-ice/60'} focus-within:ring-2 focus-within:ring-ice/10`}>
      <Clock3 size={16} className="shrink-0 text-ice/85" aria-hidden="true" />
      <input ref={inputRef} type="text" inputMode="numeric" autoComplete="off" spellCheck={false}
        disabled={disabled} aria-label={label||'Horário em 24 horas'} aria-invalid={Boolean(invalid||error)}
        placeholder="HH:mm" maxLength={5} value={draft}
        onFocus={event=>{focused.current=true;event.currentTarget.select();}}
        onChange={event=>{setDraft(event.target.value.replace(/[^0-9:]/g,'').slice(0,5));setInvalid(false);}}
        onBlur={commit}
        onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();inputRef.current?.blur();}if(event.key==='Escape'){event.preventDefault();setDraft(value);setInvalid(false);inputRef.current?.blur();}}}
        className="h-10 min-w-0 w-full bg-transparent font-mono text-sm font-semibold tabular-nums text-ink-primary outline-none placeholder:font-normal placeholder:text-ink-faint"/>
    </div>
    {invalid ? <p role="alert" className="mt-1 text-[11px] text-coral">Horário inválido. Use 10, 22, 1030 ou 10:30.</p> : error ? <p role="alert" className="mt-1 text-[11px] text-coral">{error}</p> : null}
  </div>;
}
