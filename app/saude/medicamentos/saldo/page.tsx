"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2, Package } from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useHapticFeedback } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { getLocalTodayISO } from "@/lib/health-utils";
import { getClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";
import { PageTransition } from "@/components/PageTransition";

/** A stock count is a correction, not a simulated acquisition or dose. */
function Conteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") || "";
  const fallback = `/saude/medicamentos/detalhes?id=${encodeURIComponent(id)}`;
  const rawReturn = params.get("return_to");
  const returnTo = rawReturn?.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : fallback;
  const { medicamentos, updateMedicamento } = useMedicamentos();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const med = medicamentos?.find(item => item.id === id);
  const stock = med ? getClinicalStockSnapshot(med) : null;
  const [countText, setCountText] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (busyRef.current || !med?.id) return;
    const clean = countText.trim().replace(",", ".");
    const count = clean ? Number(clean) : NaN;
    if (!Number.isFinite(count) || count < 0) {
      setError("Informe uma contagem válida (zero é permitido quando confirmado).");
      trigger("error");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await updateMedicamento(med.id, {
        estoque_quantidade: count,
        estoque_data_referencia: getLocalTodayISO(),
      });
      trigger("success");
      showToast("Saldo registrado", "success");
      router.replace(returnTo);
    } catch (cause) {
      console.error("[M42 StockCount]", cause);
      trigger("error");
      setError("Não foi possível confirmar o saldo. Nada foi registrado.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  return <PageTransition><main className="min-h-screen bg-void pb-32 text-ink-primary">
    <header className="flex items-center gap-3 border-b border-surface-border/50 px-4 py-4 header-safe-top">
      <button type="button" aria-label="Voltar" onClick={() => router.push(returnTo)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface-raised"><ArrowLeft size={18}/></button>
      <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Controle de estoque</p><h1 className="font-display text-lg font-bold">Informar saldo</h1></div>
    </header>
    <section className="mx-auto max-w-xl space-y-4 px-4 pt-5">
      <div className="rounded-[22px] border border-surface-border bg-surface p-4">
        <div className="flex items-center gap-3"><Package size={20} className="shrink-0 text-ice"/><div className="min-w-0"><h2 className="truncate text-base font-bold">{med?.nome || (medicamentos ? "Medicamento não encontrado" : "Carregando medicamento...")}</h2><p className="text-xs text-ink-muted">{med?.dosagem || "Contagem manual"}</p></div></div>
        {stock && <p className="mt-3 rounded-xl bg-surface-raised p-3 text-xs text-ink-muted">{stock.state === "unknown" ? "Saldo anterior: não informado" : `Saldo anterior registrado: ${stock.registeredQuantity} ${med?.estoque_unidade_medida || "unidades"}`}</p>}
      </div>
      <div className="rounded-[22px] border border-surface-border bg-surface p-4">
        <label htmlFor="m42-saldo" className="flex items-center gap-2 text-sm font-semibold"><ClipboardList size={17} className="text-ice"/> Quantidade disponível agora</label>
        <input id="m42-saldo" type="number" inputMode="decimal" min="0" step="any" value={countText} onChange={event => { setCountText(event.target.value); setError(""); }} placeholder="Ex.: 30 (ou 0, se confirmado)" aria-invalid={Boolean(error)} className="mt-3 min-h-12 w-full rounded-xl border border-surface-border bg-surface-raised px-4 text-base outline-none focus:border-ice"/>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">Registre a contagem que você verificou. Isso corrige apenas o saldo, não cria compra, retirada ou receita. Se comprou ou retirou unidades, utilize Repor estoque para registrar o evento real.</p>
        {error && <p role="alert" className="mt-2 text-xs text-coral">{error}</p>}
      </div>
      <button type="button" onClick={confirm} disabled={!med?.id || busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-void disabled:opacity-50">
        {busy ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} Confirmar contagem
      </button>
    </section>
  </main></PageTransition>;
}

export default function InformarSaldoPage() {
  return <Suspense fallback={<main className="min-h-screen bg-void p-5 text-ink-muted">Carregando controle de estoque...</main>}><Conteudo/></Suspense>;
}
