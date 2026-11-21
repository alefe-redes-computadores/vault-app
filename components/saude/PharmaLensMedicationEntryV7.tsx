'use client';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Factory, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useActivePersonId } from '@/hooks/useActivePersonId';
import { useLocalDay } from '@/hooks/useLocalDay';
import { buildPharmaLensReportV7 } from '@/lib/health-intelligence/pharmalens-v7';
import { ManufacturerBadge } from '@/components/saude/ManufacturerBadge';

export function PharmaLensMedicationEntryV7({medicationId, userId, personId, referenceManufacturer}:{medicationId:string;userId:string;personId:string;referenceManufacturer?:string|null}) {
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const todayISO = useLocalDay();
  const authorized = Boolean(medicationId && userId && personId && user?.id===userId && activePersonId===personId);
  const acquisitions = useLiveQuery(async () => authorized ? db.renovacoes.where('[user_id+person_id]').equals([userId,personId]).toArray().then(rows => rows.filter(r => r.medicamento_id === medicationId)) : [], [authorized,medicationId,userId,personId]);
  if (!authorized) return <p className="text-xs text-ink-muted">Histórico indisponível para a pessoa ativa.</p>;
  if (acquisitions === undefined) return <p role="status" className="text-xs text-ink-muted">Lendo histórico de fabricantes…</p>;
  const report = buildPharmaLensReportV7({ userId,personId,medicationId,acquisitions,todayISO });
  const last = report.cycles.find(c => c.manufacturer) || null;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2"><Factory size={16} className="text-sky-300"/><span className="text-xs font-semibold text-ink-primary">Experiência por fabricante</span>{last?.manufacturer ? <ManufacturerBadge manufacturer={last.manufacturer}/> : referenceManufacturer ? <ManufacturerBadge manufacturer={referenceManufacturer}/> : null}</div>
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl border border-surface-border bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{report.totalAcquisitions}</strong><span className="text-[10px] text-ink-muted">aquisições</span></div>
      <div className="rounded-xl border border-surface-border bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{report.manufacturers.length}</strong><span className="text-[10px] text-ink-muted">nas aquisições</span></div>
      <div className="rounded-xl border border-surface-border bg-surface-raised/70 p-2"><strong className="block text-base text-ink-primary">{report.documentedTransitions}</strong><span className="text-[10px] text-ink-muted">trocas</span></div>
    </div>
    {report.manufacturers.length === 0 && referenceManufacturer ? <p className="text-[11px] leading-relaxed text-ink-muted">O laboratório acima vem do cadastro/identidade do medicamento. As aquisições ainda não registram fabricante próprio.</p> : null}
    <Link href={`/saude/pharmalens?medicamento_id=${encodeURIComponent(medicationId)}`} className="flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/[.06] px-3 text-xs font-bold text-sky-100">Abrir PharmaLens completo</Link>
    <p className="flex items-start gap-1 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={13} className="mt-0.5 shrink-0"/>Dados pessoais da aquisição. Não são conclusões clínicas nem comparações de bioequivalência.</p>
  </div>;
}
