"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardCheck, Info, PackageCheck, ShieldCheck } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { CustomDatePicker } from "@/components/DatePicker";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useToast } from "@/components/ToastProvider";
import { useHapticFeedback } from "@/lib/haptics";
import { db } from "@/lib/db";
import { doseLogsRepository } from "@/lib/repositories/doseLogs";
import { addDaysToLocalDate, getLocalTodayISO } from "@/lib/health-utils";
import { buildRetroBatchSlots, mayDebitHistoricalStock, retroDateTimeISO, validRetroDate } from "@/lib/today/retro-batch-review";
import { retroReviewExitAction } from "@/lib/today/retro-review-navigation";

function RetroBatchReviewContent() {
  const router = useRouter();
  const search = useSearchParams();
  const medId = search.get("medicamento_id") || "";
  const sourceMode = search.get("stock_mode");
  const stockMode = sourceMode === "counted" ? "counted" : sourceMode === "added" ? "added" : "manual";
  const { user } = useAuth();
  const { activePersonId } = useActivePersonId();
  const { medicamentos } = useMedicamentos();
  const { showToast } = useToast();
  const { trigger } = useHapticFeedback();
  const today = getLocalTodayISO();
  const yesterday = addDaysToLocalDate(today, -1);
  const acquisitionDate = search.get("data_aquisicao") ?? "";
  const initialStart = validRetroDate(acquisitionDate) && acquisitionDate <= yesterday ? acquisitionDate : yesterday;
  const returnTo = medId ? `/saude/medicamentos/detalhes?id=${encodeURIComponent(medId)}` : "/saude/medicamentos";
  const medication = medicamentos.find(m => m.id === medId && m.user_id === user?.id && m.person_id === activePersonId);
  const [from, setFrom] = useState(initialStart);
  const [to, setTo] = useState(yesterday);
  const [attestSchedule, setAttestSchedule] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [quantityText, setQuantityText] = useState("");
  const [stockAction, setStockAction] = useState<"preserve" | "debit">("preserve");
  const [confirmReal, setConfirmReal] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(stockMode === "manual");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ saved: number; failed: number; message: string } | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const identity = `${user?.id ?? ""}|${activePersonId ?? ""}|${medId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    setFrom(initialStart);
    setTo(yesterday);
    setSelected([]);
    setAttestSchedule(false);
    setConfirmReal(false);
    setStockAction("preserve");
    setReviewOpen(stockMode === "manual");
    setResult(null);
  }, [identity, initialStart, yesterday, stockMode]);
  useEffect(() => { setQuantityText(medication?.estoque_unidade_por_dose ? String(medication.estoque_unidade_por_dose) : ""); }, [medication?.id, medication?.estoque_unidade_por_dose]);
  useEffect(() => { setSelected([]); setConfirmReal(false); setResult(null); }, [from, to, attestSchedule]);

  const savedSnapshot = useLiveQuery(async () => {
    if (!user?.id || !activePersonId || !medId) return null;
    const rows = await db.doseLogs.where("[user_id+person_id]").equals([user.id, activePersonId]).toArray();
    return { userId: user.id, personId: activePersonId, medicationId: medId, rows: rows.filter(row => row.medicamento_id === medId) };
  }, [user?.id, activePersonId, medId]);
  const snapshotReady = Boolean(savedSnapshot && savedSnapshot.userId === user?.id && savedSnapshot.personId === activePersonId && savedSnapshot.medicationId === medId);
  const plan = useMemo(() => medication && snapshotReady && user?.id && activePersonId
    ? buildRetroBatchSlots({ medication, userId: user.id, personId: activePersonId, from, to, yesterday, logs: savedSnapshot!.rows, attestSchedule })
    : { slots: [], days: 0, error: null }, [medication, snapshotReady, user?.id, activePersonId, from, to, yesterday, savedSnapshot, attestSchedule]);
  const eligible = plan.slots.filter(slot => slot.status === "unconfirmed");
  const selectedSlots = eligible.filter(slot => selected.includes(slot.key));
  const statusCounts = useMemo(() => ({
    taken: plan.slots.filter(slot => slot.status === "taken").length,
    ignored: plan.slots.filter(slot => slot.status === "ignored").length,
    conflict: plan.slots.filter(slot => slot.status === "conflict").length,
  }), [plan.slots]);
  const quantity = Number(quantityText.trim().replace(",", "."));
  const quantityValid = quantityText.trim() !== "" && Number.isFinite(quantity) && quantity > 0;
  const canDebit = Boolean(medication && mayDebitHistoricalStock(medication) && stockMode !== "counted");
  const debit = stockAction === "debit" && canDebit;

  // M67 HF1: fechar a revisão não pode empilhar outro detalhe no histórico.
  // Aberta pelos detalhes: voltar à entrada que já existia; após aquisição:
  // substituir o convite sem reabrir uma revisão já dispensada.
  function goBack() {
    if (saving) return;
    if (retroReviewExitAction(stockMode, search.get("origem")) === "back") {
      router.back();
    } else {
      router.replace(returnTo);
    }
  }
  function select(key: string, checked: boolean) {
    if (saving) return;
    setSelected(current => checked ? [...new Set([...current, key])] : current.filter(k => k !== key));
    setConfirmReal(false);
    setResult(null);
  }
  async function commit() {
    if (lock.current || saving || !user?.id || !activePersonId || !medication?.id || !snapshotReady || !quantityValid || !confirmReal || !selectedSlots.length || plan.error) return;
    if (stockAction === "debit" && !canDebit) {
      showToast("Não é possível descontar do saldo atual sem uma contagem confiável.", "error");
      return;
    }
    const startIdentity = identity;
    const confirmed = selectedSlots.map(slot => ({ ...slot }));
    lock.current = true;
    setSaving(true);
    setResult(null);
    let saved = 0;
    let failed = 0;
    let failure = "";
    try {
      for (const slot of confirmed) {
        try {
          if (!alive.current || identityRef.current !== startIdentity) throw new Error("A pessoa ou conta foi alterada, ou a revisão foi fechada. Operação interrompida.");
          if (!user.id || !activePersonId || !medication.id || slot.status !== "unconfirmed") throw new Error("Identidade ou slot de revisão inválido.");
          // Authority is re-read at every write, not only when the sheet was opened.
          const latestMed = await db.medicamentos.get(medication.id);
          if (!latestMed || latestMed.user_id !== user.id || latestMed.person_id !== activePersonId) throw new Error("Medicamento não pertence mais à pessoa ativa.");
          if (latestMed.tipo_uso === "sos" || latestMed.tipo_uso === "esporadico") throw new Error("O tipo de uso mudou. Revise individualmente.");
          if (attestSchedule && (latestMed.tipo_uso === "temporario" || latestMed.status === "descontinuado")) throw new Error("O tratamento mudou ou foi encerrado. A rotina atual não pode ser aplicada ao histórico.");
          if (debit && !mayDebitHistoricalStock(latestMed)) throw new Error("Saldo atualizado ou desconhecido. Confira antes de descontar.");
          const latest = await db.doseLogs.where("medicamento_id").equals(medication.id).filter(log => log.user_id === user.id && log.person_id === activePersonId && log.data === slot.date && log.horario === slot.time).toArray();
          if (latest.length > 1 || latest.some(log => Boolean(log.tomado_em || log.ignorado_em) || log.dose_kind === "sos" || log.dose_kind === "extra")) throw new Error("Um horário já foi registrado ou entrou em conflito. Nenhuma dose duplicada.");
          if (attestSchedule && !(latestMed.estoque_horarios ?? []).includes(slot.time) && latest.length === 0) throw new Error("A rotina mudou. Reabra a revisão.");
          await doseLogsRepository.setStatus({ personId: activePersonId, medicamentoId: medication.id,
            data: slot.date, horario: slot.time, status: "taken", tomadoEm: retroDateTimeISO(slot.date, slot.time),
            quantidade: quantity, onlyIfPending: true, adjustStock: debit, requireRegisteredStock: debit });
          saved++;
          setSelected(previous => previous.filter(key => key !== slot.key));
        } catch (err) {
          failed = confirmed.length - saved;
          failure = err instanceof Error ? err.message : "Falha desconhecida na revisão.";
          break;
        }
      }
      if (alive.current && identityRef.current === startIdentity) {
        if (saved > 0) { trigger("success"); showToast(`${saved} dose${saved === 1 ? "" : "s"} registrada${saved === 1 ? "" : "s"} neste dispositivo`, "success"); }
        if (failed > 0) { trigger("error"); showToast("Revisão parcial. Confira os horários restantes.", "error"); }
        setResult({ saved, failed, message: failure || (debit ? "Tomadas registradas com desconto do saldo conhecido." : "Tomadas registradas sem modificar o saldo atual.") });
        setConfirmReal(false);
      }
    } finally { lock.current = false; setSaving(false); }
  }

  return <PageTransition><main className="min-h-[100dvh] bg-void px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 header-safe-top text-ink-primary">
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={goBack} aria-label="Voltar ao medicamento" className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface"><ArrowLeft size={18}/></button>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-ice">M62 · Histórico de doses</p><h1 className="text-xl font-semibold">Revisão retroativa</h1></div>
      </header>
      {stockMode !== "manual" && !reviewOpen ? <section className="rounded-3xl border border-emerald-400/25 bg-surface p-5" aria-label="Aquisição salva, revisão opcional">
        <div className="flex items-center gap-2 text-emerald-300"><PackageCheck size={21}/><h2 className="text-base font-semibold">Recebimento registrado</h2></div>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">A compra ou retirada já foi salva. Quer conferir se existem tomadas anteriores que você ainda não registrou? Não vamos presumir nenhuma dose.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setReviewOpen(true)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ice px-4 text-xs font-semibold text-void"><ClipboardCheck size={17}/>Revisar doses</button><button type="button" onClick={goBack} className="min-h-12 rounded-2xl border border-surface-border px-4 text-xs font-semibold">Agora não</button></div>
      </section> : <>
        <section className="rounded-3xl border border-surface-border bg-surface p-4">
          {!medication || !user?.id || !activePersonId ? <p role="alert" className="text-sm text-amber-300">Selecione um medicamento válido da pessoa ativa antes de revisar.</p> : <><h2 className="text-sm font-semibold">{medication.nome} · {medication.dosagem}</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Este registro não comprova que a dose foi tomada. Você vai escolher cada dia e horário e confirmar somente o que lembra com segurança.</p></>}
          {stockMode === "counted" ? <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-200">Você informou o saldo contado atualmente na aquisição. Esta revisão preserva esse saldo: o consumo anterior já está refletido nele.</p> : null}
        </section>
        <section className="space-y-3 rounded-3xl border border-surface-border bg-surface p-4" aria-label="Período e horários da revisão">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={17} className="text-ice"/>Período a conferir</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Escolher o intervalo de doses antigas">
            <CustomDatePicker label="De" value={from} maxDate={yesterday} onChange={setFrom} disabled={saving} placeholder="Data inicial" className="min-w-0 text-sm text-ink-muted" />
            <CustomDatePicker label="Até" value={to} minDate={from} maxDate={yesterday} onChange={setTo} disabled={saving} placeholder="Data final" className="min-w-0 text-sm text-ink-muted" />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ice/20 bg-ice/[.04] p-3"><input type="checkbox" checked={attestSchedule} disabled={saving} onChange={e => setAttestSchedule(e.target.checked)} className="mt-0.5 size-5 accent-cyan-400"/><span className="text-xs leading-relaxed"><strong>Confirmo que os horários atuais deste medicamento eram válidos para todo o período escolhido.</strong><span className="mt-1 block text-ink-muted">Sem essa confirmação, só aparecem horários já documentados no histórico. Mudanças antigas de rotina ou tratamento exigem revisão individual.</span></span></label>
          <p className="text-[11px] text-ink-muted">Até 45 dias por revisão. Doses SOS e extras não entram neste lote.</p>
        </section>
        {plan.error ? <p role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-300">{plan.error}</p> : null}
        {!snapshotReady ? <p role="status" className="rounded-xl bg-surface p-4 text-xs text-ink-muted">Carregando histórico local da pessoa selecionada…</p> : <section aria-label="Doses do período" className="space-y-3 rounded-3xl border border-surface-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Horários encontrados</h2><p className="text-xs text-ink-muted">{plan.days} dias · {eligible.length} sem confirmação · {statusCounts.taken} tomadas · {statusCounts.ignored} ignoradas · {statusCounts.conflict} conflitos</p></div><span className="rounded-full bg-ice/10 px-3 py-1 text-xs font-bold text-ice">{selectedSlots.length} selecionadas</span></div>
          {plan.slots.length === 0 && !plan.error ? <p className="text-xs text-ink-muted">Não há horários documentados nesse período. Confira a rotina e, se ela realmente valia naquela época, marque a confirmação acima.</p> : null}
          <div className="max-h-[45dvh] space-y-2 overflow-y-auto overscroll-contain pr-1">
            {plan.slots.map(slot => <div key={slot.key} className={`flex items-center gap-3 rounded-xl border p-3 ${slot.status === "unconfirmed" ? "border-surface-border bg-surface-raised/40" : "border-surface-border/40 bg-void/20"}`}>
              {slot.status === "unconfirmed" ? <input aria-label={`Confirmar dose de ${slot.date.split("-").reverse().join("/")} às ${slot.time}`} type="checkbox" checked={selected.includes(slot.key)} disabled={saving} onChange={e => select(slot.key, e.target.checked)} className="size-5 shrink-0 accent-cyan-400"/> : <span className="grid size-5 shrink-0 place-items-center text-ink-muted"><Check size={16}/></span>}
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{slot.date.split("-").reverse().join("/")} · {slot.time}</p><p className="text-[11px] text-ink-muted">{slot.status === "taken" ? "Já tomada · preservada" : slot.status === "ignored" ? "Ignorada · correção exige revisão individual" : slot.status === "conflict" ? "Registros conflitantes · revisão individual" : slot.persisted ? "Planejada, ainda não confirmada" : "Sem registro · horário declarado"}</p></div>
              {slot.status === "ignored" || slot.status === "conflict" ? <button type="button" disabled={saving} onClick={() => router.push(`/hoje?data=${slot.date}&retro=1&medicamento=${encodeURIComponent(medId)}`)} className="min-h-11 rounded-xl border border-ice/25 px-3 text-[11px] font-semibold text-ice">Abrir dia</button> : null}
            </div>)}
          </div>
          {eligible.length > 0 ? <button type="button" disabled={saving} onClick={() => {setSelected([]);setConfirmReal(false);}} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs font-semibold">Limpar seleção</button> : null}
        </section>}
        {selectedSlots.length > 0 && <section className="space-y-3 rounded-3xl border border-ice/20 bg-surface p-4" aria-label="Revisar antes de confirmar">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} className="text-ice"/>Conferir antes de salvar</h2>
          <label className="block text-xs text-ink-muted">Quantidade realmente tomada por horário (na unidade da dose)<input type="number" inputMode="decimal" min="0.001" step="any" value={quantityText} disabled={saving} onChange={e => {setQuantityText(e.target.value);setConfirmReal(false);}} placeholder="Ex.: 1" className="mt-1 min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-3 text-sm text-ink-primary"/></label>
          <p className="text-xs text-ink-muted">{selectedSlots.length} horário(s) selecionado(s){quantityValid ? ` · ${Number((selectedSlots.length * quantity).toFixed(5))} unidade(s) de dose informada(s)` : " · informe a quantidade real por tomada"}. Horário real presumido igual ao horário exibido apenas após sua confirmação; se foi diferente, abra o dia para ajustar individualmente.</p>
          {stockMode !== "counted" ? <fieldset className="space-y-2"><legend className="text-xs font-semibold">Como o saldo atual deve reagir?</legend><label className="flex items-start gap-2 rounded-xl border border-surface-border p-3 text-xs"><input type="radio" name="retro-stock" checked={stockAction === "preserve"} disabled={saving} onChange={()=>{setStockAction("preserve");setConfirmReal(false);}} className="mt-0.5 size-4 accent-cyan-400"/><span>Preservar saldo atual. As tomadas já estavam refletidas na contagem, ou não sei se devem ser descontadas.</span></label><label className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${canDebit ? "border-surface-border" : "border-amber-400/20 text-ink-muted"}`}><input type="radio" name="retro-stock" checked={stockAction === "debit"} disabled={saving || !canDebit} onChange={()=>{setStockAction("debit");setConfirmReal(false);}} className="mt-0.5 size-4 accent-cyan-400"/><span>Descontar agora: confirmo que essas unidades ainda estão incluídas no estoque registrado. {canDebit ? "O repositório validará cada saldo antes de gravar." : "Indisponível: saldo desconhecido/negativo ou conversão de gotas não configurada."}</span></label></fieldset> : null}
          <label className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[.035] p-3 text-xs leading-relaxed"><input type="checkbox" checked={confirmReal} disabled={saving} onChange={e=>setConfirmReal(e.target.checked)} className="mt-0.5 size-5 accent-amber-400"/><span><strong>Confirmo que tomei cada dose selecionada na data e horário indicados, na quantidade informada.</strong> Não marque doses das quais não tem certeza.</span></label>
          <button type="button" disabled={saving || !confirmReal || !quantityValid || !!plan.error || (stockAction === "debit" && !canDebit)} onClick={()=>void commit()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ice px-4 text-sm font-bold text-void disabled:opacity-40"><ClipboardCheck size={18}/>{saving ? "Registrando, não feche a tela…" : `Registrar ${selectedSlots.length} tomada(s)`}</button>
        </section>}
        {result && <div role="status" aria-live="polite" className={`rounded-2xl border p-4 text-xs ${result.failed ? "border-amber-400/25 bg-amber-400/5" : "border-emerald-400/25 bg-emerald-400/5"}`}><strong>{result.saved} concluída(s) · {result.failed} pendente(s)</strong><p className="mt-1 leading-relaxed">{result.message}</p><p className="mt-1 text-ink-muted">O histórico foi salvo localmente e entra na fila de sincronização. A confirmação entre dispositivos precisa ser verificada separadamente.</p></div>}
        <aside className="flex items-start gap-2 rounded-xl border border-surface-border bg-surface-raised/30 p-3 text-[11px] leading-relaxed text-ink-muted"><Info size={16} className="mt-0.5 shrink-0 text-ice"/>Selecionar um dia não confirma a retirada, uma compra ou uma prescrição. Aquisições anteriores permanecem salvas mesmo se você sair sem revisar doses.</aside>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={goBack} disabled={saving} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-border px-4 text-xs font-semibold">Concluir ou revisar depois <ChevronRight size={15}/></button><button type="button" onClick={() => router.replace("/saude/medicamentos")} disabled={saving} className="min-h-11 rounded-xl border border-surface-border px-3 text-xs font-semibold">Outro medicamento</button></div>
      </>}
    </div>
  </main></PageTransition>;
}

export default function RetroBatchReviewPage() { return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-sm text-ink-muted">Preparando revisão histórica…</main>}><RetroBatchReviewContent/></Suspense>; }
