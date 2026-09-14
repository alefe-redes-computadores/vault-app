"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookHeart, Check, HeartHandshake, Phone, ShieldAlert } from "lucide-react";
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

  useEffect(() => setPlan(readSafetyPlan(activePersonId)), [activePersonId]);

  function update(key: keyof SafetyPlan, value: string) {
    setSaved(false);
    setPlan((current) => ({ ...current, [key]: value }));
  }

  function persist() {
    if (!activePersonId) return showToast("Selecione uma pessoa antes de salvar.", "error");
    setPlan(saveSafetyPlan(activePersonId, plan));
    setSaved(true);
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

        <section className="rounded-[24px] border border-surface-border bg-surface p-4">
          <div className="flex gap-3"><BookHeart className="shrink-0 text-violet-300" size={20}/><div><h2 className="text-sm font-semibold text-ink-primary">Um roteiro feito por você</h2><p className="mt-1 text-[11px] leading-relaxed text-ink-muted">Preencha de preferência em um momento estável e revise com alguém de confiança ou profissional de saúde.</p></div></div>
        </section>

        {sections.map((section) => <label key={section.key} className="block rounded-[22px] border border-surface-border/70 bg-surface p-4"><span className="text-sm font-semibold text-ink-primary">{section.title}</span><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">{section.hint}</span><textarea value={plan[section.key]} onChange={(event) => update(section.key, event.target.value)} rows={3} className="mt-3 w-full resize-y rounded-2xl border border-surface-border bg-surface-raised px-3.5 py-3 text-sm text-ink-primary outline-none transition focus-visible:border-ice focus-visible:ring-2 focus-visible:ring-ice/30"/></label>)}

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[10px] leading-relaxed text-ink-muted">Este plano fica salvo localmente e separado pela pessoa ativa. Ele não interpreta suas respostas, não diagnostica uma crise e não envia mensagens automaticamente.</div>
        <button type="button" onClick={persist} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ice font-semibold text-void">{saved?<Check size={18}/>:<BookHeart size={18}/>} {saved?"Plano salvo":"Salvar plano"}</button>
        <button type="button" onClick={() => router.push("/saude/registros/novo")} className="min-h-11 w-full rounded-2xl border border-surface-border bg-surface-raised px-4 text-sm font-semibold text-ink-primary">Registrar um acontecimento no prontuário</button>
      </div>
    </main>
  );
}
