"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookHeart, Check, HeartHandshake, Phone, ShieldAlert, ChevronRight, ClipboardCheck, Pencil, LockKeyhole, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { EMPTY_SAFETY_PLAN, readSafetyPlan, saveSafetyPlan, type SafetyPlan } from "@/lib/safety-plan";

const sections: Array<{ key: keyof Omit<SafetyPlan, "updatedAt">; title: string; hint: string }> = [
  { key: "warningSigns", title: "Sinais de alerta", hint: "Mudanças, pensamentos ou situações que indicam que preciso pedir ajuda." },
  { key: "copingSteps", title: "O que posso fazer primeiro", hint: "Ações curtas e seguras que costumam reduzir a intensidade do momento." },
  { key: "reasonsToStay", title: "Razões e vínculos importantes", hint: "Pessoas, projetos, lembranças e compromissos que quero reencontrar." },
  { key: "trustedPeople", title: "Pessoas de confiança", hint: "Nome e telefone de quem pode ficar comigo ou me acompanhar." },
  { key: "professionalContacts", title: "Rede profissional", hint: "Médico, terapeuta, CAPS, UBS ou outro serviço que acompanha meu cuidado." },
  { key: "saferEnvironment", title: "Como deixar o ambiente mais seguro", hint: "Quem pode guardar medicamentos, objetos ou permanecer comigo durante uma crise." },
];

export default function SafetyPlanPage() {
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<SafetyPlan>(EMPTY_SAFETY_PLAN);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"consultar" | "editar">("editar");
  const [changed, setChanged] = useState(false);
  const completed = sections.filter(section => Boolean(plan[section.key].trim())).length;

  useEffect(() => {
    const existing = readSafetyPlan(activePersonId);
    setPlan(existing);
    setMode(sections.some(section => Boolean(existing[section.key]?.trim())) ? "consultar" : "editar");
    setChanged(false);
    setSaved(false);
  }, [activePersonId]);

  function update(key: keyof SafetyPlan, value: string) {
    setChanged(true);
    setSaved(false);
    setPlan((current) => ({ ...current, [key]: value }));
  }

  function persist() {
    if (!activePersonId) return showToast("Selecione uma pessoa antes de salvar.", "error");
    setPlan(saveSafetyPlan(activePersonId, plan));
    setSaved(true);
    setChanged(false);
    setMode("consultar");
    showToast("Plano salvo neste dispositivo.", "success");
  }

  return (
    <main className="min-h-screen bg-void px-4 pb-32 pt-4 header-safe-top">
      <header className="mx-auto flex max-w-2xl items-center gap-3">
        <button type="button" aria-label="Voltar para a Home" onClick={() => router.replace("/")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-ink-primary"><ArrowLeft size={19}/></button>
        <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[0.22em] text-rose-300">Cuidado em momentos difíceis</p><h1 className="font-display text-xl font-semibold text-ink-primary">Meu plano de segurança</h1></div>
      </header>

      <div className="mx-auto mt-5 max-w-2xl space-y-4">
        <section className="rounded-[26px] border border-rose-400/25 bg-gradient-to-br from-rose-400/10 to-surface p-4">
          <div className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-rose-300" size={22}/><div><h2 className="font-semibold text-ink-primary">Precisa de ajuda agora?</h2><p className="mt-1 text-xs leading-relaxed text-ink-muted">Se houver risco imediato, não fique sozinho e procure atendimento presencial. O plano abaixo ajuda na organização, mas não substitui uma equipe de emergência.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href="tel:192" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-400 font-semibold text-void"><Phone size={17}/>SAMU 192</a>
            <a href="tel:188" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ice/30 bg-ice/10 font-semibold text-ice"><HeartHandshake size={17}/>CVV 188</a>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">O CVV oferece apoio emocional. Para urgência médica ou risco imediato, acione o SAMU 192 ou vá ao pronto atendimento.</p>
        </section>

        {/* VAULT_V329_SAFETY_WORKSPACE: consultation-first, local only, no automatic clinical inference. */}
        <section className="rounded-[24px] border border-surface-border/80 bg-surface p-4" aria-label="Progresso do meu plano de segurança">
          <div className="flex items-start gap-3"><BookHeart className="mt-0.5 shrink-0 text-violet-300" size={20}/><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-ink-primary">Um roteiro feito por você</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Preencha de preferência em um momento estável. Revise com alguém de confiança ou profissional de saúde.</p></div></div>
          <div className="mt-4 flex items-center justify-between gap-2"><strong className="text-xs text-ink-primary">{completed} de {sections.length} partes preenchidas</strong><span className="text-[10px] text-ink-muted">{changed ? "Alterações não salvas" : saved ? "Salvo neste dispositivo" : plan.updatedAt ? "Plano disponível offline" : "Comece pelo que fizer sentido"}</span></div>
          <div role="progressbar" aria-label="Preenchimento do plano" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={sections.length} className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-violet-300 transition-all" style={{width:`${completed / sections.length * 100}%`}}/></div>
          <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Modo do plano">
            <button type="button" aria-pressed={mode === "consultar"} onClick={() => setMode("consultar")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold ${mode === "consultar" ? "border-violet-300/40 bg-violet-300/10 text-violet-200" : "border-surface-border text-ink-muted"}`}><ClipboardCheck size={15}/> Consultar</button>
            <button type="button" aria-pressed={mode === "editar"} onClick={() => setMode("editar")} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold ${mode === "editar" ? "border-violet-300/40 bg-violet-300/10 text-violet-200" : "border-surface-border text-ink-muted"}`}><Pencil size={15}/> Preencher</button>
          </div>
          <div className="mt-3 flex items-start gap-2 text-[10px] text-ink-muted"><LockKeyhole size={13} className="mt-0.5 shrink-0"/><span>Informações pessoais neste dispositivo. Não são enviadas para o Brain nem compartilhadas automaticamente.</span></div>
        </section>
        {mode === "consultar" ? (
          <section className="space-y-2" aria-label="Consultar meu roteiro">
            {sections.map((section, index) => (
              <div key={section.key} className={`rounded-2xl border p-3.5 ${plan[section.key].trim() ? "border-violet-300/15 bg-surface" : "border-surface-border/70 bg-surface/60"}`}>
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-300/10 text-xs font-bold text-violet-200">{index+1}</span><h3 className="min-w-0 flex-1 text-xs font-bold text-ink-primary">{section.title}</h3>{plan[section.key].trim() ? <Check size={15} className="text-emerald-300"/> : <AlertCircle size={14} className="text-ink-faint"/>}</div>
                <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted">{plan[section.key].trim() || "Ainda não preenchido. Você pode completar esta parte quando se sentir confortável."}</p>
                <button type="button" onClick={() => {setMode("editar"); window.setTimeout(() => {const field=document.getElementById(`safety-${section.key}`) as HTMLDetailsElement | null; if(field) {field.open=true; field.scrollIntoView({behavior:"smooth",block:"center"});}}, 40);}} className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[11px] font-semibold text-violet-200">{plan[section.key].trim() ? "Editar esta parte" : "Preencher esta parte"}<ChevronRight size={13}/></button>
              </div>
            ))}
          </section>
        ) : (
          /* VAULT_SAFETY_PLAN_PROGRESSIVE_V70: edit and re-open each section independently. */
          <section className="space-y-2" aria-label="Preencher meu roteiro">{sections.map((section,index)=><details id={`safety-${section.key}`} key={section.key} open={index===0||Boolean(plan[section.key])} className="group scroll-mt-24 rounded-[18px] border border-surface-border/70 bg-surface"><summary className="cursor-pointer list-none px-4 py-3.5"><span className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block text-sm font-semibold text-ink-primary">{section.title}</span><span className="mt-0.5 block text-[10px] text-ink-muted">{section.hint}</span></span><ChevronRight size={15} className="shrink-0 text-ink-faint transition-transform group-open:rotate-90"/></span></summary><label className="block border-t border-surface-border/50 px-4 pb-4 pt-3"><span className="sr-only">{section.title}</span><textarea value={plan[section.key]} onChange={e=>update(section.key,e.target.value)} rows={3} placeholder="Escreva com suas próprias palavras…" className="w-full resize-y rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-sm leading-relaxed text-ink-primary outline-none focus-visible:ring-2 focus-visible:ring-violet-300"/></label></details>)}</section>
        )}
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[10px] leading-relaxed text-ink-muted">Este plano fica salvo localmente e separado pela pessoa ativa. Ele não interpreta suas respostas, não diagnostica uma crise e não envia mensagens automaticamente.</div>
        <button type="button" onClick={persist} disabled={!activePersonId} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ice font-semibold text-void disabled:opacity-50">{saved?<Check size={18}/>:<BookHeart size={18}/>} {changed ? "Salvar alterações" : saved ? "Plano salvo neste dispositivo" : "Salvar plano"}</button>
        <button type="button" onClick={() => router.push("/saude/registros/novo")} className="min-h-11 w-full rounded-2xl border border-surface-border bg-surface-raised px-4 text-sm font-semibold text-ink-primary">Registrar um acontecimento no prontuário</button>
      </div>
    </main>
  );
}
