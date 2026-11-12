"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Factory, History, PackagePlus, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { isPrescriptionOnly } from "@/lib/health-supply/renewal-event";
import { readManufacturerMetadata } from "@/lib/medications/manufacturer-experience";
import { ManufacturerBadge } from "@/components/saude/ManufacturerBadge";

/**
 * M128: leitura de aquisições reais, restrita a conta, pessoa e medicamento.
 * Preferência é um AJUSTE DESTE DISPOSITIVO e nunca uma afirmação clínica
 * ou alteração retroativa de fabricante/lote de um evento histórico.
 */
export function MedicationManufacturerOverviewM128({ medicationId, userId, personId }: {
  medicationId: string;
  userId: string;
  personId: string;
}) {
  const events = useLiveQuery(async () => {
    if (!medicationId || !personId || !userId) return [];
    const rows = await db.renovacoes.where("medicamento_id").equals(medicationId).toArray();
    return rows
      .filter(row => row.id && row.user_id === userId && row.person_id === personId && !isPrescriptionOnly(row))
      .map(row => ({
        id: row.id!,
        date: row.data_aquisicao || row.data || "",
        manufacturer: readManufacturerMetadata(row.observacoes).manufacturer || "",
      }))
      .filter(row => row.manufacturer)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [medicationId, userId, personId]);

  const localKey = useMemo(() => [
    "vault:m128:manufacturer-preference",
    userId, personId, medicationId,
  ].map(encodeURIComponent).join(":"), [userId, personId, medicationId]);
  const [draft, setDraft] = useState("");
  const [preferred, setPreferred] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let saved = "";
    try { if (userId && personId && medicationId) saved = localStorage.getItem(localKey) || ""; }
    catch { /* armazenamento indisponível não bloqueia leitura clínica */ }
    setPreferred(saved);
    setDraft(saved);
    setMessage("");
  }, [localKey, userId, personId, medicationId]);

  const latest = events?.[0] || null;
  const distinct = useMemo(() => {
    const names = new Map<string, string>();
    for (const event of events || []) {
      const key = event.manufacturer.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
      if (key && !names.has(key)) names.set(key, event.manufacturer);
    }
    return [...names.values()];
  }, [events]);

  function savePreference() {
    const clean = draft.trim().replace(/\s+/g, " ").slice(0, 120);
    if (!userId || !personId || !medicationId) return;
    try {
      if (clean) localStorage.setItem(localKey, clean);
      else localStorage.removeItem(localKey);
      setPreferred(clean);
      setDraft(clean);
      setMessage(clean ? "Preferência salva somente neste dispositivo." : "Preferência local removida.");
    } catch { setMessage("Não foi possível salvar neste dispositivo. Seus dados clínicos não foram modificados."); }
  }

  return (
    <section className="rounded-[28px] border border-violet-400/25 bg-violet-400/[.045] p-4 shadow-sm" aria-label="Fabricantes do medicamento">
      <div className="flex items-center gap-2"><Factory size={17} className="text-violet-300"/><h3 className="text-sm font-bold text-ink-primary">Laboratórios e fabricantes</h3></div>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">O fabricante pertence a cada aquisição, não ao princípio ativo. Trocas de laboratório não alteram o cadastro, as doses nem o estoque.</p>
      {events === undefined ? (
        <p role="status" className="mt-3 text-xs text-ink-muted">Conferindo histórico autorizado…</p>
      ) : latest ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-surface-border/50 bg-surface p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Última aquisição com fabricante informado</span>
          <div className="flex flex-wrap items-center gap-2"><ManufacturerBadge manufacturer={latest.manufacturer}/><span className="text-[11px] text-ink-muted">{latest.date.split("-").reverse().join("/")}</span></div>
          <Link href={`/saude/renovacao/detalhes?id=${encodeURIComponent(latest.id)}`} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-ice"><History size={14}/>Abrir aquisição e relatos</Link>
          {distinct.length > 1 && <p className="text-xs leading-relaxed text-ink-muted">Fabricantes encontrados no histórico: {distinct.join(" · ")}</p>}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-surface-border/40 bg-surface/70 p-3 text-xs text-ink-muted">Nenhuma aquisição com fabricante identificado. O Vault não presume fabricante pelo nome comercial.</p>
      )}
      <Link href={`/saude/renovacao/nova?medicamento_id=${encodeURIComponent(medicationId)}`} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-surface/70 px-3 py-2 text-xs font-semibold text-violet-200"><PackagePlus size={14}/>Registrar aquisição com fabricante</Link>
      <div className="mt-3 border-t border-surface-border/50 pt-3">
        <label htmlFor="vault-m128-preferred" className="block text-xs font-semibold text-ink-primary">Fabricante preferido (opcional)</label>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Preferência pessoal, salva apenas neste aparelho. Não é sincronizada nem atribuída a compras anteriores.</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="vault-m128-preferred" value={draft} maxLength={120} onChange={event => {setDraft(event.target.value);setMessage("");}} placeholder="Ex.: laboratório de preferência" className="min-h-11 min-w-0 flex-1 rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary outline-none focus:border-violet-400"/>
          <button type="button" onClick={savePreference} disabled={draft.trim() === preferred} className="min-h-11 rounded-xl border border-violet-400/25 bg-violet-400/10 px-4 text-xs font-bold text-violet-200 disabled:opacity-40">Salvar preferência</button>
        </div>
        {preferred && <p className="mt-2 text-xs text-ink-muted">Preferência neste aparelho: <span className="font-semibold text-ink-primary">{preferred}</span></p>}
        {message && <p role="status" className="mt-2 text-xs text-violet-200">{message}</p>}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0"/>Preferência e relatos pessoais não demonstram superioridade ou equivalência clínica entre produtos.</p>
    </section>
  );
}
