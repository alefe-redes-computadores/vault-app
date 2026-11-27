'use client';
import {ShieldAlert,X} from 'lucide-react';
import Link from 'next/link';
export function Macro02AuthorityHoldR5({onClose}:{onClose?:()=>void}){
 const content=<div className="w-full max-w-md rounded-3xl border border-surface-border bg-surface p-5 text-ink-primary shadow-xl">
  <div className="flex items-start gap-3"><ShieldAlert className="mt-1 shrink-0 text-amber-300" size={23}/><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Conferência de autoridade clínica</h2><p className="mt-2 text-sm leading-relaxed text-ink-muted">Este aparelho ainda não confirmou a autoridade da conta, ou há intenções que precisam de conferência. Seus registros e a fila foram preservados.</p></div>{onClose&&<button type="button" aria-label="Fechar" onClick={onClose} className="rounded-xl p-2 text-ink-muted"><X size={18}/></button>}</div>
  <Link href="/recuperacao" className="mt-4 flex min-h-11 items-center justify-center rounded-2xl border border-surface-border bg-void px-4 text-sm font-semibold text-ice" onClick={onClose}>Abrir Central de segurança</Link>
 </div>;
 return onClose?<div role="dialog" aria-modal="true" aria-label="Conferência de autoridade clínica" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">{content}</div>:<main className="flex min-h-screen items-start justify-center bg-void px-4 pb-32 pt-8">{content}</main>;
}
